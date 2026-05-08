/**
 * Device management utilities for pairing and authentication
 */

import { CryptoUtils } from './crypto.js';

export class DeviceManager {
  constructor() {
    this.cryptoUtils = new CryptoUtils();
    this.pairingCodeExpiry = 5 * 60 * 1000; // 5 minutes
  }

  async generatePairingCode() {
    try {
      const pairingCode = this.cryptoUtils.generateToken(16);
      const deviceSecret = this.cryptoUtils.generateKey();
      const timestamp = Date.now();
      const expiresAt = timestamp + this.pairingCodeExpiry;

      const pairingData = {
        code: pairingCode,
        secret: deviceSecret,
        timestamp,
        expiresAt,
        status: 'pending'
      };

      // Store pairing data
      await this.storePairingData(pairingData);

      return {
        pairingCode,
        qrCodeData: this.createQRCodeData(pairingCode, deviceSecret),
        expiresAt
      };
    } catch (error) {
      console.error('Error generating pairing code:', error);
      throw error;
    }
  }

  createQRCodeData(pairingCode, deviceSecret) {
    const qrData = {
      type: 'otp_autofill_pairing',
      code: pairingCode,
      secret: deviceSecret,
      timestamp: Date.now(),
      version: '1.0'
    };

    return btoa(JSON.stringify(qrData));
  }

  async storePairingData(pairingData) {
    const storageKey = `pairing_${pairingData.code}`;
    const data = {
      ...pairingData,
      storedAt: Date.now()
    };

    return new Promise((resolve) => {
      chrome.storage.local.set({ [storageKey]: data }, () => {
        resolve();
      });
    });
  }

  async getPairingData(pairingCode) {
    const storageKey = `pairing_${pairingCode}`;
    
    return new Promise((resolve) => {
      chrome.storage.local.get([storageKey], (result) => {
        resolve(result[storageKey] || null);
      });
    });
  }

  async authenticateDevice(token, deviceInfo) {
    try {
      // Parse token (should contain pairing code and device signature)
      const tokenData = JSON.parse(atob(token));
      const pairingData = await this.getPairingData(tokenData.pairingCode);

      if (!pairingData) {
        throw new Error('Invalid pairing code');
      }

      // Check if pairing code has expired
      if (Date.now() > pairingData.expiresAt) {
        throw new Error('Pairing code expired');
      }

      // Verify device signature
      const isValidSignature = this.verifyDeviceSignature(
        tokenData.signature,
        deviceInfo,
        pairingData.secret
      );

      if (!isValidSignature) {
        throw new Error('Invalid device signature');
      }

      // Create authenticated device record
      const device = {
        id: this.generateDeviceId(deviceInfo),
        name: deviceInfo.name || 'Unknown Device',
        type: deviceInfo.type || 'mobile',
        platform: deviceInfo.platform || 'unknown',
        pairedAt: Date.now(),
        lastSeen: Date.now(),
        status: 'authenticated',
        secret: pairingData.secret
      };

      // Save device
      await this.saveAuthenticatedDevice(device);

      // Clean up pairing data
      await this.cleanupPairingData(tokenData.pairingCode);

      return device;
    } catch (error) {
      console.error('Authentication error:', error);
      return null;
    }
  }

  verifyDeviceSignature(signature, deviceInfo, secret) {
    try {
      const expectedSignature = this.cryptoUtils.generateHMAC(
        JSON.stringify(deviceInfo),
        secret
      );

      return expectedSignature === signature;
    } catch (error) {
      console.error('Signature verification error:', error);
      return false;
    }
  }

  generateDeviceId(deviceInfo) {
    const deviceIdString = `${deviceInfo.type}_${deviceInfo.platform}_${Date.now()}`;
    return this.cryptoUtils.generateToken(12);
  }

  async saveAuthenticatedDevice(device) {
    const storageKey = 'authenticated_devices';
    
    return new Promise((resolve) => {
      chrome.storage.local.get([storageKey], (result) => {
        const devices = result[storageKey] || [];
        
        // Remove existing device with same ID
        const existingIndex = devices.findIndex(d => d.id === device.id);
        if (existingIndex !== -1) {
          devices[existingIndex] = device;
        } else {
          devices.push(device);
        }
        
        chrome.storage.local.set({ [storageKey]: devices }, () => {
          resolve(device);
        });
      });
    });
  }

