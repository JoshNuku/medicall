/**
 * MediCall Frontend Phone Validation and Utilities
 * 
 * Specifically calibrated for Ghanaian Mobile Networks (MTN, Telecel, AT)
 * and International E.164 phone formats.
 */

export const GHANA_NETWORK_PREFIXES: Record<string, string> = {
  // MTN Ghana
  '24': 'MTN',
  '54': 'MTN',
  '55': 'MTN',
  '59': 'MTN',
  '53': 'MTN',
  // Telecel Ghana (formerly Vodafone)
  '20': 'Telecel',
  '50': 'Telecel',
  // AT (formerly AirtelTigo)
  '27': 'AT',
  '57': 'AT',
  '26': 'AT',
  '56': 'AT',
  // Expresso / Legacy
  '28': 'Expresso',
  // Landlines
  '30': 'Fixed (Accra)',
  '31': 'Fixed (Western)',
  '32': 'Fixed (Ashanti)',
  '33': 'Fixed (Central)',
  '34': 'Fixed (Eastern)',
  '35': 'Fixed (Brong Ahafo)',
  '36': 'Fixed (Volta)',
  '37': 'Fixed (Northern)',
  '38': 'Fixed (Upper East)',
  '39': 'Fixed (Upper West)',
};

export interface PhoneValidationResult {
  isValid: boolean;
  normalized: string | null;
  formatted: string;
  network: string | null;
  error?: string;
}

/**
 * Normalizes phone numbers to standard E.164 (+233XXXXXXXXX for Ghana).
 */
export function normalizePhoneNumber(rawPhone?: string | null): string {
  if (!rawPhone) return '';
  let cleaned = String(rawPhone).trim().replace(/[\s\-\(\)\.]/g, '');
  if (!cleaned) return '';

  if (cleaned.startsWith('+2330')) {
    cleaned = '+233' + cleaned.slice(5);
  } else if (cleaned.startsWith('2330')) {
    cleaned = '+233' + cleaned.slice(4);
  } else if (cleaned.startsWith('+233')) {
    // Keep as is
  } else if (cleaned.startsWith('233')) {
    cleaned = '+' + cleaned;
  } else if (cleaned.startsWith('0') && cleaned.length === 10) {
    cleaned = '+233' + cleaned.slice(1);
  } else if (/^[235]\d{8}$/.test(cleaned)) {
    cleaned = '+233' + cleaned;
  } else if (!cleaned.startsWith('+') && /^\d{10,15}$/.test(cleaned)) {
    cleaned = '+' + cleaned;
  }

  return cleaned;
}

/**
 * Formats a phone number for clean readable display.
 * Example: "+233241234567" -> "+233 24 123 4567"
 */
export function formatPhoneDisplay(rawPhone?: string | null): string {
  const normalized = normalizePhoneNumber(rawPhone);
  if (!normalized) return '';

  if (normalized.startsWith('+233') && normalized.length === 13) {
    const prefix = normalized.slice(4, 6);
    const mid = normalized.slice(6, 9);
    const end = normalized.slice(9, 13);
    return `+233 ${prefix} ${mid} ${end}`;
  }

  return normalized;
}

/**
 * Validates a phone number with Ghanaian carrier prefix recognition.
 */
export function validatePhoneNumber(rawPhone?: string | null, isRequired = true): PhoneValidationResult {
  const trimmed = rawPhone ? String(rawPhone).trim() : '';

  if (!trimmed || trimmed === '+233' || trimmed === '+233 ') {
    if (isRequired) {
      return {
        isValid: false,
        normalized: null,
        formatted: '',
        network: null,
        error: 'Phone number is required for voice calls.',
      };
    }
    return {
      isValid: true,
      normalized: null,
      formatted: '',
      network: null,
    };
  }

  const normalized = normalizePhoneNumber(trimmed);

  // Check if it's a Ghanaian number (+233)
  if (normalized.startsWith('+233')) {
    const localPart = normalized.slice(4); // 9 digits

    if (localPart.length < 9) {
      return {
        isValid: false,
        normalized,
        formatted: normalized,
        network: null,
        error: `Incomplete number (${localPart.length}/9 digits). Enter a full 10-digit number (e.g. 024 123 4567).`,
      };
    }

    if (localPart.length > 9) {
      return {
        isValid: false,
        normalized,
        formatted: normalized,
        network: null,
        error: `Too many digits (${localPart.length}/9). Expected 9 digits after +233.`,
      };
    }

    if (!/^\d+$/.test(localPart)) {
      return {
        isValid: false,
        normalized,
        formatted: normalized,
        network: null,
        error: 'Phone number contains invalid non-digit characters.',
      };
    }

    const prefix = localPart.slice(0, 2);
    const network = GHANA_NETWORK_PREFIXES[prefix];

    if (!network) {
      return {
        isValid: false,
        normalized,
        formatted: normalized,
        network: null,
        error: `Prefix "0${prefix}" is not a recognized Ghana mobile operator. Valid: 024, 054, 055, 059, 053 (MTN), 020, 050 (Telecel), 027, 057, 026 (AT).`,
      };
    }

    return {
      isValid: true,
      normalized,
      formatted: formatPhoneDisplay(normalized),
      network,
    };
  }

  // International E.164 pattern: + followed by 8 to 15 digits
  if (/^\+[1-9]\d{7,14}$/.test(normalized)) {
    return {
      isValid: true,
      normalized,
      formatted: normalized,
      network: 'International',
    };
  }

  return {
    isValid: false,
    normalized,
    formatted: trimmed,
    network: null,
    error: 'Invalid format. Use 10-digit Ghana format (e.g. 024 123 4567) or international (+233...).',
  };
}
