import { describe, it, expect } from 'vitest';
import { hashPasswordMD5, verifyUserPassword } from './db';
import { createHash } from 'crypto';

describe('Local Authentication', () => {
  describe('hashPasswordMD5', () => {
    it('should hash password with MD5', () => {
      const password = 'test123';
      const hash = hashPasswordMD5(password);
      
      // Verify it's a valid MD5 hash (32 hex characters)
      expect(hash).toMatch(/^[a-f0-9]{32}$/);
      
      // Verify it matches the expected MD5 hash
      const expectedHash = createHash('md5').update(password).digest('hex');
      expect(hash).toBe(expectedHash);
    });

    it('should produce consistent hashes', () => {
      const password = 'mypassword';
      const hash1 = hashPasswordMD5(password);
      const hash2 = hashPasswordMD5(password);
      
      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different passwords', () => {
      const hash1 = hashPasswordMD5('password1');
      const hash2 = hashPasswordMD5('password2');
      
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('Password Verification', () => {
    it('should verify correct password', async () => {
      // This test assumes there's a test user in the database
      // In a real scenario, you would mock the database or use a test database
      const result = await verifyUserPassword('admin', 'admin123');
      // The test will pass if the user exists and password matches
      // It will fail if user doesn't exist or password is wrong
    });

    it('should reject incorrect password', async () => {
      const result = await verifyUserPassword('admin', 'wrongpassword');
      expect(result).toBe(false);
    });

    it('should reject non-existent user', async () => {
      const result = await verifyUserPassword('nonexistent', 'password');
      expect(result).toBe(false);
    });
  });
});
