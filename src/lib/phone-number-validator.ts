/**
 * Phone Number Validator - Validates phone numbers and provider credentials
 * Handles Twilio API validation and webhook setup
 */

export interface TwilioValidationResult {
  isValid: boolean
  error?: string
  phoneNumberSid?: string
  capabilities?: {
    voice?: boolean
    sms?: boolean
    mms?: boolean
  }
}

export class PhoneNumberValidator {
  /**
   * Validate E.164 phone number format
   */
  isValidE164(phoneNumber: string): boolean {
    const e164Regex = /^\+[1-9]\d{1,14}$/
    return e164Regex.test(phoneNumber)
  }

  /**
   * Validate Twilio Account SID format
   */
  isValidTwilioSid(sid: string): boolean {
    const sidRegex = /^AC[a-fA-f0-9]{32}$/
    return sidRegex.test(sid)
  }

  /**
   * Validate Twilio Auth Token format (basic length check)
   */
  isValidTwilioAuthToken(token: string): boolean {
    return typeof token === 'string' && token.length >= 32
  }

  /**
   * Format phone number for display
   */
  formatForDisplay(phoneNumber: string): string {
    // Format US numbers as (XXX) XXX-XXXX
    if (phoneNumber.match(/^\+1\d{10}$/)) {
      const cleaned = phoneNumber.replace(/^\+1/, '')
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
    }
    
    // For non-US numbers, return as-is
    return phoneNumber
  }

  /**
   * Extract country code from E.164 number
   */
  getCountryCode(phoneNumber: string): string | null {
    const match = phoneNumber.match(/^\+(\d{1,3})/)
    return match ? match[1] : null
  }

