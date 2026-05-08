/**
 * Unit tests for OTPStorage
 */

import { OTPStorage } from '../src/utils/storage.js';

describe('OTPStorage', () => {
  let storage;
  let mockData;

  beforeEach(() => {
    storage = new OTPStorage();
    mockData = {
      'otp_autofill_data': {
        otps: [],
        devices: [],
        settings: {
          autoFill: true,
          notifications: true,
          expireAfter: 5 * 60 * 1000
        }
      }
    };
    global.mockChromeStorage(mockData);
  });

  describe('Initialization', () => {
    test('should initialize storage with default values', async () => {
      await storage.initialize();
      
      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        'otp_autofill_data': mockData
      });
    });

    test('should not overwrite existing data', async () => {
      const existingData = {
        otps: [{ id: 'existing-otp' }],
        devices: [{ id: 'existing-device' }],
        settings: { autoFill: false }
      };
      global.mockChromeStorage(existingData);
      
      await storage.initialize();
      
      // Should not call set if data already exists
      expect(chrome.storage.local.set).not.toHaveBeenCalled();
    });
  });

  describe('OTP Management', () => {
    test('should save OTP', async () => {
      const otpData = {
        id: 'test-otp-1',
        code: '123456',
        sender: 'TEST-BANK',
        timestamp: Date.now(),
        deviceId: 'device-1',
        used: false,
        expiresAt: Date.now() + 300000
      };

      const otpId = await storage.saveOTP(otpData);
      
      expect(otpId).toBe('test-otp-1');
      expect(chrome.storage.local.set).toHaveBeenCalled();
      
      const setCall = chrome.storage.local.set.mock.calls[0][0];
      const savedData = setCall['otp_autofill_data'];
      expect(savedData).toBeDefined();
      expect(savedData.otps).toBeDefined();
      expect(savedData.otps[0].id).toBe('test-otp-1');
      expect(savedData.otps[0].createdAt).toBeDefined();
    });

    test('should get available OTPs', async () => {
      const now = Date.now();
      const otps = [
        {
          id: 'active-otp',
          code: '123456',
          used: false,
          expiresAt: now + 300000
        },
        {
          id: 'expired-otp',
          code: '654321',
          used: false,
          expiresAt: now - 1000
        },
        {
          id: 'used-otp',
          code: '111111',
          used: true,
          expiresAt: now + 300000
        }
      ];
      mockData.otps = otps;
      global.mockChromeStorage(mockData);

      const availableOTPs = await storage.getAvailableOTPs();
      
      expect(availableOTPs).toHaveLength(1);
      expect(availableOTPs[0].id).toBe('active-otp');
    });

    test('should get OTP by ID', async () => {
      const otps = [
        {
          id: 'test-otp-1',
          code: '123456',
          used: false,
          expiresAt: Date.now() + 300000
        }
      ];
      mockData.otps = otps;
      global.mockChromeStorage(mockData);

      const otp = await storage.getOTPById('test-otp-1');
      
      expect(otp).toBeDefined();
      expect(otp.id).toBe('test-otp-1');
      expect(otp.code).toBe('123456');
    });

    test('should mark OTP as used', async () => {
      const otps = [
        {
          id: 'test-otp-1',
          code: '123456',
          used: false,
          expiresAt: Date.now() + 300000
        }
      ];
      mockData.otps = otps;
      global.mockChromeStorage(mockData);

      const success = await storage.markOTPUsed('test-otp-1');
      
      expect(success).toBe(true);
      expect(chrome.storage.local.set).toHaveBeenCalled();
      
      const setCall = chrome.storage.local.set.mock.calls[0][0];
      const updatedOTP = setCall['otp_autofill_data'].otps[0];
      expect(updatedOTP.used).toBe(true);
      expect(updatedOTP.usedAt).toBeDefined();
    });

    test('should delete OTP', async () => {
      const otps = [
        {
          id: 'test-otp-1',
          code: '123456',
          used: false,
          expiresAt: Date.now() + 300000
        },
        {
          id: 'test-otp-2',
          code: '654321',
          used: false,
          expiresAt: Date.now() + 300000
        }
      ];
      mockData.otps = otps;
      global.mockChromeStorage(mockData);

      const success = await storage.deleteOTP('test-otp-1');
      
      expect(success).toBe(true);
      expect(chrome.storage.local.set).toHaveBeenCalled();
      
      const setCall = chrome.storage.local.set.mock.calls[0][0];
      const remainingOTPs = setCall['otp_autofill_data'].otps;
      expect(remainingOTPs).toHaveLength(1);
      expect(remainingOTPs[0].id).toBe('test-otp-2');
    });

    test('should cleanup old OTPs', async () => {
      const now = Date.now();
      const otps = [
        {
          id: 'active-otp',
          used: false,
          expiresAt: now + 300000
        },
        {
          id: 'expired-otp',
          used: false,
          expiresAt: now - 1000
        },
        {
          id: 'old-used-otp',
          used: true,
          usedAt: now - (2 * 60 * 60 * 1000), // 2 hours ago
          expiresAt: now + 300000
        },
        {
          id: 'recent-used-otp',
          used: true,
          usedAt: now - (30 * 60 * 1000), // 30 minutes ago
          expiresAt: now + 300000
        }
      ];
      mockData.otps = otps;
      global.mockChromeStorage(mockData);

      const cleanedCount = await storage.cleanupOldOTPs();
      
      expect(cleanedCount).toBe(2); // expired-otp and old-used-otp should be removed
      expect(chrome.storage.local.set).toHaveBeenCalled();
    });
  });

  describe('Device Management', () => {
    test('should save new device', async () => {
      const deviceData = {
        id: 'device-1',
        name: 'Test Device',
        type: 'mobile',
        platform: 'android'
      };

      const deviceId = await storage.saveDevice(deviceData);
      
      expect(deviceId).toBe('device-1');
      expect(chrome.storage.local.set).toHaveBeenCalled();
      
      const setCall = chrome.storage.local.set.mock.calls[0][0];
      const savedDevice = setCall['otp_autofill_data'].devices[0];
      expect(savedDevice.id).toBe('device-1');
      expect(savedDevice.createdAt).toBeDefined();
      expect(savedDevice.lastSeen).toBeDefined();
    });

    test('should update existing device', async () => {
      const existingDevice = {
        id: 'device-1',
        name: 'Old Name',
        createdAt: Date.now() - 1000000,
        lastSeen: Date.now() - 500000
      };
      mockData.devices = [existingDevice];
      global.mockChromeStorage(mockData);

      const updatedDevice = {
        id: 'device-1',
        name: 'New Name',
        type: 'mobile'
      };

      const deviceId = await storage.saveDevice(updatedDevice);
      
      expect(deviceId).toBe('device-1');
      expect(chrome.storage.local.set).toHaveBeenCalled();
      
      const setCall = chrome.storage.local.set.mock.calls[0][0];
      const savedDevice = setCall['otp_autofill_data'].devices[0];
      expect(savedDevice.name).toBe('New Name');
      expect(savedDevice.type).toBe('mobile');
      expect(savedDevice.createdAt).toBe(existingDevice.createdAt); // Should not change
      expect(savedDevice.lastSeen).toBeGreaterThan(existingDevice.lastSeen);
    });

    test('should get all devices', async () => {
      const devices = [
        { id: 'device-1', name: 'Device 1' },
        { id: 'device-2', name: 'Device 2' }
      ];
      mockData.devices = devices;
      global.mockChromeStorage(mockData);

      const allDevices = await storage.getAllDevices();
      
      expect(allDevices).toHaveLength(2);
      expect(allDevices[0].id).toBe('device-1');
      expect(allDevices[1].id).toBe('device-2');
    });

    test('should remove device', async () => {
      const devices = [
        { id: 'device-1', name: 'Device 1' },
        { id: 'device-2', name: 'Device 2' }
      ];
      mockData.devices = devices;
      global.mockChromeStorage(mockData);

      const success = await storage.removeDevice('device-1');
      
      expect(success).toBe(true);
      expect(chrome.storage.local.set).toHaveBeenCalled();
      
      const setCall = chrome.storage.local.set.mock.calls[0][0];
      const remainingDevices = setCall['otp_autofill_data'].devices;
      expect(remainingDevices).toHaveLength(1);
      expect(remainingDevices[0].id).toBe('device-2');
    });
  });

  describe('Settings Management', () => {
    test('should get settings', async () => {
      const settings = {
        autoFill: false,
        notifications: true,
        customSetting: 'test'
      };
      mockData.settings = settings;
      global.mockChromeStorage(mockData);

      const retrievedSettings = await storage.getSettings();
      
      expect(retrievedSettings.autoFill).toBe(false);
      expect(retrievedSettings.notifications).toBe(true);
      expect(retrievedSettings.customSetting).toBe('test');
    });

    test('should update settings', async () => {
      const newSettings = {
        autoFill: false,
        newSetting: 'new-value'
      };

      const updatedSettings = await storage.updateSettings(newSettings);
      
      expect(updatedSettings.autoFill).toBe(false);
      expect(updatedSettings.notifications).toBe(true); // Should preserve existing
      expect(updatedSettings.newSetting).toBe('new-value');
      expect(chrome.storage.local.set).toHaveBeenCalled();
    });
  });

  describe('Storage Statistics', () => {
    test('should get storage stats', async () => {
      const now = Date.now();
      const otps = [
        {
          id: 'active-otp',
          used: false,
          expiresAt: now + 300000
        },
        {
          id: 'expired-otp',
          used: false,
          expiresAt: now - 1000
        },
        {
          id: 'used-otp',
          used: true,
          usedAt: now - 1000,
          expiresAt: now + 300000
        }
      ];
      const devices = [
        { id: 'device-1' },
        { id: 'device-2' }
      ];
      mockData.otps = otps;
      mockData.devices = devices;
      global.mockChromeStorage(mockData);

      const stats = await storage.getStorageStats();
      
      expect(stats.totalOTPs).toBe(3);
      expect(stats.activeOTPs).toBe(1);
      expect(stats.expiredOTPs).toBe(1);
      expect(stats.usedOTPs).toBe(1);
      expect(stats.totalDevices).toBe(2);
      expect(stats.storageSize).toBeGreaterThan(0);
    });
  });

  describe('Data Cleanup', () => {
    test('should clear all data', async () => {
      mockData.otps = [{ id: 'test-otp' }];
      mockData.devices = [{ id: 'test-device' }];
      mockData.settings = { customSetting: 'test' };
      global.mockChromeStorage(mockData);

      await storage.clearAllData();
      
      expect(chrome.storage.local.set).toHaveBeenCalled();
      
      const setCall = chrome.storage.local.set.mock.calls[0][0];
      const clearedData = setCall['otp_autofill_data'];
      expect(clearedData.otps).toHaveLength(0);
      expect(clearedData.devices).toHaveLength(0);
      expect(clearedData.settings.autoFill).toBe(true);
      expect(clearedData.settings.notifications).toBe(true);
    });
  });
});
