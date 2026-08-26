const DEFAULT_COUNTRY_CODE = '1';

/**
 * Formats phone input as the user types. If they've typed a leading "+",
 * treat it as an explicit international number and just keep the digits
 * (too many country-specific grouping formats to guess at). Otherwise,
 * assume a US number and format it as (XXX) XXX-XXXX as they type.
 */
export const formatPhoneInput = (raw) => {
    const hasPlus = raw.trim().startsWith('+');
    const digits = raw.replace(/\D/g, '');
    if (hasPlus) return `+${digits}`;
    const trimmed = digits.slice(0, 10);
    if (trimmed.length === 0) return '';
    if (trimmed.length < 4) return `(${trimmed}`;
    if (trimmed.length < 7) return `(${trimmed.slice(0, 3)}) ${trimmed.slice(3)}`;
    return `(${trimmed.slice(0, 3)}) ${trimmed.slice(3, 6)}-${trimmed.slice(6)}`;
};

/** Normalizes to E.164, defaulting to +1 when no country code was given. */
export const normalizePhone = (value) => {
    const hasPlus = value.trim().startsWith('+');
    const digits = value.replace(/\D/g, '');
    return hasPlus ? `+${digits}` : `+${DEFAULT_COUNTRY_CODE}${digits}`;
};

/** +1 numbers get a strict 10-digit check; other country codes get a looser E.164-shaped check. */
export const isValidPhone = (value) => {
    if (!value.trim()) return false;
    const normalized = normalizePhone(value);
    if (normalized.startsWith('+1')) return /^\+1\d{10}$/.test(normalized);
    return /^\+[1-9]\d{7,14}$/.test(normalized);
};
