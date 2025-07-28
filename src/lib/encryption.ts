/**
 * Encryption Service - Handles encryption/decryption of sensitive data
 * Uses AES-256-GCM encryption for provider credentials
 */

import { createCipherGCM, createDecipherGCM, randomBytes } from 'crypto'

export class EncryptionService {
  private readonly algorithm = 'aes-256-gcm'
  private readonly keyLength = 32 // 256 bits
  private readonly ivLength = 16 // 128 bits
  private readonly tagLength = 16 // 128 bits
  
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
    const crypto = require('crypto')
    return crypto.createHash('sha256').update(key).digest().slice(0, this.keyLength)
  }

  /**
   * Encrypt sensitive data (like API keys, auth tokens)
   */
  async encrypt(plaintext: string): Promise<string> {
    try {
      const key = this.getEncryptionKey()
      const iv = randomBytes(this.ivLength)
      
      const cipher = createCipherGCM(this.algorithm, key, iv)
      
      let encrypted = cipher.update(plaintext, 'utf8', 'hex')
      encrypted += cipher.final('hex')
      
      const tag = cipher.getAuthTag()
      
      // Combine iv + tag + encrypted data
      const combined = Buffer.concat([
        iv,
        tag,
        Buffer.from(encrypted, 'hex')
      ])
      
      return combined.toString('base64')
    } catch (error) {
      console.error('Encryption error:', error)
      throw new Error('Failed to encrypt data')
    }
  }

  /**
   * Decrypt sensitive data
   */
  async decrypt(encryptedData: string): Promise<string> {
    try {
      const key = this.getEncryptionKey()
      const combined = Buffer.from(encryptedData, 'base64')
      
      // Extract components
      const iv = combined.slice(0, this.ivLength)
      const tag = combined.slice(this.ivLength, this.ivLength + this.tagLength)
      const encrypted = combined.slice(this.ivLength + this.tagLength)
      
      const decipher = createDecipherGCM(this.algorithm, key, iv)
      decipher.setAuthTag(tag)
      
      let decrypted = decipher.update(encrypted, undefined, 'utf8')
      decrypted += decipher.final('utf8')
      
      return decrypted
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
    const crypto = require('crypto')
    const actualSalt = salt || randomBytes(16).toString('hex')
    const hash = crypto.pbkdf2Sync(data, actualSalt, 100000, 64, 'sha512')
    
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