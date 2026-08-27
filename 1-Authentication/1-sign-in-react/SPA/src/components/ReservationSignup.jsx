import { useEffect, useState } from 'react';
import { AuthenticatedTemplate, UnauthenticatedTemplate, useMsal } from '@azure/msal-react';
import { Button, Form } from 'react-bootstrap';
import { DAYS, MONTHS, YEARS, MINIMUM_AGE, calculateAge } from '../utils/dobUtils';
import { formatPhoneInput, normalizePhone, isValidPhone } from '../utils/phoneUtils';
import { getAccountEmail, sanitizeName } from '../utils/claimUtils';
import { getProfile } from '../utils/profileStore';
import { saveReservationContext, clearReservationContext } from '../utils/reservationDraftStore';
import { loginRequest } from '../authConfig';
import { ReservationSummary } from './ReservationSummary';
import { ProfileCompletion } from './ProfileCompletion';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Shown after "Search Cars" is submitted: collects the guest's basic booking
 * details, then - for a not-yet-signed-in visitor - offers to join the
 * loyalty program. "Yes, Sign Me Up" opens ProfileCompletion in preAuth
 * mode, pre-filled from what's already been typed here - that component
 * owns saving the draft and redirecting to Entra (see its docblock for why
 * email isn't part of that step). Someone already signed in is already a
 * member (or already has an account either way), so that whole prompt - and
 * the "Sign Me Up" button - doesn't apply to them; they just get a single
 * "Reserve Now" action instead.
 *
 * Also reused directly by App.jsx after the Entra redirect (sign-up or
 * login) round-trips back: rather than auto-completing the reservation on
 * return, the user lands back on this same Driver Details step, prefilled,
 * and still has to explicitly click Reserve Now - nothing is finalized
 * without that click. `onReservationDone` is only passed in that case, to
 * let App.jsx clear the restored context and fall back to the normal
 * dashboard once the user is done looking at the confirmation.
 */
export const ReservationSignup = ({ location, pickupDate, returnDate, onReservationDone }) => {
    const { instance } = useMsal();
    const activeAccount = instance.getActiveAccount();
    const activeAccountId = activeAccount?.homeAccountId;
    const isSignedIn = !!activeAccount;
    const claims = activeAccount?.idTokenClaims || {};
    // A saved profile (post-signup) is more authoritative than the raw ID
    // token claims - prefer it when it exists.
    const savedProfile = activeAccount ? getProfile(activeAccount) : null;

    const [form, setForm] = useState(() => ({
        firstName: savedProfile?.firstName || sanitizeName(claims.given_name) || '',
        lastName: savedProfile?.lastName || sanitizeName(claims.family_name) || '',
        dobDay: '',
        dobMonth: '',
        dobYear: '',
        email: getAccountEmail(activeAccount) || '',
        phone: savedProfile?.phone || '',
    }));

    // Same reasoning as ProfileCompletion.jsx: instance.getActiveAccount()
    // returns a new object every call, and this component may already be
    // mounted (the search widget is always on screen) before MSAL finishes
    // populating the account after a fresh sign-in - so the useState
    // initializer above can miss it. Backfill once it settles, without
    // clobbering anything the user already typed.
    useEffect(() => {
        if (!isSignedIn) return;
        const dobParts = savedProfile?.dob ? savedProfile.dob.split('-') : [];
        setForm((prev) => ({
            ...prev,
            firstName: prev.firstName || savedProfile?.firstName || sanitizeName(claims.given_name) || '',
            lastName: prev.lastName || savedProfile?.lastName || sanitizeName(claims.family_name) || '',
            email: prev.email || getAccountEmail(activeAccount) || '',
            phone: prev.phone || savedProfile?.phone || '',
            dobYear: prev.dobYear || dobParts[0] || '',
            dobMonth: prev.dobMonth || dobParts[1] || '',
            dobDay: prev.dobDay || dobParts[2] || '',
        }));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isSignedIn, activeAccountId]);

    const [bookingConfirmed, setBookingConfirmed] = useState(false);
    const [showJoinProfile, setShowJoinProfile] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const handlePhoneChange = (e) => {
        setForm((prev) => ({ ...prev, phone: formatPhoneInput(e.target.value) }));
    };

    // A plain sign-in doesn't have the prompt=create + login_hint conflict
    // that pushed the "Yes, Sign Me Up" flow into the account picker (see
    // ProfileCompletion.jsx / that flow's docblock) - login_hint is safe to
    // pass here, so an already-existing member doesn't have to retype their
    // email on Entra's page.
    const handleLogin = () => {
        saveReservationContext({ location, pickupDate, returnDate });
        const trimmedEmail = form.email.trim();
        const request = EMAIL_PATTERN.test(trimmedEmail) ? { ...loginRequest, loginHint: trimmedEmail } : loginRequest;
        instance.loginRedirect(request).catch((error) => console.log(error));
    };

    const age = calculateAge(form.dobDay, form.dobMonth, form.dobYear);
    const dobTooYoung = age !== null && age < MINIMUM_AGE;

    const detailsComplete =
        form.firstName.trim() !== '' &&
        form.lastName.trim() !== '' &&
        form.dobDay &&
        form.dobMonth &&
        form.dobYear &&
        !dobTooYoung &&
        EMAIL_PATTERN.test(form.email.trim()) &&
        (form.phone.trim() === '' || isValidPhone(form.phone));

    if (bookingConfirmed) {
        return (
            <div className="reservation-layout">
                <ReservationSummary location={location} pickupDate={pickupDate} returnDate={returnDate} />
                <div className="reservation-confirmation">
                    <svg width="48" height="48" viewBox="0 0 24 24" className="reservation-confirmation-icon">
                        <circle cx="12" cy="12" r="11" fill="var(--brand-green)" />
                        <path
                            d="m7 12.5 3.2 3.2L17 9"
                            fill="none"
                            stroke="#fff"
                            strokeWidth="2.2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                    <h3>Your car is reserved!</h3>
                    <p>
                        Thanks, {form.firstName || 'guest'} - a confirmation would normally be sent to {form.email}.
                    </p>
                    <p className="reservation-confirmation-demo-note">
                        Demo note: this app only wires up sign-in/sign-up - there's no real booking backend behind
                        this confirmation.
                    </p>
                    {onReservationDone && isSignedIn && (
                        <Button className="joinButton" onClick={onReservationDone}>
                            Continue to My Account
                        </Button>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="reservation-layout">
            <ReservationSummary location={location} pickupDate={pickupDate} returnDate={returnDate} />
            <div className="reservation-signup">
                <ol className="reservation-steps">
                    <li className="reservation-step reservation-step-done">Location &amp; Dates</li>
                    <li className="reservation-step reservation-step-done">Vehicle</li>
                    <li className="reservation-step reservation-step-done">Extras</li>
                    <li className="reservation-step reservation-step-current">Driver Details</li>
                </ol>
                <h3>Driver Details</h3>
                <p className="reservation-signup-subhead">
                    This demo doesn't have real vehicle selection or add-ons - imagine you already picked those.
                </p>
                {isSignedIn && (
                    <p className="draft-prefill-note">
                        We've filled in your name and email from your Banana Club account - they're locked since
                        they're already verified.
                    </p>
                )}
                <div className="reservation-signup-grid">
                    <Form.Group className="mb-3">
                        <Form.Label>First name *</Form.Label>
                        <Form.Control
                            name="firstName"
                            value={form.firstName}
                            onChange={handleChange}
                            required
                            disabled={isSignedIn}
                        />
                    </Form.Group>
                    <Form.Group className="mb-3">
                        <Form.Label>Last name *</Form.Label>
                        <Form.Control
                            name="lastName"
                            value={form.lastName}
                            onChange={handleChange}
                            required
                            disabled={isSignedIn}
                        />
                    </Form.Group>
                    <Form.Group className="mb-3">
                        <Form.Label>Email *</Form.Label>
                        <Form.Control
                            name="email"
                            type="email"
                            value={form.email}
                            onChange={handleChange}
                            required
                            disabled={isSignedIn}
                        />
                    </Form.Group>
                    <Form.Group className="mb-3">
                        <Form.Label>Phone <em className="optional-label">(Optional)</em></Form.Label>
                        <Form.Control name="phone" type="tel" value={form.phone} onChange={handlePhoneChange} placeholder="(555) 123-4567" />
                    </Form.Group>
                </div>

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
                        <Form.Select name="dobYear" value={form.dobYear} onChange={handleChange} required>
                            <option value="" disabled>YYYY</option>
                            {YEARS.map((y) => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </Form.Select>
                    </div>
                    {dobTooYoung && <p className="warningMessage">You must be at least {MINIMUM_AGE} years old to rent a car.</p>}
                </Form.Group>

                <UnauthenticatedTemplate>
                    <div className="loyalty-optin">
                        <p className="loyalty-optin-question">Want to earn points on this trip?</p>
                        <p className="loyalty-optin-subtext">
                            Join Banana Club free - we'll save these details and get you signed up in seconds.
                            You'll only need to set a password.
                        </p>
                        <div className="loyalty-optin-actions">
                            <Button
                                type="button"
                                variant="outline-secondary"
                                disabled={!detailsComplete}
                                onClick={() => setBookingConfirmed(true)}
                            >
                                Continue as Guest
                            </Button>
                            <Button
                                type="button"
                                className="joinButton"
                                onClick={() => {
                                    // Not gated on detailsComplete like the other two buttons here -
                                    // whatever's filled in gets carried over as a prefill, but
                                    // ProfileCompletion (preAuth) collects and validates everything
                                    // itself, so there's nothing this form needs to enforce first.
                                    saveReservationContext({ location, pickupDate, returnDate });
                                    setShowJoinProfile(true);
                                }}
                            >
                                Yes, Sign Me Up
                            </Button>
                            <Button type="button" variant="outline-secondary" onClick={handleLogin}>
                                Login
                            </Button>
                        </div>
                        <p className="loyalty-optin-login-note">Already a member? Login instead - no need to fill out the form above.</p>
                    </div>
                </UnauthenticatedTemplate>
                <AuthenticatedTemplate>
                    <div className="loyalty-optin-actions">
                        <Button
                            type="button"
                            className="joinButton"
                            disabled={!detailsComplete}
                            onClick={() => setBookingConfirmed(true)}
                        >
                            Reserve Now
                        </Button>
                    </div>
                </AuthenticatedTemplate>
            </div>

            {showJoinProfile && (
                <ProfileCompletion
                    mode="preAuth"
                    draftPrefill={{
                        firstName: form.firstName.trim(),
                        lastName: form.lastName.trim(),
                        dob: `${form.dobYear}-${form.dobMonth}-${form.dobDay}`,
                        phone: form.phone.trim() ? normalizePhone(form.phone) : '',
                    }}
                    onCancel={() => {
                        clearReservationContext();
                        setShowJoinProfile(false);
                    }}
                />
            )}
        </div>
    );
};
