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
  // Strip all non-digit characters except leading plus if present
  let cleaned = input.trim().replace(/[\s\-\(\)\.]/g, '');

  if (cleaned.startsWith('+234')) {
    cleaned = '0' + cleaned.slice(4);
  } else if (cleaned.startsWith('234') && cleaned.length >= 13) {
    cleaned = '0' + cleaned.slice(3);
  }

  return cleaned;
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
 * Checks if two phone numbers match after normalization
 */
export function arePhoneNumbersEqual(phoneA: string, phoneB: string): boolean {
  if (!phoneA || !phoneB) return false;
  return normalizeNigerianPhone(phoneA) === normalizeNigerianPhone(phoneB);
}
