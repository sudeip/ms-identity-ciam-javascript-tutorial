import { useEffect, useRef, useState } from 'react';
import { useMsal } from '@azure/msal-react';
import { Button, Form, Modal } from 'react-bootstrap';
import { saveProfile } from '../utils/profileStore';
import { getAccountEmail, sanitizeName } from '../utils/claimUtils';
import { DAYS, MONTHS, YEARS, MINIMUM_AGE, calculateAge } from '../utils/dobUtils';
import { formatPhoneInput, normalizePhone, isValidPhone } from '../utils/phoneUtils';
import { saveReservationDraft, clearReservationDraft, clearReservationContext } from '../utils/reservationDraftStore';
import { deleteAbandonedAccount } from '../utils/accountDeletionStore';
import { joinRequest } from '../authConfig';
import profileHeaderLogo from '../assets/landing/profile-header-logo.png';

/**
 * Collects the loyalty profile - First/Last/Preferred Name, DOB, Phone,
 * terms acceptance - in one of two modes:
 *
 *   - `postAuth` (default): the blocking gate shown after sign-in for anyone
 *     without a saved profile yet. Email is already known (from the ID
 *     token) and shown read-only. Submitting saves straight to the profile
 *     store. Can't be dismissed except via "Cancel & Sign Out" - there's no
 *     reliable browser event to catch "the user closed the tab" and run an
 *     async sign-out in response, so nothing is saved until Submit instead,
 *     and this just reappears on every login until it succeeds. Cancelling
 *     out of this gate also cleans up the Entra account that was just
 *     created for it (see accountDeletionStore.js) - reaching this gate
 *     unfinished only happens for a brand-new signup that never completed a
 *     profile, so there's nothing worth keeping behind. The UI doesn't spell
 *     that out; it just warns that cancelling means starting over.
 *
 *   - `preAuth`: shown *before* Entra account creation, from the "Join
 *     Banana Club" nav flyout and the reservation "Yes, Sign Me Up" step.
 *     No email field here on purpose - Entra collects and verifies the
 *     email itself during sign-up, so asking for it twice (and before it's
 *     verified) doesn't make sense. Submitting saves the details to
 *     sessionStorage (reservationDraftStore.js) and redirects to Entra's
 *     hosted sign-up page; App.jsx picks the draft back up on return and
 *     saves the real profile once the verified email is known. Freely
 *     dismissable (backdrop/Esc/Cancel) since there's no auth session yet
 *     to leave dangling.
 */
