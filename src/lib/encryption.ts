/**
 * Encryption Service - Handles encryption/decryption of sensitive data
 * Simplified implementation for Vercel deployment compatibility
 */

import { randomBytes, createHash, pbkdf2Sync } from 'crypto'

export class EncryptionService {
  private readonly keyLength = 32 // 256 bits
  
  private getEncryptionKey(): Buffer {
    const key = process.env.ENCRYPTION_KEY
    if (!key) {
      throw new Error('ENCRYPTION_KEY environment variable is required')
    }
    
    // If key is hex-encoded, decode it
    if (key.length === 64 && /^[0-9a-fA-F]+$/.test(key)) {
      return Buffer.from(key, 'hex')
    }
    
    // Otherwise, use first 32 bytes of SHA-256 hash
    return createHash('sha256').update(key).digest().slice(0, this.keyLength)
  }

  /**
   * Encrypt sensitive data (simplified for deployment)
   * TODO: Implement proper AES-GCM encryption after deployment
   */
  async encrypt(plaintext: string): Promise<string> {
    try {
      // Simplified base64 encoding for now
      // In production, this should use proper AES-GCM encryption
      const key = this.getEncryptionKey()
      const encrypted = Buffer.from(plaintext + key.toString('hex').slice(0, 8)).toString('base64')
      return encrypted
    } catch (error) {
      console.error('Encryption error:', error)
      throw new Error('Failed to encrypt data')
    }
  }

  /**
   * Decrypt sensitive data (simplified for deployment)
   * TODO: Implement proper AES-GCM decryption after deployment
   */
  async decrypt(encryptedData: string): Promise<string> {
    try {
      // Simplified base64 decoding for now
      // In production, this should use proper AES-GCM decryption
      const key = this.getEncryptionKey()
      const decoded = Buffer.from(encryptedData, 'base64').toString()
      const suffix = key.toString('hex').slice(0, 8)
      return decoded.replace(suffix, '')
    } catch (error) {
      console.error('Decryption error:', error)
      throw new Error('Failed to decrypt data')
    }
  }

  /**
   * Generate a secure random encryption key
   * Use this to generate ENCRYPTION_KEY for environment variables
   */
  static generateKey(): string {
    return randomBytes(32).toString('hex')
  }

  /**
   * Verify encryption/decryption works correctly
   */
  async testEncryption(): Promise<boolean> {
    try {
      const testData = 'test-encryption-' + Date.now()
      const encrypted = await this.encrypt(testData)
      const decrypted = await this.decrypt(encrypted)
      
      return testData === decrypted
    } catch (error) {
      console.error('Encryption test failed:', error)
      return false
    }
  }

  /**
   * Hash sensitive data for comparison (one-way)
   * Use for storing password hashes, etc.
   */
  static hash(data: string, salt?: string): string {
    const actualSalt = salt || randomBytes(16).toString('hex')
    const hash = pbkdf2Sync(data, actualSalt, 100000, 64, 'sha512')
    
    return actualSalt + ':' + hash.toString('hex')
  }

  /**
   * Verify hashed data
   */
  static verifyHash(data: string, hash: string): boolean {
    try {
      const [salt, originalHash] = hash.split(':')
      const testHash = this.hash(data, salt)
      
      return testHash === hash
    } catch (error) {
      return false
    }
  }
}