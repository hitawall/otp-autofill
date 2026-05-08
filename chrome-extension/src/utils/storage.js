/**
 * Storage utilities for OTP data management
 */

export class OTPStorage {
  constructor() {
    this.storageKey = 'otp_autofill_data';
    this.maxOTPs = 50;
    this.maxAge = 5 * 60 * 1000; // 5 minutes
  }

  async initialize() {
    // Initialize storage if needed
    const data = await this.getStorageData();
    if (!data.otps) {
      data.otps = [];
      data.devices = [];
      data.settings = {
        autoFill: true,
        notifications: true,
        expireAfter: 5 * 60 * 1000 // 5 minutes
      };
      await this.saveStorageData(data);
    }
  }

  async getStorageData() {
    return new Promise((resolve) => {
      chrome.storage.local.get([this.storageKey], (result) => {
        const data = result[this.storageKey];
        resolve(data || { otps: [], devices: [], settings: {} });
      });
    });
  }

  async saveStorageData(data) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [this.storageKey]: data }, () => {
        resolve();
      });
    });
  }

  async saveOTP(otpData) {
    const data = await this.getStorageData();
    
    // Add new OTP
    const newOTP = {
      ...otpData,
      createdAt: Date.now()
    };
    
    data.otps.unshift(newOTP);
    
    // Clean up old OTPs
    await this.cleanupOldOTPs(data);
    
    // Limit total number of OTPs
    if (data.otps.length > this.maxOTPs) {
      data.otps = data.otps.slice(0, this.maxOTPs);
    }
    
    await this.saveStorageData(data);
    
    return newOTP.id;
  }

  async getAvailableOTPs() {
    const data = await this.getStorageData();
    const now = Date.now();
    
    return data.otps.filter(otp => 
      !otp.used && 
      otp.expiresAt > now
    );
  }

  async getOTPById(otpId) {
    const data = await this.getStorageData();
    return data.otps.find(otp => otp.id === otpId);
  }

  async markOTPUsed(otpId) {
    const data = await this.getStorageData();
    const otp = data.otps.find(otp => otp.id === otpId);
    
    if (otp) {
      otp.used = true;
      otp.usedAt = Date.now();
      await this.saveStorageData(data);
      return true;
    }
    
    return false;
  }

  async deleteOTP(otpId) {
    const data = await this.getStorageData();
    const index = data.otps.findIndex(otp => otp.id === otpId);
    
    if (index !== -1) {
      data.otps.splice(index, 1);
      await this.saveStorageData(data);
      return true;
    }
    
    return false;
  }

  async cleanupOldOTPs(data = null) {
    if (!data) {
      data = await this.getStorageData();
    }
    
    const now = Date.now();
    const originalCount = data.otps.length;
    
    // Remove expired and used OTPs older than 1 hour
    data.otps = data.otps.filter(otp => {
      const isExpired = otp.expiresAt <= now;
      const isOldAndUsed = otp.used && (now - otp.usedAt) > (60 * 60 * 1000); // 1 hour
      return !isExpired && !isOldAndUsed;
    });
    
    if (data.otps.length !== originalCount) {
      await this.saveStorageData(data);
    }
    
    return originalCount - data.otps.length;
  }

  async saveDevice(deviceData) {
    const data = await this.getStorageData();
    
    const existingIndex = data.devices.findIndex(device => device.id === deviceData.id);
    
    if (existingIndex !== -1) {
      // Update existing device
      data.devices[existingIndex] = {
        ...data.devices[existingIndex],
        ...deviceData,
        lastSeen: Date.now()
      };
    } else {
      // Add new device
      data.devices.push({
        ...deviceData,
        createdAt: Date.now(),
        lastSeen: Date.now()
      });
    }
    
    await this.saveStorageData(data);
    return deviceData.id;
  }

  async getDevice(deviceId) {
    const data = await this.getStorageData();
    return data.devices.find(device => device.id === deviceId);
  }

  async getAllDevices() {
    const data = await this.getStorageData();
    return data.devices;
  }

  async removeDevice(deviceId) {
    const data = await this.getStorageData();
    const index = data.devices.findIndex(device => device.id === deviceId);
    
    if (index !== -1) {
      data.devices.splice(index, 1);
      await this.saveStorageData(data);
      return true;
    }
    
    return false;
  }

  async getSettings() {
    const data = await this.getStorageData();
    return data.settings || {};
  }

  async updateSettings(newSettings) {
    const data = await this.getStorageData();
    data.settings = {
      ...data.settings,
      ...newSettings
    };
    await this.saveStorageData(data);
    return data.settings;
  }

  async clearAllData() {
    const data = {
      otps: [],
      devices: [],
      settings: {
        autoFill: true,
        notifications: true,
        expireAfter: 5 * 60 * 1000
      }
    };
    await this.saveStorageData(data);
  }

  async getStorageStats() {
    const data = await this.getStorageData();
    const now = Date.now();
    
    const activeOTPs = data.otps.filter(otp => !otp.used && otp.expiresAt > now);
    const expiredOTPs = data.otps.filter(otp => otp.expiresAt <= now);
    const usedOTPs = data.otps.filter(otp => otp.used);
    
    return {
      totalOTPs: data.otps.length,
      activeOTPs: activeOTPs.length,
      expiredOTPs: expiredOTPs.length,
      usedOTPs: usedOTPs.length,
      totalDevices: data.devices.length,
      storageSize: JSON.stringify(data).length
    };
  }
}
