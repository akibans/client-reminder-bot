import { makeWASocket, useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys';
import QRCode from 'qrcode-terminal';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class WhatsAppBaileysService {
  constructor() {
    this.sock = null;
    this.isConnected = false;
    this.authFolder = path.join(__dirname, '../whatsapp_auth');
    this.messageQueue = [];
    this.processing = false;
    this.lastQrCode = null;
    this.retryCount = 0;
    this.isInitializing = false;
    this.connectionAttempts = 0;
    this.maxRetries = 5;
    
    // Ensure auth folder exists
    if (!fs.existsSync(this.authFolder)) {
      fs.mkdirSync(this.authFolder, { recursive: true });
    }
  }

  async initialize() {
    if (this.isInitializing) {
      console.log('⏳ Initialization already in progress...');
      return;
    }
    
    if (this.connectionAttempts >= this.maxRetries) {
      console.error('❌ Max connection attempts reached. Manual restart required.');
      return;
    }
    
    this.isInitializing = true;
    this.connectionAttempts++;
    
    try {
      console.log(`🔄 Initializing WhatsApp (attempt ${this.connectionAttempts}/${this.maxRetries})...`);
      const { state, saveCreds } = await useMultiFileAuthState(this.authFolder);
      
      this.sock = makeWASocket({
        auth: state,
        printQRInTerminal: true,
        defaultQueryTimeoutMs: undefined,
        connectTimeoutMs: 60000,
        keepAliveIntervalMs: 30000,
        retryRequestDelayMs: 2000,
        browser: ['Chrome (Linux)', '', ''],
        syncFullHistory: false, // Don't sync old messages - faster connect
        markOnlineOnConnect: false // Stay "offline" to avoid detection
      });

      // Save credentials when updated
      this.sock.ev.on('creds.update', saveCreds);

      // Handle connection updates
      this.sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          this.lastQrCode = qr;
          console.log('\n🔳 Scan this QR code with WhatsApp:\n');
          QRCode.generate(qr, { small: true });
          console.log('\n⏳ Waiting for connection...\n');
        }

        if (connection === 'close') {
          this.isConnected = false;
          this.isInitializing = false;
          
          const statusCode = lastDisconnect?.error?.output?.statusCode;
          const errorMessage = lastDisconnect?.error?.message || 'Unknown error';
          
          console.log(`❌ Connection closed. Code: ${statusCode}, Error: ${errorMessage}`);
          
          // Handle specific error codes
          if (statusCode === DisconnectReason.loggedOut) {
            console.log('🚨 Session logged out by WhatsApp.');
            this.cleanupAuthFolder();
            this.lastQrCode = null;
            this.connectionAttempts = 0;
            console.log('⚠️ Please restart the server and scan QR code again');
            return;
          }
          
          if (statusCode === DisconnectReason.badSession) {
            console.log('🚨 Bad session. Cleaning up...');
            this.cleanupAuthFolder();
            this.lastQrCode = null;
          }
          
          if (statusCode === DisconnectReason.connectionReplaced) {
            console.log('🚨 Connection replaced (another session opened)');
            return; // Don't reconnect - user opened another session
          }
          
          // Reconnect for other errors
          const shouldReconnect = ![
            DisconnectReason.loggedOut,
            DisconnectReason.connectionReplaced
          ].includes(statusCode);
          
          if (shouldReconnect && this.connectionAttempts < this.maxRetries) {
            const delay = Math.min(5000 * Math.pow(2, this.retryCount), 60000);
            this.retryCount++;
            console.log(`🔄 Reconnecting in ${delay/1000}s...`);
            setTimeout(() => {
              this.isInitializing = false;
              this.initialize();
            }, delay);
          }
        } else if (connection === 'open') {
          console.log('✅ WhatsApp connected successfully!');
          this.isConnected = true;
          this.lastQrCode = null;
          this.retryCount = 0;
          this.connectionAttempts = 0;
          this.isInitializing = false;
          this.processQueue();
        }
      });

      // Handle incoming messages (optional)
      this.sock.ev.on('messages.upsert', async (m) => {
        // console.log('📨 Received:', m);
      });

    } catch (error) {
      console.error('❌ Initialization error:', error.message);
      this.isInitializing = false;
      
      const delay = Math.min(5000 * Math.pow(2, this.retryCount), 60000);
      this.retryCount++;
      console.log(`🔄 Retry in ${delay/1000}s...`);
      setTimeout(() => this.initialize(), delay);
    }
  }
  
  cleanupAuthFolder() {
    try {
      if (fs.existsSync(this.authFolder)) {
        fs.rmSync(this.authFolder, { recursive: true, force: true });
        console.log('✅ Auth folder cleaned up');
        fs.mkdirSync(this.authFolder, { recursive: true });
      }
    } catch (error) {
      console.error('❌ Error cleaning auth folder:', error);
    }
  }

  async sendMessage(phoneNumber, message) {
    // Validation
    if (!phoneNumber || typeof phoneNumber !== 'string') {
      console.error('❌ Invalid phone number:', phoneNumber);
      return { success: false, error: 'Invalid phone number' };
    }

    if (!message || typeof message !== 'string') {
      console.error('❌ Invalid message');
      return { success: false, error: 'Invalid message' };
    }

    // Format number
    const formattedNumber = phoneNumber.replace(/\D/g, '');
    if (formattedNumber.length < 10) {
      console.error('❌ Phone number too short:', formattedNumber);
      return { success: false, error: 'Phone number too short' };
    }
    
    const jid = `${formattedNumber}@s.whatsapp.net`;

    const messageData = {
      jid,
      message: { text: message },
      timestamp: new Date(),
      retryCount: 0,
      id: Date.now().toString()
    };

    // Queue if not connected
    if (!this.isConnected || !this.sock) {
      this.messageQueue.push(messageData);
      console.warn(`⚠️ Not connected. Queued (${this.messageQueue.length} total)`);
      return { success: false, queued: true, error: 'Not connected, queued' };
    }

    return await this._send(messageData);
  }

  async _send(messageData) {
    try {
      if (!this.sock) {
         throw new Error("Socket not initialized");
      }
      
      // Add small delay to avoid rate limiting
      await new Promise(r => setTimeout(r, 500));
      
      const result = await this.sock.sendMessage(
        messageData.jid, 
        messageData.message
      );
      
      console.log(`✅ Sent to ${messageData.jid.split('@')[0]}`);
      return { 
        success: true, 
        messageId: result?.key?.id,
        timestamp: new Date() 
      };

    } catch (error) {
      console.error(`❌ Send error:`, error.message);
      
      // Retry logic
      if (messageData.retryCount < 3) {
        messageData.retryCount++;
        const delay = 5000 * messageData.retryCount;
        console.log(`🔄 Retrying (${messageData.retryCount}/3) in ${delay/1000}s...`);
        await new Promise(r => setTimeout(r, delay));
        return await this._send(messageData);
      }

      return { 
        success: false, 
        error: error.message,
        retryCount: messageData.retryCount 
      };
    }
  }

  async processQueue() {
    if (this.processing || this.messageQueue.length === 0 || !this.isConnected) return;
    
    this.processing = true;
    console.log(`📤 Processing ${this.messageQueue.length} queued messages...`);

    while (this.messageQueue.length > 0 && this.isConnected) {
      const message = this.messageQueue.shift();
      const result = await this._send(message);
      
      if (!result.success && !result.queued) {
        console.error(`❌ Failed permanently: ${result.error}`);
        // Could save to failed_messages table here
      }
      
      // Rate limiting between messages
      await new Promise(r => setTimeout(r, 1000));
    }

    this.processing = false;
    
    if (this.messageQueue.length > 0) {
      setTimeout(() => this.processQueue(), 1000);
    }
  }

  getStatus() {
    return {
      connected: this.isConnected,
      initializing: this.isInitializing,
      queueLength: this.messageQueue.length,
      user: this.sock?.user?.name || this.sock?.user?.id || null,
      qrCode: this.lastQrCode,
      connectionAttempts: this.connectionAttempts
    };
  }

  async verifyNumber(phoneNumber) {
    try {
      if (!this.sock || !this.isConnected) {
        return { exists: false, error: 'Not connected' };
      }
      
      const formattedNumber = phoneNumber.replace(/\D/g, '');
      const jid = `${formattedNumber}@s.whatsapp.net`;
      
      const [result] = await this.sock.onWhatsApp(jid);
      return { 
        exists: result?.exists || false,
        jid: result?.jid || null
      };
      
    } catch (error) {
      console.error('❌ Verification error:', error.message);
      return { exists: false, error: error.message };
    }
  }

  async disconnect() {
    try {
      this.isConnected = false;
      if (this.sock) {
        await this.sock.logout();
        this.sock = null;
      }
      this.cleanupAuthFolder();
      console.log('✅ Disconnected and cleaned up');
      return true;
    } catch (error) {
      console.error('❌ Disconnect error:', error);
      return false;
    }
  }
}

// Singleton
const whatsappService = new WhatsAppBaileysService();

export default whatsappService;