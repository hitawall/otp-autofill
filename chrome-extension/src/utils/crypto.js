/**
 * Cryptographic utilities for OTP encryption/decryption
 */

import CryptoJS from 'crypto-js';

export class CryptoUtils {
  constructor() {
    this.keyDerivationInfo = 'otp-autofill-v1';
  }

  /**
   * Generate a random encryption key
   */
  generateKey() {
    return CryptoJS.lib.WordArray.random(256/8).toString();
  }

  /**
   * Derive key from password and salt
   */
  deriveKey(password, salt) {
    return CryptoJS.PBKDF2(password, salt, {
      keySize: 256/32,
      iterations: 10000
    }).toString();
  }

  /**
   * Encrypt OTP code
   */
  async encrypt(plaintext, key) {
    try {
      if (!plaintext && plaintext !== '') {
        throw new Error('Plaintext cannot be null or undefined');
      }
      
      const salt = CryptoJS.lib.WordArray.random(128/8);
      const iv = CryptoJS.lib.WordArray.random(128/8);
      
      const derivedKey = this.deriveKey(key, salt);
      
      const encrypted = CryptoJS.AES.encrypt(plaintext, CryptoJS.enc.Hex.parse(derivedKey), {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      });

      // Combine salt, iv, and encrypted data
      const combined = salt.toString() + iv.toString() + encrypted.toString();
      
      return {
        data: combined,
        success: true
      };
    } catch (error) {
      console.error('Encryption error:', error);
      return {
        error: error.message,
        success: false
      };
    }
  }

  /**
   * Decrypt OTP code
   */
  async decrypt(encryptedData, key) {
    try {
      if (!encryptedData) {
        throw new Error('Encrypted data cannot be null or undefined');
      }
      
      // Extract salt, iv, and encrypted data
      const salt = CryptoJS.enc.Hex.parse(encryptedData.substr(0, 32));
      const iv = CryptoJS.enc.Hex.parse(encryptedData.substr(32, 32));
      const encrypted = encryptedData.substr(64);

      const derivedKey = this.deriveKey(key, salt);

      const decrypted = CryptoJS.AES.decrypt(encrypted, CryptoJS.enc.Hex.parse(derivedKey), {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      });

      const plaintext = decrypted.toString(CryptoJS.enc.Utf8);
      
      // Empty string is valid, only check for null/undefined
      if (plaintext === null || plaintext === undefined) {
        throw new Error('Decryption failed - invalid result');
      }

      return {
        data: plaintext,
        success: true
      };
    } catch (error) {
      console.error('Decryption error:', error);
      return {
        error: error.message,
        success: false
      };
    }
  }

  /**
   * Generate HMAC for message authentication
   */
  generateHMAC(message, key) {
    return CryptoJS.HmacSHA256(message, key).toString();
  }

  /**
   * Verify HMAC
   */
  verifyHMAC(message, hmac, key) {
    const computedHMAC = this.generateHMAC(message, key);
    return computedHMAC === hmac;
  }

  /**
   * Generate secure random token
   */
  generateToken(length = 32) {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Hash password for storage
   */
  async hashPassword(password) {
    const salt = CryptoJS.lib.WordArray.random(128/8);
    const hash = CryptoJS.PBKDF2(password, salt, {
      keySize: 256/32,
      iterations: 10000
    });

    return {
      hash: hash.toString(),
      salt: salt.toString()
    };
  }

  /**
   * Verify password
   */
  async verifyPassword(password, hash, salt) {
    const computedHash = CryptoJS.PBKDF2(password, CryptoJS.enc.Hex.parse(salt), {
      keySize: 256/32,
      iterations: 10000
    });

    return computedHash.toString() === hash;
  }
}
