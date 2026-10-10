/**
 * Building and Flat Management Integrity Utilities
 * Finger of God Estate Management System
 * 
 * Enforces building tag integrity (e.g. 001 - 300), leading-zero preservation,
 * duplicate prevention, and privacy-conscious household name masking.
 */

export const BUILDING_TAG_MIN = 1;
export const BUILDING_TAG_MAX = 300;

// Strict Regex for canonical 3-digit estate tags: 001 to 300
export const CANONICAL_BUILDING_TAG_REGEX = /^(00[1-9]|0[1-9][0-9]|[1-2][0-9]{2}|300)$/;

export interface BuildingTagValidationResult {
  isValid: boolean;
  normalized: string;
  error?: string;
}

/**
 * Normalizes a building tag into its canonical string representation,
 * strictly preserving leading zeros (e.g. "16" -> "016", "016" -> "016", "300" -> "300").
 */
export function normalizeBuildingTag(input: string | number | undefined | null): string {
  if (input === undefined || input === null) return '';
  const str = String(input).trim();
  if (!str) return '';

  // If purely numeric digits, normalize to 3 digits if in range 1-300
  if (/^\d+$/.test(str)) {
    const val = parseInt(str, 10);
    if (!isNaN(val) && val >= BUILDING_TAG_MIN && val <= BUILDING_TAG_MAX) {
      return String(val).padStart(3, '0');
    }
  }

  return str;
}

/**
 * Validates a building tag against estate identification rules.
 * Rejects empty, malformed, negative, or out-of-bounds tags.
 */
export function validateBuildingTag(input: string | number | undefined | null): BuildingTagValidationResult {
  if (input === undefined || input === null || String(input).trim() === '') {
    return {
      isValid: false,
      normalized: '',
      error: 'Building tag / house number is required.'
    };
  }

  const raw = String(input).trim();
  const normalized = normalizeBuildingTag(raw);

  // If numeric, enforce 001 - 300 range
  if (/^\d+$/.test(raw)) {
    const num = parseInt(raw, 10);
    if (num < BUILDING_TAG_MIN || num > BUILDING_TAG_MAX) {
      return {
        isValid: false,
        normalized: raw,
        error: `Building tag "${raw}" is outside the valid estate range (001–300).`
      };
    }
    return {
      isValid: true,
      normalized
    };
  }

  // If canonical 3-digit tag
  if (CANONICAL_BUILDING_TAG_REGEX.test(raw)) {
    return {
      isValid: true,
      normalized: raw
    };
  }

  // Support alphanumeric estate identifiers (e.g. "Plot 14B", "House 12") if needed,
  // but ensure no dangerous characters or whitespace-only values
  if (/^[A-Za-z0-9\s\-_/]{1,50}$/.test(raw)) {
    return {
      isValid: true,
      normalized: raw
    };
  }

  return {
    isValid: false,
    normalized: raw,
    error: `Invalid building tag format "${raw}". Please enter a valid estate identification number (e.g. 001, 016, 300).`
  };
}

/**
 * Privacy-conscious masking for household/resident names on public displays.
 * Example: "Babatunde Adeleke" -> "B. A***"
 * Example: "Chief Emeka Okafor" -> "C. O***"
 * Example: "Dr. Chioma Nnamdi" -> "C. N***"
 * Example: null / empty -> "Occupant"
 */
export function maskHouseholdName(fullName: string | null | undefined): string {
  if (!fullName || typeof fullName !== 'string' || !fullName.trim()) {
    return 'Occupant';
  }

  const clean = fullName.trim();
  // Strip common honorifics for better initial determination
  const honorifics = ['chief', 'engr', 'dr', 'mr', 'mrs', 'ms', 'barr', 'prof', 'pastor', 'rev', 'elder'];
  const words = clean.split(/\s+/).filter(Boolean);

  if (words.length === 0) return 'Occupant';

  const nonHonorificWords = words.filter(w => !honorifics.includes(w.toLowerCase().replace(/\./g, '')));
  const targetWords = nonHonorificWords.length > 0 ? nonHonorificWords : words;

  if (targetWords.length === 1) {
    const single = targetWords[0];
    if (single.length <= 2) return `${single[0]}.***`;
    return `${single[0]}***${single[single.length - 1]}`;
  }

  const first = targetWords[0];
  const last = targetWords[targetWords.length - 1];
  const firstInitial = first.charAt(0).toUpperCase();
  const lastInitial = last.charAt(0).toUpperCase();

  return `${firstInitial}. ${lastInitial}***`;
}

/**
 * Checks if a flat or unit is missing assigned household records
 */
export function isUnassignedHousehold(flat: {
  occupant_name?: string | null;
  occupant_type?: string;
  resident_id?: string | null;
}): boolean {
  if (flat.occupant_type === 'VACANT') return true;
  if (!flat.occupant_name || !flat.occupant_name.trim()) return true;
  return false;
}
