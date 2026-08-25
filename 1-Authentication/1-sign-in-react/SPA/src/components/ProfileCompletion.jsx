import { useEffect, useRef, useState } from 'react';
import { useMsal } from '@azure/msal-react';
import { Button, Form, Modal } from 'react-bootstrap';
import { saveProfile } from '../utils/profileStore';
import { getAccountEmail } from '../utils/claimUtils';
import profileHeaderLogo from '../assets/landing/profile-header-logo.png';

const DAYS = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0'));
const MONTHS = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 100 }, (_, i) => String(CURRENT_YEAR - i));
const MINIMUM_AGE = 21;
const DEFAULT_COUNTRY_CODE = '1';

/**
 * Formats phone input as the user types. If they've typed a leading "+",
 * treat it as an explicit international number and just keep the digits
 * (too many country-specific grouping formats to guess at). Otherwise,
 * assume a US number and format it as (XXX) XXX-XXXX as they type.
 */
const formatPhoneInput = (raw) => {
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
const normalizePhone = (value) => {
    const hasPlus = value.trim().startsWith('+');
    const digits = value.replace(/\D/g, '');
    return hasPlus ? `+${digits}` : `+${DEFAULT_COUNTRY_CODE}${digits}`;
};

/** +1 numbers get a strict 10-digit check; other country codes get a looser E.164-shaped check. */
const isValidPhone = (value) => {
    if (!value.trim()) return false;
    const normalized = normalizePhone(value);
    if (normalized.startsWith('+1')) return /^\+1\d{10}$/.test(normalized);
    return /^\+[1-9]\d{7,14}$/.test(normalized);
};

/**
 * Whole-years age as of today, accounting for whether the birthday has
 * happened yet this year - not just a year subtraction.
 */
const calculateAge = (day, month, year) => {
    if (!day || !month || !year) return null;
    const dob = new Date(Number(year), Number(month) - 1, Number(day));
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const hadBirthdayThisYear =
        today.getMonth() > dob.getMonth() || (today.getMonth() === dob.getMonth() && today.getDate() >= dob.getDate());
    if (!hadBirthdayThisYear) age -= 1;
    return age;
};

/**
 * Blocking modal that gates access to the reservation/demo content until the
 * user finishes a minimal profile. There's no reliable browser event to
 * catch "the user closed the tab" and run an async sign-out in response, so
 * we don't try - instead:
 *   - nothing is saved until Submit, so this reappears on every login until
 *     it succeeds (the actual gating happens in App.jsx via isProfileComplete)
 *   - the modal can't be dismissed via backdrop click, Esc, or a close
 *     button - "Cancel & sign out" (a real, reliable in-app action) is the
 *     only way out, so a user never ends up signed in with a half-finished
 *     profile.
 */
export const ProfileCompletion = ({ account, onComplete }) => {
    const { instance } = useMsal();
    const email = getAccountEmail(account);
    const claims = account?.idTokenClaims || {};

    // Some social/federated identity providers hand back the literal string
    // "unknown" instead of omitting the claim when they don't actually have a
    // name for the user - show a blank field instead of that placeholder.
    const sanitizeName = (value) => (typeof value === 'string' && value.trim().toLowerCase() !== 'unknown' ? value.trim() : '');
    const safeGivenName = sanitizeName(claims.given_name);
    const safeFamilyName = sanitizeName(claims.family_name);
    const safeDisplayName = sanitizeName(claims.name);
    const safeAccountName = sanitizeName(account?.name);
    const nameFallbackParts = safeDisplayName.split(' ').filter(Boolean);

    const [form, setForm] = useState(() => ({
        firstName: safeGivenName || nameFallbackParts[0] || '',
        lastName: safeFamilyName || nameFallbackParts.slice(1).join(' ') || '',
        preferredName: safeAccountName || safeDisplayName || '',
        phone: '',
        dobDay: '',
        dobMonth: '',
        dobYear: '',
        termsAccepted: false,
        mfaOptIn: false,
    }));

    // The useState initializer above only runs once, at first mount. If the
    // modal opens before MSAL has finished populating given_name/family_name
    // on the account (a timing race right after sign-up/sign-in), those
    // fields capture blank and never get a second chance - this component
    // stays mounted even as the parent later re-renders with a fuller
    // account object. This backfills them once the claims actually arrive,
    // without clobbering anything the user has already typed.
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
        const { dobDay, dobMonth, dobYear, ...rest } = form;
        saveProfile(account, { ...rest, dob: `${dobYear}-${dobMonth}-${dobDay}`, phone: normalizePhone(form.phone) });
        onComplete();
    };

    const handleCancel = () => {
        instance.logoutRedirect().catch((error) => console.log(error));
    };

    return (
        <Modal show backdrop="static" keyboard={false} onHide={handleCancel} centered className="profile-completion-modal">
            <Form onSubmit={handleSubmit}>
                <Modal.Header className="profile-completion-header">
                    <img src={profileHeaderLogo} alt="Banana Rental" className="profile-header-logo" />
                    <Modal.Title>Complete your profile</Modal.Title>
                    <div className="profile-loyalty-perks">
                        <span className="perk-badge">Earn &amp; Redeem points</span>
                        <span className="perk-badge">5% off discount offer</span>
                    </div>
                </Modal.Header>
                <Modal.Body>
                    <p className="signed-in-as">
                        Signed in as: <strong>{email}</strong>
                    </p>

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
                        <Form.Check
                            type="checkbox"
                            label="Enroll in MFA using this phone number"
                            checked={form.mfaOptIn}
                            onChange={handleMfaOptInChange}
                            className="mfa-optin-check"
                        />
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
                </Modal.Body>
                <Modal.Footer>
                    <Button type="button" variant="outline-secondary" onClick={handleCancel}>
                        Cancel &amp; Sign Out
                    </Button>
                    <Button type="submit" className="joinButton">
                        Update profile and continue
                    </Button>
                </Modal.Footer>
            </Form>
        </Modal>
    );
};
