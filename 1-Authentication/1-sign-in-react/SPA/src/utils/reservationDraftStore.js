/**
 * Transient "sign up for the loyalty program while reserving a car" draft.
 *
 * Uses sessionStorage, not localStorage: this only needs to survive the
 * round trip out to Entra's hosted sign-up page and back - sessionStorage
 * persists across that navigation as long as the tab stays open, same as
 * MSAL's own token cache in this app (see cacheLocation in authConfig.js).
 * Unlike localStorage, it also doesn't linger indefinitely if the user
 * abandons the flow partway through - it's PII (name, DOB, email, phone)
 * that was never meant to be a permanent record until it's actually synced
 * to a backend.
 */
const DRAFT_KEY = 'bananaRental.reservationDraft';
const CONTEXT_KEY = 'bananaRental.reservationContext';

export const saveReservationDraft = (info) => {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(info));
};

export const getReservationDraft = () => {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    return raw ? JSON.parse(raw) : null;
};

export const clearReservationDraft = () => {
    sessionStorage.removeItem(DRAFT_KEY);
};

/**
 * There's no client-side router in this app - `/redirect` and `/` both just
 * serve the same index.html, and the whole page remounts on any real
 * navigation. So a full-page redirect to Entra wipes in-memory state (which
 * reservation step you were on, what location/dates you'd picked) no matter
 * which URL you land back on - a different redirect_uri wouldn't fix that on
 * its own. This carries the location/dates through the same way the driver
 * profile does, so the app can restore "you were reserving a car" on return.
 */
export const saveReservationContext = (context) => {
    sessionStorage.setItem(CONTEXT_KEY, JSON.stringify(context));
};

export const getReservationContext = () => {
    const raw = sessionStorage.getItem(CONTEXT_KEY);
    return raw ? JSON.parse(raw) : null;
};

export const clearReservationContext = () => {
    sessionStorage.removeItem(CONTEXT_KEY);
};

/**
 * MOCKED backend call - stands in for a real POST to bsc-services (e.g.
 * `/api/loyalty/signup`) once it exists. Sends the details collected during
 * the reservation flow plus the newly-created Entra account so the backend
 * can link them. No real network call happens here.
 */
export const submitReservationSignup = (account, draft) => {
    console.log('[MOCK API CALL] POST /api/loyalty/signup', {
        accountId: account?.homeAccountId,
        ...draft,
    });
    return Promise.resolve({ success: true });
};
