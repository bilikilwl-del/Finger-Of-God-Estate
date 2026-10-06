/**
 * Nigerian Phone Number Validation, Normalization, and Formatting Utilities
 * Standardizes formats like +2348012345678, 2348012345678, 08012345678, 080-1234-5678
 */

export interface PhoneValidationResult {
  isValid: boolean;
  normalized: string; // 11-digit local format e.g. "08012345678"
  formatted: string;  // Readable local format e.g. "0801 234 5678"
  international: string; // E.164 e.g. "+2348012345678"
  error?: string;
}

/**
 * Normalizes any variation of a Nigerian phone number into the canonical 11-digit format:
 * e.g., "+234 803 123 4567" -> "08031234567"
 *       "2348031234567"      -> "08031234567"
 *       "0803-123-4567"      -> "08031234567"
 */
export function normalizeNigerianPhone(input: string): string {
  if (!input) return '';
  // Strip all characters except digits and plus sign
  let cleaned = input.trim().replace(/[^\d+]/g, '');

  if (cleaned.startsWith('+234')) {
    cleaned = cleaned.slice(4);
  } else if (cleaned.startsWith('234') && cleaned.length >= 12) {
    cleaned = cleaned.slice(3);
  }

  // Remove any redundant leading zeros that might have existed from "+234 080..."
  cleaned = cleaned.replace(/^0+/, '');

  // If 10 digits starting with 7, 8, or 9 (standard Nigerian mobile without leading 0), add the leading 0
  if (cleaned.length === 10 && /^[789]/.test(cleaned)) {
    return '0' + cleaned;
  }

  // If already 11 digits starting with 0
  if (cleaned.length === 11 && cleaned.startsWith('0')) {
    return cleaned;
  }

  return cleaned ? '0' + cleaned : '';
}

/**
 * Validates a Nigerian phone number against active carrier prefixes:
 * 070, 080, 081, 090, 091, 071
 */
export function validateNigerianPhone(input: string): PhoneValidationResult {
  if (!input || !input.trim()) {
    return {
      isValid: false,
      normalized: '',
      formatted: '',
      international: '',
      error: 'Phone number is required.'
    };
  }

  const normalized = normalizeNigerianPhone(input);

  // Must be exactly 11 digits
  if (!/^\d{11}$/.test(normalized)) {
    if (normalized.length < 11) {
      return {
        isValid: false,
        normalized,
        formatted: normalized,
        international: '',
        error: `Phone number is too short (${normalized.length} digits). Nigerian numbers must be 11 digits (e.g. 08012345678).`
      };
    }
    if (normalized.length > 11) {
      return {
        isValid: false,
        normalized,
        formatted: normalized,
        international: '',
        error: `Phone number is too long (${normalized.length} digits). Expected standard 11 digits.`
      };
    }
    return {
      isValid: false,
      normalized,
      formatted: normalized,
      international: '',
      error: 'Phone number contains invalid characters. Numbers only.'
    };
  }

  // Check prefix: 070, 080, 081, 090, 091, 071
  const validPrefixRegex = /^0(70|80|81|90|91|71)\d{8}$/;
  if (!validPrefixRegex.test(normalized)) {
    return {
      isValid: false,
      normalized,
      formatted: normalized,
      international: '',
      error: `"${normalized.slice(0, 4)}" is not a recognized Nigerian mobile network prefix. Expected 080, 070, 081, 090, or 091.`
    };
  }

  // Format nicely: 0801 234 5678
  const formatted = `${normalized.slice(0, 4)} ${normalized.slice(4, 7)} ${normalized.slice(7)}`;
  const international = `+234${normalized.slice(1)}`;

  return {
    isValid: true,
    normalized,
    formatted,
    international,
    error: undefined
  };
}

/**
 * Formats any variation of a Nigerian phone number into the standard international format (2348012345678)
 * required by Nigerian SMS gateways (SmartSMS, Termii, etc.).
 */
export function formatNigerianPhoneForSMS(input: string): string {
  if (!input) return '';
  const local11 = normalizeNigerianPhone(input);
  if (local11.startsWith('0') && local11.length === 11) {
    return '234' + local11.substring(1);
  }
  const digits = String(input).replace(/\D/g, '');
  if (digits.startsWith('234') && digits.length === 13) {
    return digits;
  }
  if (digits.startsWith('0') && digits.length === 11) {
    return '234' + digits.substring(1);
  }
  if (digits.length === 10 && /^[789]/.test(digits)) {
    return '234' + digits;
  }
  return digits;
}

/**
 * Checks if two phone numbers match after normalization
 */
export function arePhoneNumbersEqual(phoneA: string, phoneB: string): boolean {
  if (!phoneA || !phoneB) return false;
  const normA = normalizeNigerianPhone(phoneA);
  const normB = normalizeNigerianPhone(phoneB);
  if (normA && normB && normA === normB) return true;

  const digitsA = String(phoneA).replace(/\D/g, '');
  const digitsB = String(phoneB).replace(/\D/g, '');
  if (digitsA.length >= 10 && digitsB.length >= 10 && digitsA.slice(-10) === digitsB.slice(-10)) {
    return true;
  }
  return false;
}
