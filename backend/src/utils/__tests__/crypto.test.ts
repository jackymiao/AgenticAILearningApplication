import { encryptPassword, decryptPassword, generateEncryptionKey } from '../crypto.js';
import crypto from 'crypto';

describe('Crypto Utilities', () => {
  const originalEnv = process.env.ENCRYPTION_KEY;

  beforeAll(() => {
    // Ensure ENCRYPTION_KEY is set for tests
    if (!process.env.ENCRYPTION_KEY) {
      process.env.ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');
    }
  });

  afterAll(() => {
    // Restore original environment
    process.env.ENCRYPTION_KEY = originalEnv;
  });

  describe('encryptPassword and decryptPassword', () => {
    it('should encrypt and decrypt a simple password', () => {
      const password = 'PASS123';
      const encrypted = encryptPassword(password);
      const decrypted = decryptPassword(encrypted);
      
      expect(decrypted).toBe(password);
    });

    it('should encrypt and decrypt a complex password', () => {
      const password = 'MyP@ssw0rd!#$%^&*()_+-=[]{}|;:,.<>?';
      const encrypted = encryptPassword(password);
      const decrypted = decryptPassword(encrypted);
      
      expect(decrypted).toBe(password);
    });

    it('should encrypt and decrypt an empty string', () => {
      const password = '';
      const encrypted = encryptPassword(password);
      const decrypted = decryptPassword(encrypted);
      
      expect(decrypted).toBe(password);
    });

    it('should encrypt and decrypt a long password', () => {
      const password = 'a'.repeat(1000);
      const encrypted = encryptPassword(password);
      const decrypted = decryptPassword(encrypted);
      
      expect(decrypted).toBe(password);
    });

    it('should encrypt and decrypt unicode characters', () => {
      const password = 'パスワード123🔐中文';
      const encrypted = encryptPassword(password);
      const decrypted = decryptPassword(encrypted);
      
      expect(decrypted).toBe(password);
    });

    it('should produce different encrypted output for same password (due to random IV)', () => {
      const password = 'PASS123';
      const encrypted1 = encryptPassword(password);
      const encrypted2 = encryptPassword(password);
      
      // Encrypted outputs should be different (random IV)
      expect(encrypted1).not.toBe(encrypted2);
      
      // But both should decrypt to same value
      expect(decryptPassword(encrypted1)).toBe(password);
      expect(decryptPassword(encrypted2)).toBe(password);
    });

    it('should throw error when ENCRYPTION_KEY is not set', () => {
      const originalKey = process.env.ENCRYPTION_KEY;
      delete process.env.ENCRYPTION_KEY;

      expect(() => encryptPassword('PASS123')).toThrow('ENCRYPTION_KEY environment variable is not set');
      expect(() => decryptPassword('invalid')).toThrow('ENCRYPTION_KEY environment variable is not set');

      process.env.ENCRYPTION_KEY = originalKey;
    });

    it('should throw error when ENCRYPTION_KEY has invalid length', () => {
      const originalKey = process.env.ENCRYPTION_KEY;
      process.env.ENCRYPTION_KEY = 'tooshort'; // Less than 64 hex chars

      expect(() => encryptPassword('PASS123')).toThrow('ENCRYPTION_KEY must be 32 bytes');
      
      process.env.ENCRYPTION_KEY = originalKey;
    });

    it('should throw error when trying to decrypt invalid base64', () => {
      expect(() => decryptPassword('invalid@@@base64')).toThrow();
    });

    it('should throw error when trying to decrypt tampered data', () => {
      const password = 'PASS123';
      const encrypted = encryptPassword(password);
      
      // Tamper with the encrypted data
      const tampered = encrypted.substring(0, encrypted.length - 5) + 'XXXXX';
      
      expect(() => decryptPassword(tampered)).toThrow();
    });
  });

  describe('generateEncryptionKey', () => {
    it('should generate a valid 32-byte hex key', () => {
      const key = generateEncryptionKey();
      
      // Should be 64 hex characters (32 bytes * 2)
      expect(key).toMatch(/^[0-9a-f]{64}$/i);
    });

    it('should generate different keys each time', () => {
      const key1 = generateEncryptionKey();
      const key2 = generateEncryptionKey();
      
      expect(key1).not.toBe(key2);
    });

    it('should generate keys that work with encryption', () => {
      const originalKey = process.env.ENCRYPTION_KEY;
      const newKey = generateEncryptionKey();
      process.env.ENCRYPTION_KEY = newKey;

      const password = 'PASS123';
      const encrypted = encryptPassword(password);
      const decrypted = decryptPassword(encrypted);

      expect(decrypted).toBe(password);
      
      process.env.ENCRYPTION_KEY = originalKey;
    });
  });
});
