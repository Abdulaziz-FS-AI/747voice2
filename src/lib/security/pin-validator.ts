/**
 * Enhanced PIN validation with security checks
 * Prevents weak PINs that are easily guessable
 */

export interface PinValidationResult {
  isValid: boolean;
  score: number; // 0-100, higher is better
  issues: string[];
  suggestions: string[];
}

export class PinValidator {
  private static readonly WEAK_PATTERNS = [
    // All same digit
    /^(\d)\1+$/,
    // Sequential ascending
    /^(0123|1234|2345|3456|4567|5678|6789|01234|12345|23456|34567|45678|56789|012345|123456|234567|345678|456789|567890)/,
    // Sequential descending  
    /^(9876|8765|7654|6543|5432|4321|3210|98765|87654|76543|65432|54321|43210|987654|876543|765432|654321|543210|432109|321098)/,
    // Common patterns
    /^(000000|111111|222222|333333|444444|555555|666666|777777|888888|999999)/,
    // Repeated pairs
    /^(\d{2})\1+$/,
    // Years (19xx, 20xx)
    /^(19\d{2}|20\d{2})$/
  ];

  private static readonly COMMON_PINS = new Set([
    '123456', '654321', '111111', '000000', '123123', '696969',
    '112233', '1234', '12345', '123456789', 'password', '000000',
    '1111', '2222', '3333', '4444', '5555', '6666', '7777', '8888', '9999',
    '121212', '131313', '141414', '151515', '161616', '171717', '181818', '191919',
    '010101', '020202', '030303', '040404', '050505', '060606', '070707', '080808', '090909'
  ]);

  /**
   * Validate PIN strength and security
   */
  static validatePin(pin: string): PinValidationResult {
    const issues: string[] = [];
    const suggestions: string[] = [];
    let score = 100;

    // Basic format check
    if (!/^\d{6,8}$/.test(pin)) {
      issues.push('PIN must be 6-8 digits');
      return {
        isValid: false,
        score: 0,
        issues,
        suggestions: ['Use only digits (0-9)', 'PIN must be between 6-8 characters long']
      };
    }

    // Check against weak patterns
    for (const pattern of this.WEAK_PATTERNS) {
      if (pattern.test(pin)) {
        issues.push('PIN contains a weak pattern');
        score -= 40;
        break;
      }
    }

    // Check against common PINs
    if (this.COMMON_PINS.has(pin)) {
      issues.push('PIN is too common and easily guessable');
      score -= 50;
    }

    // Check for insufficient variety in digits
    const uniqueDigits = new Set(pin.split('')).size;
    if (uniqueDigits < 3) {
      issues.push('PIN should contain at least 3 different digits');
      score -= 20;
    }

    // Check for birthday patterns (MMDD, DDMM, MMYY, etc.)
    if (this.looksLikeBirthday(pin)) {
      issues.push('PIN appears to be a date (avoid birthdays, years, etc.)');
      score -= 30;
    }

    // Check for keyboard patterns
    if (this.hasKeyboardPattern(pin)) {
      issues.push('PIN follows a keyboard pattern');
      score -= 25;
    }

    // Bonus points for length
    if (pin.length >= 8) {
      score += 10;
    }

    // Bonus for variety
    if (uniqueDigits >= 5) {
      score += 15;
    }

    // Generate suggestions
    if (issues.length > 0) {
      suggestions.push('Use a random combination of digits');
      suggestions.push('Avoid patterns like 123456 or 111111');
      suggestions.push('Avoid important dates or phone numbers');
      suggestions.push('Mix digits randomly without obvious patterns');
    }

    // Ensure score doesn't go below 0
    score = Math.max(0, score);

    return {
      isValid: score >= 60 && issues.length === 0,
      score,
      issues,
      suggestions
    };
  }

  /**
   * Check if PIN looks like a birthday or date
   */
  private static looksLikeBirthday(pin: string): boolean {
    if (pin.length < 4) return false;

    // Check for MMDD, DDMM patterns
    if (pin.length >= 4) {
      const month = parseInt(pin.substring(0, 2));
      const day = parseInt(pin.substring(2, 4));
      
      if ((month >= 1 && month <= 12 && day >= 1 && day <= 31) ||
          (day >= 1 && day <= 12 && month >= 1 && month <= 31)) {
        return true;
      }
    }

    // Check for year patterns
    const year = parseInt(pin);
    if (year >= 1900 && year <= 2030) {
      return true;
    }

    return false;
  }

  /**
   * Check for keyboard patterns (qwerty-adjacent digits on numeric keypad)
   */
  private static hasKeyboardPattern(pin: string): boolean {
    // Numeric keypad patterns
    const keypadPatterns = [
      '147', '258', '369', // columns
      '123', '456', '789', // rows
      '159', '357' // diagonals
    ];

    for (const pattern of keypadPatterns) {
      if (pin.includes(pattern) || pin.includes(pattern.split('').reverse().join(''))) {
        return true;
      }
    }

    return false;
  }

  /**
   * Generate a secure PIN suggestion
   */
  static generateSecurePin(length: number = 6): string {
    const digits = '0123456789';
    let pin = '';
    
    // Ensure we don't create weak patterns
    while (true) {
      pin = '';
      for (let i = 0; i < length; i++) {
        pin += digits.charAt(Math.floor(Math.random() * digits.length));
      }
      
      const validation = this.validatePin(pin);
      if (validation.isValid && validation.score >= 80) {
        break;
      }
    }
    
    return pin;
  }

  /**
   * Check if two PINs are similar (for preventing PIN reuse)
   */
  static arePinsSimilar(pin1: string, pin2: string): boolean {
    if (pin1 === pin2) return true;
    
    // Check if one is reverse of another
    if (pin1 === pin2.split('').reverse().join('')) return true;
    
    // Check if they differ by only one character
    if (pin1.length === pin2.length) {
      let differences = 0;
      for (let i = 0; i < pin1.length; i++) {
        if (pin1[i] !== pin2[i]) {
          differences++;
        }
      }
      return differences <= 1;
    }
    
    return false;
  }
}

/**
 * Quick validation function for use in Zod schemas
 */
export function validatePinStrength(pin: string): boolean {
  const result = PinValidator.validatePin(pin);
  return result.isValid;
}

/**
 * Get human-readable PIN strength description
 */
export function getPinStrengthLabel(score: number): string {
  if (score >= 90) return 'Very Strong';
  if (score >= 80) return 'Strong';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Weak';
  return 'Very Weak';
}