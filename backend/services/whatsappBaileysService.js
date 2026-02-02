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
    this.isInitializing = false; // Prevent concurrent init
    
    // Ensure auth folder exists
    if (!fs.existsSync(this.authFolder)) {
      fs.mkdirSync(this.authFolder, { recursive: true });
    }
  }

  async initialize() {
    // Prevent multiple concurrent initialization attempts
    if (this.isInitializing) {
      console.log('⏳ Initialization already in progress...');
      return;
    }
    
    this.isInitializing = true;
    
    try {
      console.log('🔄 Initializing WhatsApp Baileys Service...');
      const { state, saveCreds } = await useMultiFileAuthState(this.authFolder);
      
      this.sock = makeWASocket({
        auth: state,
        printQRInTerminal: true,
        defaultQueryTimeoutMs: undefined,
        connectTimeoutMs: 60000,
        keepAliveIntervalMs: 30000,
        retryRequestDelayMs: 2000,
        // Add browser identification to reduce ban risk
        browser: ['Chrome (Linux)', '', '']
      });

      this.sock.ev.on('creds.update', saveCreds);

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
          const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
          
          console.log(`❌ WhatsApp connection closed. Status: ${statusCode}`);
          
          if (statusCode === DisconnectReason.loggedOut) {
            console.log('🚨 Session logged out by WhatsApp. Cleaning auth...');
            this.cleanupAuthFolder();
            this.lastQrCode = null;
            this.retryCount = 0;
            // Don't auto-reconnect - wait for manual restart
            console.log('⚠️ Please restart the server and scan QR code again');
            return; // Exit early, don't reconnect
          }
          
          if (shouldReconnect) {
            // Exponential backoff for reconnection
            const delay = Math.min(5000 * Math.pow(2, this.retryCount), 60000);
            this.retryCount++;
            console.log(`🔄 Reconnecting in ${delay/1000}s... (attempt ${this.retryCount})`);
            setTimeout(() => {
              this.isInitializing = false; // Reset flag before retry
              this.initialize();
            }, delay);
          }
        } else if (connection === 'open') {
          console.log('✅ WhatsApp connected successfully!');
          this.isConnected = true;
          this.lastQrCode = null;
          this.retryCount = 0;
          this.isInitializing = false;
          this.processQueue();
        }
      });

      this.sock.ev.on('messages.upsert', async (m) => {
        // Handle incoming messages if needed
        // console.log('Received message:', m);
      });

    } catch (error) {
      console.error('❌ WhatsApp initialization error:', error);
      this.isInitializing = false;
      
      // Retry on error after delay
      const delay = Math.min(5000 * Math.pow(2, this.retryCount), 60000);
      this.retryCount++;
      console.log(`🔄 Retrying initialization in ${delay/1000}s...`);
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
    // Validate phone number
    if (!phoneNumber || typeof phoneNumber !== 'string') {
      return { success: false, error: 'Invalid phone number' };
    }

    // Format number: remove non-digits and add @s.whatsapp.net
    const formattedNumber = phoneNumber.replace(/\D/g, '');
    if (!formattedNumber || formattedNumber.length < 10) {
      return { success: false, error: 'Invalid phone number format' };
    }
    
    const jid = `${formattedNumber}@s.whatsapp.net`;

    const messageData = {
      jid,
      message: { text: message },
      timestamp: new Date(),
      retryCount: 0
    };

    // If not connected, queue the message
    if (!this.isConnected || !this.sock) {
      this.messageQueue.push(messageData);
      console.warn(`⚠️ WhatsApp not connected. Message queued. Queue size: ${this.messageQueue.length}`);
      return { success: false, queued: true, error: 'Not connected, queued for delivery' };
    }

    return await this._send(messageData);
  }

  async _send(messageData) {
    try {
      if (!this.sock) {
         throw new Error("Socket not initialized");
      }
      
      const result = await this.sock.sendMessage(
        messageData.jid, 
        messageData.message
      );
      
      console.log(`✅ WhatsApp sent to ${messageData.jid}`);
      return { 
        success: true, 
        messageId: result?.key?.id,
        timestamp: new Date() 
      };

    } catch (error) {
      console.error(`❌ WhatsApp send error to ${messageData.jid}:`, error.message);
      
      // Retry logic (max 3 retries)
      if (messageData.retryCount < 3) {
        messageData.retryCount++;
        console.log(`🔄 Retrying (${messageData.retryCount}/3)...`);
        await new Promise(r => setTimeout(r, 5000));
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
        // If failed after retries, could re-queue or log to DB
        console.error(`Failed to send message after retries: ${result.error}`);
      }
      
      // Rate limiting - wait 1 second between messages
      await new Promise(r => setTimeout(r, 1000));
    }

    this.processing = false;
    
    // If more messages were added during processing
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
      qrCode: this.lastQrCode
    };
  }

  // Verify if number exists on WhatsApp
  async verifyNumber(phoneNumber) {
    try {
      if (!this.sock || !this.isConnected) {
        console.log('⚠️ Cannot verify number - not connected');
        return false;
      }
      
      const formattedNumber = phoneNumber.replace(/\D/g, '');
      const jid = `${formattedNumber}@s.whatsapp.net`;
      
      const [result] = await this.sock.onWhatsApp(jid);
      return result?.exists || false;
      
    } catch (error) {
      console.error('❌ Number verification error:', error.message);
      return false;
    }
  }

  // Force disconnect and cleanup (for manual reset)
  async disconnect() {
    try {
      if (this.sock) {
        await this.sock.logout();
        this.sock = null;
      }
      this.isConnected = false;
      this.isInitializing = false;
      this.cleanupAuthFolder();
      console.log('✅ WhatsApp disconnected and cleaned up');
    } catch (error) {
      console.error('❌ Error during disconnect:', error);
    }
  }
}

// Singleton instance
const whatsappService = new WhatsAppBaileysService();

export default whatsappService;