export const ProfileCompletion = ({ account, onComplete, onCancel, draftPrefill, mode = 'postAuth' }) => {
    const { instance } = useMsal();
    const isPreAuth = mode === 'preAuth';
    const email = getAccountEmail(account);
    const claims = account?.idTokenClaims || {};

    const safeGivenName = sanitizeName(claims.given_name);
    const safeFamilyName = sanitizeName(claims.family_name);
    const safeDisplayName = sanitizeName(claims.name);
    const safeAccountName = sanitizeName(account?.name);
    const nameFallbackParts = safeDisplayName.split(' ').filter(Boolean);

    // If the user already gave us these details (reservation guest form, or
    // a retry of this same form), that's fresher and more authoritative than
    // whatever the ID token happens to carry - prefer it.
    const [draftYear, draftMonth, draftDay] = draftPrefill?.dob ? draftPrefill.dob.split('-') : [];
    // draftPrefill is always an object when passed (ReservationSignup no
    // longer requires its form to be complete before opening this), so its
    // mere presence isn't enough to say "we pre-filled something" - only show
    // that note when at least one field actually has content.
    const hasDraftPrefillData = !!(
        draftPrefill &&
        (draftPrefill.firstName || draftPrefill.lastName || draftPrefill.phone || draftYear || draftMonth || draftDay)
    );

    const [form, setForm] = useState(() => ({
        firstName: draftPrefill?.firstName || safeGivenName || nameFallbackParts[0] || '',
        lastName: draftPrefill?.lastName || safeFamilyName || nameFallbackParts.slice(1).join(' ') || '',
        preferredName: draftPrefill?.preferredName || safeAccountName || safeDisplayName || '',
        phone: draftPrefill?.phone || '',
        dobDay: draftDay || '',
        dobMonth: draftMonth || '',
        dobYear: draftYear || '',
        termsAccepted: false,
        mfaOptIn: false,
    }));

    // The useState initializer above only runs once, at first mount. If the
    // modal opens before MSAL has finished populating given_name/family_name
    // on the account (a timing race right after sign-up/sign-in), those
    // fields capture blank and never get a second chance - this component
    // stays mounted even as the parent later re-renders with a fuller
    // account object. This backfills them once the claims actually arrive,
    // without clobbering anything the user has already typed. No-op in
    // preAuth mode - there's no account/claims yet.
    useEffect(() => {
        const latestFirst = safeGivenName || nameFallbackParts[0] || '';
        const latestLast = safeFamilyName || nameFallbackParts.slice(1).join(' ') || '';
        const latestPreferred = safeAccountName || safeDisplayName || '';
        setForm((prev) => ({
            ...prev,
            firstName: prev.firstName || latestFirst,
            lastName: prev.lastName || latestLast,
            preferredName: prev.preferredName || latestPreferred,
        }));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [safeGivenName, safeFamilyName, safeDisplayName, safeAccountName]);

    const dobYearRef = useRef(null);
    const age = calculateAge(form.dobDay, form.dobMonth, form.dobYear);
    const dobTooYoung = age !== null && age < MINIMUM_AGE;

    // Ties the age check into the same native validation flow as the required
    // fields (blocks submit, shows the browser's own tooltip) rather than only
    // catching it in handleSubmit.
    useEffect(() => {
        if (!dobYearRef.current) return;
        dobYearRef.current.setCustomValidity(dobTooYoung ? `You must be at least ${MINIMUM_AGE} years old.` : '');
    }, [dobTooYoung]);

    const phoneRef = useRef(null);
    const [phoneTouched, setPhoneTouched] = useState(false);
    const phoneInvalid = phoneTouched && form.phone.trim() !== '' && !isValidPhone(form.phone);

    // Validated on blur, not on every keystroke, so the field doesn't nag the
    // user with an error while they're still mid-way through typing.
    useEffect(() => {
        if (!phoneRef.current) return;
        phoneRef.current.setCustomValidity(phoneInvalid ? 'Enter a valid phone number.' : '');
    }, [phoneInvalid]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const handlePhoneChange = (e) => {
        const formatted = formatPhoneInput(e.target.value);
        setForm((prev) => ({ ...prev, phone: formatted }));
    };

    const handlePhoneBlur = () => setPhoneTouched(true);

    const handleTermsChange = (e) => {
        setForm((prev) => ({ ...prev, termsAccepted: e.target.checked }));
    };

    const handleMfaOptInChange = (e) => {
        setForm((prev) => ({ ...prev, mfaOptIn: e.target.checked }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (dobTooYoung || !isValidPhone(form.phone)) return;
        const { dobDay, dobMonth, dobYear, mfaOptIn, ...rest } = form;
        const profileData = { ...rest, dob: `${dobYear}-${dobMonth}-${dobDay}`, phone: normalizePhone(form.phone) };

        if (isPreAuth) {
            // Nothing to save to a profile yet - there's no account. Stash it
            // and go create one; App.jsx finishes the save on return once the
            // verified email is known.
            saveReservationDraft(profileData);
            instance.loginRedirect(joinRequest).catch((error) => console.log(error));
            return;
        }

        saveProfile(account, { ...profileData, mfaOptIn });
        onComplete();
    };

    const handleCancel = () => {
        if (isPreAuth) {
            onCancel?.();
            return;
        }
        // Reaching this gate at all means profileComplete was false - i.e. no
        // one has ever finished this step for this account. That's the best
        // signal this client has, but it's only a UX heuristic, not proof the
        // account is actually brand-new (see accountDeletionStore.js for why
        // a real implementation must re-verify account age via Graph on the
        // backend before actually deleting anything). Clean up any leftover
        // draft/reservation context too, since neither should follow into
        // whatever session comes next.
        clearReservationDraft();
        clearReservationContext();
        deleteAbandonedAccount(account).finally(() => {
            instance.logoutRedirect().catch((error) => console.log(error));
        });
    };

    return (
        <Modal
            show
            backdrop={isPreAuth ? true : 'static'}
            keyboard={isPreAuth}
            onHide={handleCancel}
            centered
            className="profile-completion-modal"
        >
            <Form onSubmit={handleSubmit}>
                <Modal.Header className="profile-completion-header">
                    <img src={profileHeaderLogo} alt="Banana Rental" className="profile-header-logo" />
                    <Modal.Title>{isPreAuth ? 'Join Banana Club' : 'Complete your profile'}</Modal.Title>
                    <div className="profile-loyalty-perks">
                        <span className="perk-badge">Earn &amp; Redeem points</span>
                        <span className="perk-badge">5% off discount offer</span>
                    </div>
                </Modal.Header>
                <Modal.Body>
                    {isPreAuth ? (
                        <p className="signed-in-as">
                            You'll set your email and create a password with Microsoft on the next step.
                        </p>
                    ) : (
                        <p className="signed-in-as">
                            Signed in as: <strong>{email}</strong>
                        </p>
                    )}
                    {hasDraftPrefillData && (
                        <p className="draft-prefill-note">
                            We've pre-filled this from what you already gave us - just double check it and accept the terms below.
                        </p>
                    )}

                    <div className="name-row">
                        <Form.Group className="mb-1">
                            <Form.Label>First Name *</Form.Label>
                            <Form.Control name="firstName" value={form.firstName} onChange={handleChange} required />
                        </Form.Group>
                        <Form.Group className="mb-1">
                            <Form.Label>Last Name *</Form.Label>
                            <Form.Control name="lastName" value={form.lastName} onChange={handleChange} required />
                        </Form.Group>
                    </div>
                    <p className="name-match-note">Make sure these match your Drivers License</p>

                    <Form.Group className="mb-3">
                        <Form.Label>Preferred Name <em className="optional-label">(Optional)</em></Form.Label>
                        <Form.Control name="preferredName" value={form.preferredName} onChange={handleChange} />
                    </Form.Group>

                    <Form.Group className="mb-3">
                        <Form.Label>Date of birth *</Form.Label>
                        <div className="dob-row">
                            <Form.Select name="dobDay" value={form.dobDay} onChange={handleChange} required>
                                <option value="" disabled>DD</option>
                                {DAYS.map((d) => (
                                    <option key={d} value={d}>{d}</option>
                                ))}
                            </Form.Select>
                            <Form.Select name="dobMonth" value={form.dobMonth} onChange={handleChange} required>
                                <option value="" disabled>MM</option>
                                {MONTHS.map((m) => (
                                    <option key={m} value={m}>{m}</option>
                                ))}
                            </Form.Select>
                            <Form.Select name="dobYear" value={form.dobYear} onChange={handleChange} required ref={dobYearRef}>
                                <option value="" disabled>YYYY</option>
                                {YEARS.map((y) => (
                                    <option key={y} value={y}>{y}</option>
                                ))}
                            </Form.Select>
                        </div>
                        {dobTooYoung && (
                            <p className="warningMessage">You must be at least {MINIMUM_AGE} years old to complete this profile.</p>
                        )}
                    </Form.Group>

                    {!isPreAuth && (
                        <Form.Group className="mb-3">
                            <Form.Label>Email</Form.Label>
                            <div className="email-field-row">
                                <Form.Control value={email} disabled className="email-field-input" />
                                <span className="verified-badge">
                                    <svg width="20" height="20" viewBox="0 0 24 24">
                                        <circle cx="12" cy="12" r="10" fill="var(--brand-green)" />
                                        <path
                                            d="m8 12.5 2.5 2.5L16 9.5"
                                            fill="none"
                                            stroke="#fff"
                                            strokeWidth="2.5"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                    </svg>
                                    Verified
                                </span>
                            </div>
                        </Form.Group>
                    )}

                    <Form.Group className="mb-3">
                        <Form.Label>Phone Number *</Form.Label>
                        <Form.Control
                            name="phone"
                            type="tel"
                            placeholder="(555) 123-4567 or +44 20 7946 0958"
                            value={form.phone}
                            onChange={handlePhoneChange}
                            onBlur={handlePhoneBlur}
                            required
                            ref={phoneRef}
                        />
                        <p className="phone-consent-note">
                            No country code? We'll default to +1 (US). By providing your number, you agree to receive
                            text messages. Message and data rates may apply.
                        </p>
                        {!isPreAuth && (
                            <Form.Check
                                type="checkbox"
                                label="Enroll in MFA using this phone number"
                                checked={form.mfaOptIn}
                                onChange={handleMfaOptInChange}
                                className="mfa-optin-check"
                            />
                        )}
                    </Form.Group>

                    <Form.Group className="mb-3">
                        <Form.Check
                            type="checkbox"
                            label="I've read terms and conditions *"
                            checked={form.termsAccepted}
                            onChange={handleTermsChange}
                            required
                        />
                    </Form.Group>

                    <p className="profile-completion-required-note">* required to complete your profile</p>
                    {!isPreAuth && (
                        <p className="cancel-warning-note">
                            If you cancel now, you'll need to create your account again next time.
                        </p>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button type="button" variant="outline-secondary" onClick={handleCancel}>
                        {isPreAuth ? 'Cancel' : 'Cancel & Sign Out'}
                    </Button>
                    <Button type="submit" className="joinButton">
                        {isPreAuth ? 'Continue to Create Account' : 'Update profile and continue'}
                    </Button>
                </Modal.Footer>
            </Form>
        </Modal>
    );
};
