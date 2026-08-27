/**
 * MOCKED "delete this abandoned account" call, fired when someone cancels
 * out of the post-signup profile gate (ProfileCompletion.jsx, postAuth mode)
 * without ever completing it - i.e. they created an Entra account (however
 * they got there - our own Join flow, or Entra's own "create one" link off
 * the sign-in page) and immediately backed out.
 *
 * The REAL implementation needs, at minimum:
 *
 *  - A confidential backend app registration (separate from this SPA's
 *    public client) with the Microsoft Graph *application* permission
 *    User.ReadWrite.All, admin-consented in the tenant - same pattern as
 *    the email-change and given_name/family_name claims work covered
 *    earlier in this project.
 *
 *  - A backend endpoint that takes the CALLING USER'S OWN bearer token -
 *    never a client-supplied account ID - validates it, and extracts the
 *    `oid` claim itself to know which account to act on. A destructive
 *    endpoint must never trust the client to say which account to delete.
 *
 *  - A SERVER-SIDE safety check before calling Graph at all: confirm the
 *    account's own `createdDateTime` (GET /users/{id}?$select=createdDateTime)
 *    is genuinely recent (e.g. within the last several minutes).
 *    "This profile was never completed" is only a client-side UX heuristic,
 *    not a security guarantee - an existing member who cleared their
 *    browser storage, opened a private window, or signed in on a new
 *    device would look identical from here (profileComplete is only ever
 *    tracked in this browser's localStorage, never on Entra or a backend).
 *    Without that server-side createdDateTime check, this endpoint could be
 *    tricked into deleting a real, long-standing member's account.
 *
 *  - Only then: DELETE https://graph.microsoft.com/v1.0/users/{id}.
 *    Entra soft-deletes for ~30 days (recoverable via the admin center or
 *    POST /directory/deletedItems/{id}/restore), but treat it as a real,
 *    consequential operation regardless.
 *
 * None of that happens here - this only logs what would be sent to that
 * endpoint, and always resolves successfully.
 */
export const deleteAbandonedAccount = (account) => {
    console.log('[MOCK API CALL] DELETE /api/account/me (abandoned signup, never completed a profile)', {
        accountId: account?.homeAccountId,
    });
    return Promise.resolve({ success: true });
};
