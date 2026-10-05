/**
 * Resident Number Integrity & Validation Utilities
 * Finger of God Estate Resident Management System
 * 
 * Enforces strict 001 - 300 range, leading-zero preservation, and duplicate prevention.
 */

import { normalizeNigerianPhone, arePhoneNumbersEqual } from './phoneUtils';

export const RESIDENT_NUMBER_MIN = 1;
export const RESIDENT_NUMBER_MAX = 300;

// Strict Regex: 001 to 009, 010 to 099, 100 to 299, 300
export const RESIDENT_NUMBER_REGEX = /^(00[1-9]|0[1-9][0-9]|[1-2][0-9]{2}|300)$/;

export interface ResidentNumberValidationResult {
  isValid: boolean;
  normalized: string;
  error?: string;
}

/**
 * Checks if a string is a strictly valid resident number (001 through 300)
 */
export function isValidResidentNumber(input: string | number | undefined | null): boolean {
  if (input === undefined || input === null) return false;
  const str = String(input).trim();
  return RESIDENT_NUMBER_REGEX.test(str);
}

/**
 * Normalizes user input into canonical 3-digit resident number (e.g. "1" -> "001", "25" -> "025", "300" -> "300")
 * Preserves leading zeros.
 */
export function normalizeResidentNumber(input: string | number | undefined | null): string {
  if (input === undefined || input === null) return '';
  const str = String(input).trim();
  if (!str) return '';
  
  // If purely digits, pad to 3 digits
  if (/^\d+$/.test(str)) {
    const val = parseInt(str, 10);
    if (!isNaN(val) && val >= RESIDENT_NUMBER_MIN && val <= RESIDENT_NUMBER_MAX) {
      return String(val).padStart(3, '0');
    }
  }
  return str;
}

/**
 * Full validation for resident numbers with actionable error messages
 * Strictly requires 3-digit format (001 through 300) with preserved leading zeros.
 * Does not allow: 1, 01, 0001, ABC, duplicate numbers.
 */
export function validateResidentNumber(input: string | number | undefined | null): ResidentNumberValidationResult {
  if (input === undefined || input === null || String(input).trim() === '') {
    return {
      isValid: false,
      normalized: '',
      error: 'Resident number is required.'
    };
  }

  const raw = String(input).trim();
  const normalized = normalizeResidentNumber(raw);

  // Strictly check if the entered string is 3 digits matching 001-300
  if (!RESIDENT_NUMBER_REGEX.test(raw)) {
    const num = parseInt(raw, 10);
    if (isNaN(num)) {
      return {
        isValid: false,
        normalized: raw,
        error: `"${raw}" is not a valid resident number. Estate resident numbers must be numeric between 001 and 300.`
      };
    }
    if (num < RESIDENT_NUMBER_MIN) {
      return {
        isValid: false,
        normalized: raw,
        error: `Resident number cannot be less than 001.`
      };
    }
    if (num > RESIDENT_NUMBER_MAX) {
      return {
        isValid: false,
        normalized: raw,
        error: `Resident number cannot exceed 300. The estate directory is designated for residents 001–300.`
      };
    }
    if (raw.length < 3) {
      return {
        isValid: false,
        normalized,
        error: `Invalid resident number format "${raw}". Leading zeros must be preserved (e.g. use "${normalized}" instead of "${raw}").`
      };
    }
    if (raw.length > 3) {
      return {
        isValid: false,
        normalized,
        error: `Invalid resident number format "${raw}". Resident numbers must be exactly 3 digits (001–300). Extra leading zeros or digits (e.g. 0001) are not allowed.`
      };
    }
    return {
      isValid: false,
      normalized,
      error: `Invalid resident number format. Must be formatted as 3 digits with leading zeros (e.g. 001, 042, 300).`
    };
  }

  return {
    isValid: true,
    normalized: raw,
    error: undefined
  };
}

/**
 * Checks for duplicate resident numbers in a list
 */
export function isDuplicateResidentNumber(
  numberToTest: string,
  existingResidents: Array<{ resident_number: string; id?: string }>,
  excludeId?: string
): boolean {
  const norm = normalizeResidentNumber(numberToTest);
  return existingResidents.some(r => 
    r.id !== excludeId && normalizeResidentNumber(r.resident_number) === norm
  );
}

/**
 * Checks for duplicate phone numbers in a list across both primary and alternate phones
 */
export function checkDuplicatePhone(
  phoneToTest: string,
  existingResidents: Array<{ 
    id?: string; 
    resident_number: string; 
    full_name?: string; 
    phone_number: string; 
    additional_phone?: string | null 
  }>,
  excludeId?: string
): { isDuplicate: boolean; conflictResident?: { resident_number: string; full_name: string } } {
  const norm = normalizeNigerianPhone(phoneToTest);
  if (!norm) return { isDuplicate: false };

  for (const r of existingResidents) {
    if (r.id === excludeId) continue;
    const rPrimary = normalizeNigerianPhone(r.phone_number);
    const rAlt = r.additional_phone ? normalizeNigerianPhone(r.additional_phone) : null;

    if (arePhoneNumbersEqual(norm, rPrimary) || (rAlt && arePhoneNumbersEqual(norm, rAlt))) {
      return {
        isDuplicate: true,
        conflictResident: {
          resident_number: r.resident_number,
          full_name: r.full_name || `Resident #${r.resident_number}`
        }
      };
    }
  }

  return { isDuplicate: false };
}
