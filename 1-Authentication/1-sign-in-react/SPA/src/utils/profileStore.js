/**
 * MOCKED profile store standing in for a real backend call (e.g. a
 * bsc-services `GET/PUT /api/profile` endpoint) that doesn't exist yet.
 * Persisted in localStorage - not sessionStorage - so it survives closing
 * the tab, the same way a real backend record would. Swap the three
 * functions below for real API calls once the backend exists; nothing
 * else in the app needs to change.
 */
const STORAGE_PREFIX = 'bananaRental.profile.';

const keyFor = (account) => `${STORAGE_PREFIX}${account?.homeAccountId || account?.localAccountId || 'unknown'}`;

export const isProfileComplete = (account) => {
    if (!account) return false;
    return localStorage.getItem(keyFor(account)) === 'complete';
};

export const saveProfile = (account, profileData) => {
    if (!account) return;
    localStorage.setItem(keyFor(account), 'complete');
    localStorage.setItem(`${keyFor(account)}.data`, JSON.stringify(profileData));
};

export const getProfile = (account) => {
    if (!account) return null;
    const raw = localStorage.getItem(`${keyFor(account)}.data`);
    return raw ? JSON.parse(raw) : null;
};

/**
 * Masks all but the last 2 characters of a driver's license number, for
 * display before the Authentication Context (MFA) step-up has been satisfied.
 */
export const maskDriversLicense = (license) => {
    if (!license) return 'XXXXXXXX';
    if (license.length <= 2) return 'X'.repeat(license.length);
    return 'X'.repeat(license.length - 2) + license.slice(-2);
};

/**
 * Masks a date of birth (e.g. "1990-05-14" from the <input type="date">)
 * before the Authentication Context (MFA) step-up has been satisfied.
 * Keeps the separators so the format is still recognizable: "XXXX-XX-XX".
 */
export const maskDateOfBirth = (dob) => {
    if (!dob) return 'XXXX-XX-XX';
    return dob.replace(/[0-9]/g, 'X');
};
