/**
 * Background Service Worker for OTP Auto-Fill Extension
 * Manages WebSocket server, OTP storage, and communication with content scripts
 */

import { WebSocketServer } from 'ws';
import { CryptoUtils } from './utils/crypto.js';
import { OTPStorage } from './utils/storage.js';
import { DeviceManager } from './utils/device-manager.js';

class OTPBackgroundService {
  constructor() {
    this.wsServer = null;
    this.connectedDevices = new Map();
    this.cryptoUtils = new CryptoUtils();
    this.storage = new OTPStorage();
    this.deviceManager = new DeviceManager();
    this.otpQueue = [];
    
    this.initialize();
  }

  async initialize() {
    console.log('OTP Auto-Fill Extension starting...');
    
    // Initialize storage
    await this.storage.initialize();
    
    // Start WebSocket server
    await this.startWebSocketServer();
    
    // Setup message listeners
    this.setupMessageListeners();
    
    // Setup context menu
    this.setupContextMenu();
    
    console.log('OTP Auto-Fill Extension initialized');
  }

  async startWebSocketServer() {
    try {
      // Find available port
      const port = await this.findAvailablePort(8765);
      
      this.wsServer = new WebSocketServer({ 
        port,
        host: 'localhost'
      });

      this.wsServer.on('connection', (ws, request) => {
        this.handleNewConnection(ws, request);
      });

      this.wsServer.on('error', (error) => {
        console.error('WebSocket server error:', error);
      });

      console.log(`WebSocket server started on port ${port}`);
      
      // Store port for mobile app discovery
      await chrome.storage.local.set({ wsServerPort: port });
      
    } catch (error) {
      console.error('Failed to start WebSocket server:', error);
    }
  }

  async findAvailablePort(startPort) {
    for (let port = startPort; port <= startPort + 100; port++) {
      try {
        await this.checkPortAvailable(port);
        return port;
      } catch (error) {
        // Port not available, try next
      }
    }
    throw new Error('No available ports found');
  }

  async checkPortAvailable(port) {
    return new Promise((resolve, reject) => {
      const testServer = new WebSocketServer({ port, host: 'localhost' });
      testServer.close(() => resolve());
      testServer.on('error', reject);
    });
  }

  handleNewConnection(ws, request) {
    console.log('New device connection from:', request.socket.remoteAddress);
    
    let deviceId = null;
    let isAuthenticated = false;

    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        
        switch (message.type) {
          case 'auth':
            await this.handleAuthentication(ws, message, (authenticated, devId) => {
              isAuthenticated = authenticated;
              deviceId = devId;
            });
            break;
            
          case 'otp':
            if (isAuthenticated) {
              await this.handleOTPMessage(message, deviceId);
            } else {
              ws.close(1008, 'Authentication required');
            }
            break;
            
          case 'ping':
            ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
            break;
            
          default:
            console.log('Unknown message type:', message.type);
        }
      } catch (error) {
        console.error('Error handling message:', error);
        ws.close(1007, 'Invalid message format');
      }
    });

    ws.on('close', () => {
      if (deviceId) {
        this.connectedDevices.delete(deviceId);
        console.log(`Device ${deviceId} disconnected`);
      }
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  }

  async handleAuthentication(ws, message, callback) {
    try {
      const { token, deviceInfo } = message;
      
      // Verify token with stored device info
      const device = await this.deviceManager.authenticateDevice(token, deviceInfo);
      
      if (device) {
        this.connectedDevices.set(device.id, {
          ws,
          device,
          lastSeen: Date.now()
        });
        
        ws.send(JSON.stringify({
          type: 'auth_success',
          deviceId: device.id
        }));
        
        callback(true, device.id);
        console.log(`Device ${device.id} authenticated successfully`);
      } else {
        ws.send(JSON.stringify({
          type: 'auth_failed',
          message: 'Invalid authentication token'
        }));
        callback(false, null);
      }
    } catch (error) {
      console.error('Authentication error:', error);
      ws.send(JSON.stringify({
        type: 'auth_failed',
        message: 'Authentication error'
      }));
      callback(false, null);
    }
  }

  async handleOTPMessage(message, deviceId) {
    try {
      const { id, code, sender, timestamp } = message;
      
      // Decrypt OTP
      const decryptedCode = await this.cryptoUtils.decrypt(code);
      
      if (!decryptedCode) {
        throw new Error('Failed to decrypt OTP');
      }
      
      // Store OTP
      const otpData = {
        id,
        code: decryptedCode,
        sender,
        timestamp,
        deviceId,
        used: false,
        expiresAt: Date.now() + (5 * 60 * 1000) // 5 minutes
      };
      
      await this.storage.saveOTP(otpData);
      
      // Notify content scripts
      this.notifyContentScripts(otpData);
      
      // Show notification
      this.showNotification('OTP Received', `OTP from ${sender} ready to use`);
      
      console.log(`OTP processed: ${id} from ${sender}`);
      
    } catch (error) {
      console.error('Error handling OTP message:', error);
    }
  }

  async notifyContentScripts(otpData) {
    try {
      // Get active tabs
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      
      for (const tab of tabs) {
        try {
          await chrome.tabs.sendMessage(tab.id, {
            type: 'otp_received',
            data: otpData
          });
        } catch (error) {
          // Content script may not be loaded, ignore
        }
      }
    } catch (error) {
      console.error('Error notifying content scripts:', error);
    }
  }

  async showNotification(title, message) {
    try {
      await chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title,
        message
      });
    } catch (error) {
      console.error('Error showing notification:', error);
    }
  }

  setupMessageListeners() {
    // Handle messages from popup and content scripts
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleRuntimeMessage(message, sender, sendResponse);
      return true; // Keep message channel open for async response
    });
  }

  async handleRuntimeMessage(message, sender, sendResponse) {
    try {
      switch (message.type) {
        case 'get_available_otps':
          const otps = await this.storage.getAvailableOTPs();
          sendResponse({ success: true, data: otps });
          break;
          
        case 'use_otp':
          await this.storage.markOTPUsed(message.otpId);
          sendResponse({ success: true });
          break;
          
        case 'get_connected_devices':
          const devices = Array.from(this.connectedDevices.values()).map(conn => conn.device);
          sendResponse({ success: true, data: devices });
          break;
          
        case 'pair_device':
          const pairingResult = await this.deviceManager.generatePairingCode();
          sendResponse({ success: true, data: pairingResult });
          break;
          
        default:
          sendResponse({ success: false, error: 'Unknown message type' });
      }
    } catch (error) {
      console.error('Error handling runtime message:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  setupContextMenu() {
    chrome.runtime.onInstalled.addListener(() => {
      chrome.contextMenus.create({
        id: 'otp-autofill-manual',
        title: 'Manually Enter OTP',
        contexts: ['editable']
      });
    });

    chrome.contextMenus.onClicked.addListener(async (info, tab) => {
      if (info.menuItemId === 'otp-autofill-manual') {
        // Open popup for manual OTP entry
        chrome.action.openPopup();
      }
    });
  }

  // Cleanup on extension unload
  async cleanup() {
    if (this.wsServer) {
      this.wsServer.close();
    }
    
    this.connectedDevices.clear();
    console.log('OTP Auto-Fill Extension cleaned up');
  }
}

// Initialize the background service
const backgroundService = new OTPBackgroundService();

// Handle extension lifecycle
chrome.runtime.onSuspend.addListener(() => {
  backgroundService.cleanup();
});

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = OTPBackgroundService;
}