  async getAuthenticatedDevice(deviceId) {
    const storageKey = 'authenticated_devices';
    
    return new Promise((resolve) => {
      chrome.storage.local.get([storageKey], (result) => {
        const devices = result[storageKey] || [];
        const device = devices.find(d => d.id === deviceId);
        resolve(device || null);
      });
    });
  }

  async getAllAuthenticatedDevices() {
    const storageKey = 'authenticated_devices';
    
    return new Promise((resolve) => {
      chrome.storage.local.get([storageKey], (result) => {
        resolve(result[storageKey] || []);
      });
    });
  }

  async removeAuthenticatedDevice(deviceId) {
    const storageKey = 'authenticated_devices';
    
    return new Promise((resolve) => {
      chrome.storage.local.get([storageKey], (result) => {
        const devices = result[storageKey] || [];
        const filteredDevices = devices.filter(d => d.id !== deviceId);
        
        chrome.storage.local.set({ [storageKey]: filteredDevices }, () => {
          resolve(true);
        });
      });
    });
  }

  async updateDeviceLastSeen(deviceId) {
    const storageKey = 'authenticated_devices';
    
    return new Promise((resolve) => {
      chrome.storage.local.get([storageKey], (result) => {
        const devices = result[storageKey] || [];
        const device = devices.find(d => d.id === deviceId);
        
        if (device) {
          device.lastSeen = Date.now();
          chrome.storage.local.set({ [storageKey]: devices }, () => {
            resolve(true);
          });
        } else {
          resolve(false);
        }
      });
    });
  }

  async cleanupPairingData(pairingCode) {
    const storageKey = `pairing_${pairingCode}`;
    
    return new Promise((resolve) => {
      chrome.storage.local.remove([storageKey], () => {
        resolve();
      });
    });
  }

  async cleanupExpiredPairingCodes() {
    const keys = await this.getAllStorageKeys();
    const now = Date.now();
    let cleanedCount = 0;

    for (const key of keys) {
      if (key.startsWith('pairing_')) {
        try {
          const result = await this.getStorageValue(key);
          if (result && result.expiresAt && result.expiresAt < now) {
            await this.removeStorageKey(key);
            cleanedCount++;
          }
        } catch (error) {
          console.warn('Error cleaning pairing code:', key, error);
        }
      }
    }

    return cleanedCount;
  }

  async getAllStorageKeys() {
    return new Promise((resolve) => {
      chrome.storage.local.get(null, (result) => {
        resolve(Object.keys(result));
      });
    });
  }

  async getStorageValue(key) {
    return new Promise((resolve) => {
      chrome.storage.local.get([key], (result) => {
        resolve(result[key]);
      });
    });
  }

  async removeStorageKey(key) {
    return new Promise((resolve) => {
      chrome.storage.local.remove([key], () => {
        resolve();
      });
    });
  }

  async generateDeviceAuthToken(deviceId) {
    const device = await this.getAuthenticatedDevice(deviceId);
    if (!device) {
      throw new Error('Device not found');
    }

    const tokenData = {
      deviceId,
      timestamp: Date.now(),
      expiresAt: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
      version: '1.0'
    };

    const signature = this.cryptoUtils.generateHMAC(
      JSON.stringify(tokenData),
      device.secret
    );

    const authToken = {
      ...tokenData,
      signature
    };

    return btoa(JSON.stringify(authToken));
  }

  async verifyDeviceAuthToken(authToken) {
    try {
      const tokenData = JSON.parse(atob(authToken));
      
      // Check expiration
      if (Date.now() > tokenData.expiresAt) {
        return null;
      }

      // Get device
      const device = await this.getAuthenticatedDevice(tokenData.deviceId);
      if (!device) {
        return null;
      }

      // Verify signature
      const expectedSignature = this.cryptoUtils.generateHMAC(
        JSON.stringify({
          deviceId: tokenData.deviceId,
          timestamp: tokenData.timestamp,
          expiresAt: tokenData.expiresAt,
          version: tokenData.version
        }),
        device.secret
      );

      if (expectedSignature !== tokenData.signature) {
        return null;
      }

      // Update last seen
      await this.updateDeviceLastSeen(tokenData.deviceId);

      return device;
    } catch (error) {
      console.error('Auth token verification error:', error);
      return null;
    }
  }
}