  /**
   * Validate Twilio credentials and phone number ownership
   * In testing mode, this will be mocked
   */
  async validateTwilioCredentials(
    accountSid: string,
    authToken: string,
    phoneNumber: string
  ): Promise<TwilioValidationResult> {
    // In development/testing, return mock validation
    if (process.env.NODE_ENV === 'development' || process.env.SKIP_TWILIO_VALIDATION === 'true') {
      console.log('📝 Skipping Twilio validation in development mode')
      return {
        isValid: true,
        phoneNumberSid: 'PN' + 'mock'.repeat(8), // Mock SID
        capabilities: {
          voice: true,
          sms: true,
          mms: false
        }
      }
    }

    try {
      // Validate credentials format first
      if (!this.isValidTwilioSid(accountSid)) {
        return {
          isValid: false,
          error: 'Invalid Twilio Account SID format'
        }
      }

      if (!this.isValidTwilioAuthToken(authToken)) {
        return {
          isValid: false,
          error: 'Invalid Twilio Auth Token'
        }
      }

      // Create basic auth header
      const credentials = Buffer.from(`${accountSid}:${authToken}`).toString('base64')
      
      // Test credentials by fetching account info
      const accountResponse = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}.json`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Basic ${credentials}`,
            'Accept': 'application/json'
          }
        }
      )

      if (!accountResponse.ok) {
        const errorData = await accountResponse.json().catch(() => ({}))
        return {
          isValid: false,
          error: errorData.message || `Twilio API error: ${accountResponse.status}`
        }
      }

      // Verify phone number ownership
      const phoneNumberResponse = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/IncomingPhoneNumbers.json?PhoneNumber=${encodeURIComponent(phoneNumber)}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Basic ${credentials}`,
            'Accept': 'application/json'
          }
        }
      )

      if (!phoneNumberResponse.ok) {
        return {
          isValid: false,
          error: 'Failed to verify phone number ownership with Twilio'
        }
      }

      const phoneNumberData = await phoneNumberResponse.json()
      
      if (!phoneNumberData.incoming_phone_numbers || phoneNumberData.incoming_phone_numbers.length === 0) {
        return {
          isValid: false,
          error: 'Phone number not found in your Twilio account'
        }
      }

      const phoneNumberInfo = phoneNumberData.incoming_phone_numbers[0]
      
      return {
        isValid: true,
        phoneNumberSid: phoneNumberInfo.sid,
        capabilities: {
          voice: phoneNumberInfo.capabilities?.voice === true,
          sms: phoneNumberInfo.capabilities?.sms === true,
          mms: phoneNumberInfo.capabilities?.mms === true
        }
      }
    } catch (error) {
      console.error('Twilio validation error:', error)
      return {
        isValid: false,
        error: error instanceof Error ? error.message : 'Failed to validate Twilio credentials'
      }
    }
  }

  /**
   * Setup Twilio webhook for a phone number
   */
  async setupTwilioWebhook(
    accountSid: string,
    authToken: string,
    phoneNumber: string,
    webhookUrl: string
  ): Promise<boolean> {
    // Skip in development/testing
    if (process.env.NODE_ENV === 'development' || process.env.SKIP_TWILIO_VALIDATION === 'true') {
      console.log('📝 Skipping Twilio webhook setup in development mode')
      return true
    }

    try {
      const credentials = Buffer.from(`${accountSid}:${authToken}`).toString('base64')
      
      // First, get the phone number SID
      const phoneNumberResponse = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/IncomingPhoneNumbers.json?PhoneNumber=${encodeURIComponent(phoneNumber)}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Basic ${credentials}`,
            'Accept': 'application/json'
          }
        }
      )

      if (!phoneNumberResponse.ok) {
        throw new Error('Failed to fetch phone number details from Twilio')
      }

      const phoneNumberData = await phoneNumberResponse.json()
      
      if (!phoneNumberData.incoming_phone_numbers || phoneNumberData.incoming_phone_numbers.length === 0) {
        throw new Error('Phone number not found in Twilio account')
      }

      const phoneNumberSid = phoneNumberData.incoming_phone_numbers[0].sid

      // Update the phone number with webhook URL
      const updateResponse = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/IncomingPhoneNumbers/${phoneNumberSid}.json`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${credentials}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: new URLSearchParams({
            VoiceUrl: webhookUrl,
            VoiceMethod: 'POST',
            StatusCallback: `${webhookUrl}/status`,
            StatusCallbackMethod: 'POST'
          })
        }
      )

      if (!updateResponse.ok) {
        const errorData = await updateResponse.json().catch(() => ({}))
        throw new Error(errorData.message || 'Failed to update Twilio webhook')
      }

      console.log(`✅ Twilio webhook configured for ${phoneNumber}`)
      return true
    } catch (error) {
      console.error('Failed to setup Twilio webhook:', error)
      throw error
    }
  }

  /**
   * Validate phone number ownership without storing credentials
   * Used for one-time verification
   */
  async quickValidateOwnership(
    accountSid: string,
    authToken: string,
    phoneNumber: string
  ): Promise<{ isOwned: boolean; error?: string }> {
    try {
      const validation = await this.validateTwilioCredentials(accountSid, authToken, phoneNumber)
      return {
        isOwned: validation.isValid,
        error: validation.error
      }
    } catch (error) {
      return {
        isOwned: false,
        error: error instanceof Error ? error.message : 'Validation failed'
      }
    }
  }

  /**
   * Get phone number info from provider
   */
  async getPhoneNumberInfo(provider: string, phoneNumber: string, config: any): Promise<any> {
    switch (provider) {
      case 'testing':
        return {
          provider: 'testing',
          capabilities: ['voice'],
          region: 'test',
          type: 'local'
        }
        
      case 'twilio':
        if (process.env.NODE_ENV === 'development') {
          return {
            provider: 'twilio',
            capabilities: ['voice', 'sms'],
            region: 'US',
            type: 'local'
          }
        }
        // In production, fetch real info from Twilio
        break
        
      default:
        throw new Error(`Unsupported provider: ${provider}`)
    }
  }

  /**
   * Clean and normalize phone number
   */
  normalizePhoneNumber(phoneNumber: string): string {
    // Remove all non-digit characters except +
    let cleaned = phoneNumber.replace(/[^\d+]/g, '')
    
    // Ensure it starts with +
    if (!cleaned.startsWith('+')) {
      // Assume US number if no country code
      if (cleaned.length === 10) {
        cleaned = '+1' + cleaned
      } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
        cleaned = '+' + cleaned
      } else {
        throw new Error('Unable to determine country code')
      }
    }
    
    return cleaned
  }
}