/**
 * Unit tests for CryptoUtils
 */

import { CryptoUtils } from '../src/utils/crypto.js';

describe('CryptoUtils', () => {
  let cryptoUtils;

  beforeEach(() => {
    cryptoUtils = new CryptoUtils();
  });

  describe('Key Generation', () => {
    test('should generate random key', () => {
      const key1 = cryptoUtils.generateKey();
      const key2 = cryptoUtils.generateKey();
      
      expect(key1).toBeDefined();
      expect(key2).toBeDefined();
      expect(key1).not.toBe(key2);
      expect(key1.length).toBeGreaterThan(0);
    });

    test('should derive key from password and salt', () => {
      const password = 'test-password';
      const salt = 'test-salt';
      
      const key1 = cryptoUtils.deriveKey(password, salt);
      const key2 = cryptoUtils.deriveKey(password, salt);
      
      expect(key1).toBe(key2);
      expect(key1.length).toBeGreaterThan(0);
    });

    test('should derive different keys for different passwords', () => {
      const key1 = cryptoUtils.deriveKey('password1', 'salt');
      const key2 = cryptoUtils.deriveKey('password2', 'salt');
      
      expect(key1).not.toBe(key2);
    });
  });

  describe('Encryption/Decryption', () => {
    test('should encrypt and decrypt text correctly', async () => {
      const plaintext = '123456';
      const key = cryptoUtils.generateKey();
      
      const encrypted = await cryptoUtils.encrypt(plaintext, key);
      expect(encrypted.success).toBe(true);
      expect(encrypted.data).toBeDefined();
      
      const decrypted = await cryptoUtils.decrypt(encrypted.data, key);
      expect(decrypted.success).toBe(true);
      expect(decrypted.data).toBe(plaintext);
    });

    test('should fail to decrypt with wrong key', async () => {
      const plaintext = '123456';
      const key1 = cryptoUtils.generateKey();
      const key2 = cryptoUtils.generateKey();
      
      const encrypted = await cryptoUtils.encrypt(plaintext, key1);
      expect(encrypted.success).toBe(true);
      
      const decrypted = await cryptoUtils.decrypt(encrypted.data, key2);
      // Note: crypto-js might not always fail with wrong key, so we check if result is different
      expect(decrypted.success).toBe(false);
      if (decrypted.success) {
        expect(decrypted.data).not.toBe(plaintext);
      } else {
        expect(decrypted.error).toBeDefined();
      }
    });

    test('should handle empty plaintext', async () => {
      const plaintext = '';
      const key = cryptoUtils.generateKey();
      
      const encrypted = await cryptoUtils.encrypt(plaintext, key);
      expect(encrypted.success).toBe(true);
      
      const decrypted = await cryptoUtils.decrypt(encrypted.data, key);
      expect(decrypted.success).toBe(true);
      expect(decrypted.data).toBe('');
    });

    test('should handle special characters', async () => {
      const plaintext = 'OTP: 123456!@#$%^&*()';
      const key = cryptoUtils.generateKey();
      
      const encrypted = await cryptoUtils.encrypt(plaintext, key);
      expect(encrypted.success).toBe(true);
      
      const decrypted = await cryptoUtils.decrypt(encrypted.data, key);
      expect(decrypted.success).toBe(true);
      expect(decrypted.data).toBe(plaintext);
    });
  });

  describe('HMAC', () => {
    test('should generate and verify HMAC', () => {
      const message = 'test message';
      const key = 'test-key';
      
      const hmac = cryptoUtils.generateHMAC(message, key);
      expect(hmac).toBeDefined();
      expect(hmac.length).toBeGreaterThan(0);
      
      const isValid = cryptoUtils.verifyHMAC(message, hmac, key);
      expect(isValid).toBe(true);
    });

    test('should fail verification with wrong message', () => {
      const message1 = 'message1';
      const message2 = 'message2';
      const key = 'test-key';
      
      const hmac = cryptoUtils.generateHMAC(message1, key);
      const isValid = cryptoUtils.verifyHMAC(message2, hmac, key);
      expect(isValid).toBe(false);
    });

    test('should fail verification with wrong key', () => {
      const message = 'test message';
      const key1 = 'key1';
      const key2 = 'key2';
      
      const hmac = cryptoUtils.generateHMAC(message, key1);
      const isValid = cryptoUtils.verifyHMAC(message, hmac, key2);
      expect(isValid).toBe(false);
    });
  });

  describe('Token Generation', () => {
    test('should generate random token', () => {
      const token1 = cryptoUtils.generateToken();
      const token2 = cryptoUtils.generateToken();
      
      expect(token1).toBeDefined();
      expect(token2).toBeDefined();
      expect(token1).not.toBe(token2);
      expect(token1.length).toBe(32 * 2); // 32 bytes * 2 hex chars
    });

    test('should generate token with specified length', () => {
      const token = cryptoUtils.generateToken(16);
      expect(token.length).toBe(16 * 2); // 16 bytes * 2 hex chars
    });
  });

  describe('Password Hashing', () => {
    test('should hash password', async () => {
      const password = 'test-password';
      
      const result = await cryptoUtils.hashPassword(password);
      expect(result.hash).toBeDefined();
      expect(result.salt).toBeDefined();
      expect(result.hash).not.toBe(password);
    });

    test('should verify correct password', async () => {
      const password = 'test-password';
      const hashed = await cryptoUtils.hashPassword(password);
      
      const isValid = await cryptoUtils.verifyPassword(password, hashed.hash, hashed.salt);
      expect(isValid).toBe(true);
    });

    test('should reject incorrect password', async () => {
      const password = 'test-password';
      const wrongPassword = 'wrong-password';
      const hashed = await cryptoUtils.hashPassword(password);
      
      const isValid = await cryptoUtils.verifyPassword(wrongPassword, hashed.hash, hashed.salt);
      expect(isValid).toBe(false);
    });

    test('should generate different hashes for same password', async () => {
      const password = 'test-password';
      
      const hash1 = await cryptoUtils.hashPassword(password);
      const hash2 = await cryptoUtils.hashPassword(password);
      
      expect(hash1.hash).not.toBe(hash2.hash);
      expect(hash1.salt).not.toBe(hash2.salt);
    });
  });

  describe('Error Handling', () => {
    test('should handle encryption errors gracefully', async () => {
      const result = await cryptoUtils.encrypt('test', null);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    test('should handle decryption errors gracefully', async () => {
      const result = await cryptoUtils.decrypt('invalid-data', 'key');
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});
