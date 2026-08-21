/**
 * MOCKED email-change flow for demo purposes only.
 *
 * The sign-in email in Entra External ID is not a plain profile field - it's
 * part of the user's `identities` collection and can only be changed
 * server-side via Microsoft Graph (PATCH /users/{id}) using an app
 * registration with admin-consented User.ReadWrite.All, after a backend
 * verifies the user actually owns the new address. None of that can safely
 * happen in a public SPA client, so this only simulates the UX (request a
 * code, confirm it, remember the "new" email locally) - it never talks to
 * Entra or Microsoft Graph, and the user's real sign-in email is unchanged.
 */
const PREFIX = 'bananaRental.emailChange.';

const pendingKeyFor = (account) => `${PREFIX}${account?.homeAccountId || 'unknown'}.pending`;
const confirmedKeyFor = (account) => `${PREFIX}${account?.homeAccountId || 'unknown'}.confirmed`;

/**
 * Simulates sending a verification code to the new address. Returns the code
 * so the UI can display it (standing in for "check your email"), since this
 * demo has no real mail service behind it.
 */
export const requestEmailChange = (account, newEmail) => {
    const code = String(Math.floor(100000 + Math.random() * 900000));
    localStorage.setItem(pendingKeyFor(account), JSON.stringify({ newEmail, code }));
    return code;
};

export const confirmEmailChange = (account, enteredCode) => {
    const raw = localStorage.getItem(pendingKeyFor(account));
    if (!raw) return { success: false, error: 'No pending email change request. Start over.' };
    const { newEmail, code } = JSON.parse(raw);
    if (enteredCode.trim() !== code) {
        return { success: false, error: 'Incorrect verification code.' };
    }
    localStorage.removeItem(pendingKeyFor(account));
    localStorage.setItem(confirmedKeyFor(account), newEmail);
    return { success: true, newEmail };
};

/**
 * The demo's locally-confirmed email override, if the user has gone through
 * the mock change flow. Falls back to the real sign-in email (from the ID
 * token) when nothing has been changed in this demo.
 */
export const getConfirmedEmail = (account) => localStorage.getItem(confirmedKeyFor(account));
