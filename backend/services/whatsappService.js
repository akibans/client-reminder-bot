import makeWASocket, { useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } from '@whiskeysockets/baileys';
import pino from 'pino';
import { Boom } from '@hapi/boom';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class WhatsAppService {
  constructor() {
    this.sock = null;
    this.qrCode = null;
    this.status = 'disconnected'; // disconnected, connecting, qr_ready, connected
    this.connectionInfo = null;
    this.sessionDir = path.join(__dirname, '../sessions/whatsapp');
    this.io = null; // Socket.io instance
    this.retryCount = 0;
    this.maxRetries = 5;
    
    // Ensure session directory exists
    if (!fs.existsSync(this.sessionDir)) {
      fs.mkdirSync(this.sessionDir, { recursive: true });
    }
  }

  /**
   * Initialize Socket.io for real-time updates
   */
  setSocketIO(io) {
    this.io = io;
  }

  /**
   * Start WhatsApp connection
   */
  async initialize() {
    if (this.sock) {
      console.log('WhatsApp already initialized');
      return;
    }

    try {
      this.status = 'connecting';
      this.broadcastStatus();

      const { state, saveCreds } = await useMultiFileAuthState(this.sessionDir);
      const { version, isLatest } = await fetchLatestBaileysVersion();
      
      console.log(`Using WA v${version.join('.')}, isLatest: ${isLatest}`);

      this.sock = makeWASocket({
        version,
        printQRInTerminal: false,
        auth: state,
        browser: ['RemindPro', 'Chrome', '1.0.0'],
        logger: pino({ level: 'silent' }), // Use silent logger to reduce noise, or info for debugging
      });

      // Handle credentials update
      this.sock.ev.on('creds.update', saveCreds);

      // Handle connection updates
      this.sock.ev.on('connection.update', (update) => {
        this.handleConnectionUpdate(update);
      });

      // Handle incoming messages (optional - for auto-reply)
      this.sock.ev.on('messages.upsert', (m) => {
        if (m.type === 'notify' || m.type === 'append') {
           console.log('New message received');
        }
      });

    } catch (error) {
      console.error('WhatsApp initialization error:', error);
      this.status = 'disconnected';
      this.broadcastStatus();
      
      // Auto-retry logic
      if (this.retryCount < this.maxRetries) {
        this.retryCount++;
        console.log(`Retrying connection (${this.retryCount}/${this.maxRetries})...`);
        setTimeout(() => this.initialize(), 5000);
      }
    }
  }

  /**
   * Handle connection state changes
   */
  handleConnectionUpdate(update) {
    const { connection, lastDisconnect, qr } = update;

    // QR Code received
    if (qr) {
      this.qrCode = qr;
      this.status = 'qr_ready';
      console.log('QR Code generated - Scan now!');
      this.broadcastQR(qr);
      this.broadcastStatus();
      return;
    }

    // Connection closed
    if (connection === 'close') {
      const shouldReconnect = (lastDisconnect?.error instanceof Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
      
      this.status = 'disconnected';
      this.qrCode = null;
      this.connectionInfo = null;
      this.broadcastStatus();

      if (shouldReconnect) {
        console.log('Connection closed, reconnecting...');
        this.sock = null;
        setTimeout(() => this.initialize(), 3000);
      } else {
        console.log('Connection logged out');
        this.clearSession();
      }
    }

    // Connection open
    else if (connection === 'open') {
      this.status = 'connected';
      this.qrCode = null;
      this.retryCount = 0;
      this.connectionInfo = {
        user: this.sock.user,
        connectedAt: new Date()
      };
      console.log('WhatsApp connected:', this.sock.user?.name || this.sock.user?.id);
      this.broadcastStatus();
      this.broadcastConnected();
    }
  }

  /**
   * Send text message
   */
  async sendMessage(phoneNumber, message) {
    if (this.status !== 'connected') {
      throw new Error('WhatsApp not connected. Please scan QR code first.');
    }

    try {
      // Format phone number
      const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
      const jid = `${cleanPhone}@s.whatsapp.net`;

      // Check if number is registered on WhatsApp
      const [result] = await this.sock.onWhatsApp(jid);
      if (!result?.exists) {
        throw new Error(`Number ${phoneNumber} is not registered on WhatsApp`);
      }

      // Send message
      const sent = await this.sock.sendMessage(jid, { text: message });
      
      return {
        success: true,
        messageId: sent.key.id,
        timestamp: sent.messageTimestamp,
        recipient: phoneNumber
      };

    } catch (error) {
      console.error('Send message error:', error);
      throw error;
    }
  }

  /**
   * Send bulk messages with rate limiting
   */
  async sendBulkMessages(recipients, message, onProgress) {
    const results = [];
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    for (let i = 0; i < recipients.length; i++) {
      const recipient = recipients[i];
      
      try {
        // Random delay between 3-8 seconds to avoid spam detection
        if (i > 0) await delay(Math.floor(Math.random() * 5000) + 3000);
        
        const result = await this.sendMessage(recipient.phone, message);
        results.push({ ...result, recipient });
        
        onProgress?.({
          current: i + 1,
          total: recipients.length,
          success: true,
          recipient
        });

      } catch (error) {
        results.push({
          success: false,
          error: error.message,
          recipient
        });
        
        onProgress?.({
          current: i + 1,
          total: recipients.length,
          success: false,
          error: error.message,
          recipient
        });
      }
    }

    return results;
  }

  /**
   * Get connection status
   */
  getStatus() {
    return {
      status: this.status,
      qrCode: this.qrCode,
      user: this.connectionInfo?.user,
      connectedAt: this.connectionInfo?.connectedAt
    };
  }

  /**
   * Disconnect and cleanup
   */
  async disconnect() {
    if (this.sock) {
      await this.sock.logout();
      this.sock = null;
    }
    this.status = 'disconnected';
    this.qrCode = null;
    this.broadcastStatus();
  }

  /**
   * Clear session files
   */
  clearSession() {
    if (fs.existsSync(this.sessionDir)) {
      fs.rmSync(this.sessionDir, { recursive: true, force: true });
    }
  }

  /**
   * Broadcast QR code to all connected clients
   */
  broadcastQR(qr) {
    this.io?.emit('whatsapp:qr', qr);
  }

  /**
   * Broadcast status change
   */
  broadcastStatus() {
    this.io?.emit('whatsapp:status', this.getStatus());
  }

  /**
   * Broadcast connection success
   */
  broadcastConnected() {
    this.io?.emit('whatsapp:connected', this.connectionInfo);
  }

  /**
   * Reinitialize connection (for QR refresh)
   */
  async reconnect() {
    if (this.sock) {
      await this.sock.end();
      this.sock = null;
    }
    this.clearSession();
    this.retryCount = 0;
    await this.initialize();
  }
}

// Singleton instance
export default new WhatsAppService();

