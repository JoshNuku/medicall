/**
 * MediCall Ghana Telecom & E.164 Phone Utilities
 * 
 * Supports:
 * - MTN Ghana: 024, 054, 055, 059, 053
 * - Telecel (Vodafone): 020, 050
 * - AT (AirtelTigo): 027, 057, 026, 056
 * - Expresso / Legacy: 028
 * - Ghanaian Fixed Lines: 030 - 039
 * - International E.164 numbers (e.g. +1, +44 for diaspora caregivers)
 */

const GHANA_NETWORK_PREFIXES = {
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

/**
 * Normalizes any phone number into canonical E.164 format (+233XXXXXXXXX for Ghana).
 * Strips whitespace, dashes, parentheses, dots, and handles leading zeros.
 * 
 * Examples:
 * - "024 123 4567"      => "+233241234567"
 * - "+233 24 123 4567"  => "+233241234567"
 * - "+233 024 123 4567" => "+233241234567"
 * - "233241234567"      => "+233241234567"
 * - "241234567"         => "+233241234567"
 * - "+1 415 555 2671"   => "+14155552671"
 */
function normalizePhone(rawPhone) {
  if (!rawPhone) return '';
  let cleaned = String(rawPhone).trim().replace(/[\s\-\(\)\.]/g, '');

  if (!cleaned) return '';

  // Handle +233 variations
  if (cleaned.startsWith('+2330')) {
    cleaned = '+233' + cleaned.slice(5);
  } else if (cleaned.startsWith('2330')) {
    cleaned = '+233' + cleaned.slice(4);
  } else if (cleaned.startsWith('+233')) {
    // Already has +233
  } else if (cleaned.startsWith('233')) {
    cleaned = '+' + cleaned;
  } else if (cleaned.startsWith('0') && cleaned.length === 10) {
    cleaned = '+233' + cleaned.slice(1);
  } else if (/^[235]\d{8}$/.test(cleaned)) {
    // 9 digits without 0 or +233
    cleaned = '+233' + cleaned;
  } else if (!cleaned.startsWith('+') && /^\d{10,15}$/.test(cleaned)) {
    cleaned = '+' + cleaned;
  }

  return cleaned;
}

/**
 * Formats a phone number for clean human-readable UI display.
 * "+233241234567" => "+233 24 123 4567"
 */
function formatPhoneDisplay(rawPhone) {
  const normalized = normalizePhone(rawPhone);
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
 * Validates a phone number.
 * 
 * @param {string} rawPhone - Raw phone input
 * @param {boolean} isRequired - Whether an empty value is considered invalid
 * @returns {{ isValid: boolean, normalized: string|null, network: string|null, error?: string }}
 */
function validatePhone(rawPhone, isRequired = true) {
  const trimmed = rawPhone ? String(rawPhone).trim() : '';

  if (!trimmed) {
    if (isRequired) {
      return { isValid: false, normalized: null, network: null, error: 'Phone number is required.' };
    }
    return { isValid: true, normalized: null, network: null };
  }

  const normalized = normalizePhone(trimmed);

  // Check if it's a Ghanaian number (+233)
  if (normalized.startsWith('+233')) {
    const localPart = normalized.slice(4); // 9 digits

    if (localPart.length !== 9) {
      return {
        isValid: false,
        normalized,
        network: null,
        error: `Ghanaian numbers must have 9 digits after +233 or 10 digits starting with 0 (received ${localPart.length} digits).`
      };
    }

    if (!/^\d+$/.test(localPart)) {
      return {
        isValid: false,
        normalized,
        network: null,
        error: 'Phone number contains invalid non-digit characters.'
      };
    }

    const prefix = localPart.slice(0, 2);
    const network = GHANA_NETWORK_PREFIXES[prefix];

    if (!network) {
      return {
        isValid: false,
        normalized,
        network: null,
        error: `Unknown Ghanaian mobile network prefix "0${prefix}". Valid prefixes include 024, 054, 055, 059, 053 (MTN), 020, 050 (Telecel), 027, 057, 026 (AT).`
      };
    }

    return {
      isValid: true,
      normalized,
      network,
      formatted: formatPhoneDisplay(normalized)
    };
  }

  // International E.164 pattern: + followed by 8 to 15 digits
  if (/^\+[1-9]\d{7,14}$/.test(normalized)) {
    return {
      isValid: true,
      normalized,
      network: 'International',
      formatted: normalized
    };
  }

  return {
    isValid: false,
    normalized,
    network: null,
    error: 'Invalid phone format. Please enter a Ghanaian number (e.g. 024 123 4567 or +233 24 123 4567) or international +[country][number].'
  };
}

module.exports = {
  GHANA_NETWORK_PREFIXES,
  normalizePhone,
  validatePhone,
  formatPhoneDisplay
};
