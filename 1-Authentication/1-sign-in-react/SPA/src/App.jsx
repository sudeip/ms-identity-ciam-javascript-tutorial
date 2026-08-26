import { useEffect, useRef, useState } from 'react';
import { MsalProvider, AuthenticatedTemplate, useMsal } from '@azure/msal-react';
import { InteractionStatus } from '@azure/msal-browser';
import { Container, Button, Tabs, Tab } from 'react-bootstrap';
import { PageLayout } from './components/PageLayout';
import { IdTokenData, AccessTokenData } from './components/DataDisplay';
import { ProfileCompletion } from './components/ProfileCompletion';
import { EmailChange } from './components/EmailChange';
import { ReservationSignup } from './components/ReservationSignup';
import { decodeJwtClaims, getAccountEmail } from './utils/claimUtils';
import { isProfileComplete, getProfile, saveProfile, maskDriversLicense, maskDateOfBirth } from './utils/profileStore';
import { getConfirmedEmail } from './utils/emailChangeStore';
import {
    getReservationDraft,
    clearReservationDraft,
    submitReservationSignup,
    getReservationContext,
    clearReservationContext,
} from './utils/reservationDraftStore';
import { loginRequest, stepUpAuthRequest, stepUpAuthenticationContext } from './authConfig';

import './styles/App.css';

/**
 * Sign in / Join Banana Club live in the nav flyout (NavigationBar.jsx).
 * This component only renders the authenticated demo content: the
 * step-up (Authentication Context / MFA) button and the ID token claims.
 */
const MainContent = () => {
    /**
     * useMsal is hook that returns the PublicClientApplication instance,
     * that tells you what msal is currently doing. For more, visit:
     * https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/dev/lib/msal-react/docs/hooks.md
     */
    const { instance, inProgress } = useMsal();
    const activeAccount = instance.getActiveAccount();
    // instance.getActiveAccount() returns a new object reference on every call
    // (it isn't memoized), so effects must depend on a stable primitive derived
    // from it - not the object itself - or an effect that calls setState with a
    // freshly-constructed value (getProfile/decodeJwtClaims both return a new
    // object every call) will re-render, which recomputes a "changed" account
    // reference, which re-fires the effect: an infinite loop.
    const activeAccountId = activeAccount?.homeAccountId;
    const idTokenEmail = getAccountEmail(activeAccount);
    const [accessTokenClaims, setAccessTokenClaims] = useState(null);
    const [accessTokenError, setAccessTokenError] = useState(null);
    const [profileComplete, setProfileComplete] = useState(false);
    const [profile, setProfile] = useState(null);
    const [displayEmail, setDisplayEmail] = useState('');

    // Read once at mount, not re-derived - if the user came from "Yes, Sign Me
    // Up" during a reservation (ReservationSignup.jsx), their details are
    // waiting in sessionStorage from before the redirect to Entra.
    const [reservationDraft] = useState(() => getReservationDraft());
    const draftSubmittedRef = useRef(false);
    // Same idea, but for the location/dates they'd picked before starting
    // sign-up - see reservationDraftStore.js for why this needs its own
    // sessionStorage entry rather than a different redirect_uri.
    const [reservationContext] = useState(() => getReservationContext());
    const [reservationWelcomeDismissed, setReservationWelcomeDismissed] = useState(false);

    // Once authenticated, the account now has a real, Entra-verified email -
    // merge it into the pre-auth draft, sync the full profile to the (mocked)
    // backend, and save it locally as "complete" so the post-auth
    // ProfileCompletion gate doesn't ask for the same details a second time.
    // Fires once per mount even if activeAccountId settles across a couple
    // of renders during redirect processing.
    useEffect(() => {
        if (!activeAccountId || !reservationDraft || draftSubmittedRef.current) return;
        draftSubmittedRef.current = true;
        const fullProfile = { ...reservationDraft, mfaOptIn: false, email: idTokenEmail };
        submitReservationSignup(activeAccount, fullProfile).then(() => {
            saveProfile(activeAccount, fullProfile);
            setProfileComplete(true);
            clearReservationDraft();
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeAccountId, reservationDraft, idTokenEmail]);

    // getConfirmedEmail returns a plain string (or null), so this is safe even
    // without extra memoization - re-deriving it here just no-ops if unchanged.
    useEffect(() => {
        setDisplayEmail(getConfirmedEmail(activeAccount) || idTokenEmail);
    }, [activeAccountId, idTokenEmail]); // eslint-disable-line react-hooks/exhaustive-deps

    // Re-checked on every account change (fresh sign-in, reopened tab, etc.) -
    // this is what makes the gate "force it every time" rather than relying on
    // catching a browser-close event, which isn't reliable. See ProfileCompletion.jsx.
    useEffect(() => {
        setProfileComplete(isProfileComplete(activeAccount));
    }, [activeAccountId]); // eslint-disable-line react-hooks/exhaustive-deps

    // Once past the gate, load the saved profile so it can be shown on screen
    // instead of the earlier hardcoded demo license.
    useEffect(() => {
        setProfile(profileComplete ? getProfile(activeAccount) : null);
    }, [profileComplete, activeAccountId]); // eslint-disable-line react-hooks/exhaustive-deps

    /**
     * Requests a token with an Authentication Context (acrs) claim. This forces the
     * request back through Microsoft Entra with the claims challenge attached, which
     * causes any Conditional Access policy scoped to that Authentication Context
     * (e.g. requiring MFA) to be evaluated/enforced before the token is issued.
     */
    const handleStepUpAuth = () => {
        instance
            .acquireTokenRedirect(stepUpAuthRequest)
            .catch((error) => console.log(error));
    };

    // Unlike the ID token, MSAL doesn't decode the access token for you (it's
    // meant to be opaque to the client). Pull one silently from cache/refresh
    // and decode it ourselves so it can be shown next to the ID token claims.
    // Skipped until the profile is complete - nothing to show behind that gate yet.
    useEffect(() => {
        if (!activeAccount || !profileComplete || inProgress !== InteractionStatus.None) return;
        instance
            .acquireTokenSilent({ ...loginRequest, account: activeAccount })
            .then((result) => setAccessTokenClaims(decodeJwtClaims(result.accessToken)))
            .catch((error) => setAccessTokenError(error.message || String(error)));
    }, [instance, activeAccountId, inProgress, profileComplete]); // eslint-disable-line react-hooks/exhaustive-deps

    // Has the Conditional Access step-up (Authentication Context c1 / MFA) already
    // been satisfied for this session? Reflected by the acrs claim on the ID token.
    const acrsClaim = activeAccount?.idTokenClaims?.acrs;
    const stepUpSatisfied = Array.isArray(acrsClaim)
        ? acrsClaim.includes(stepUpAuthenticationContext)
        : acrsClaim === stepUpAuthenticationContext;

    return (
        <AuthenticatedTemplate>
            {activeAccount ? (
                <Container>
                    {!profileComplete && reservationDraft ? (
                        // The sync effect above is about to mark this complete
                        // (it resolves on the next microtask) - avoid a flash
                        // of the modal appearing and immediately disappearing.
                        <p>Setting up your account…</p>
                    ) : !profileComplete ? (
                        <ProfileCompletion
                            account={activeAccount}
                            onComplete={() => setProfileComplete(true)}
                        />
                    ) : reservationContext && !reservationWelcomeDismissed ? (
                        // Restores "you were reserving a car" after the redirect to
                        // Entra and back - same sessionStorage-based state restoration
                        // as the profile draft, not anything tied to the redirect URL.
                        // Reuses the same Driver Details step rather than auto-completing
                        // the reservation - the user still has to click Reserve Now.
                        <ReservationSignup
                            location={reservationContext.location}
                            pickupDate={reservationContext.pickupDate}
                            returnDate={reservationContext.returnDate}
                            onReservationDone={() => {
                                clearReservationContext();
                                setReservationWelcomeDismissed(true);
                            }}
                        />
                    ) : (
                        <>
                            {profile ? (
                                <div className="profile-summary">
                                    <EmailChange
                                        account={activeAccount}
                                        currentEmail={displayEmail}
                                        onChanged={setDisplayEmail}
                                    />
                                    <div>
                                        <strong>Name:</strong> {profile.firstName} {profile.lastName}
                                        {profile.preferredName ? ` (${profile.preferredName})` : ''}
                                    </div>
                                    <div><strong>Phone:</strong> {profile.phone || 'Not provided'}</div>
                                    <div>
                                        <strong>Date of Birth:</strong>{' '}
                                        {stepUpSatisfied ? profile.dob : maskDateOfBirth(profile.dob)}
                                    </div>
                                </div>
                            ) : null}
                            <div className="sensitive-feature-row">
                                <span className="drivers-license">
                                    Driver's License:{' '}
                                    {stepUpSatisfied
                                        ? profile?.driversLicense || 'DL8773233198'
                                        : maskDriversLicense(profile?.driversLicense)}
                                </span>
                                <Button
                                    className="stepUpButton"
                                    onClick={handleStepUpAuth}
                                    variant={stepUpSatisfied ? 'success' : 'danger'}
                                >
                                    {stepUpSatisfied ? 'Sensitive Data now Visible' : 'Access Sensitive Feature (Require MFA)'}
                                </Button>
                            </div>
                            <br />
                            {inProgress === InteractionStatus.None && activeAccount.idTokenClaims ? (
                                <Tabs defaultActiveKey="idToken" className="token-tabs">
                                    <Tab eventKey="idToken" title="ID Token">
                                        <IdTokenData idTokenClaims={activeAccount.idTokenClaims} />
                                    </Tab>
                                    <Tab eventKey="accessToken" title="Access Token">
                                        {accessTokenClaims ? (
                                            <AccessTokenData accessTokenClaims={accessTokenClaims} />
                                        ) : accessTokenError ? (
                                            <p className="warningMessage">Could not load the access token: {accessTokenError}</p>
                                        ) : (
                                            <p>Loading access token…</p>
                                        )}
                                    </Tab>
                                </Tabs>
                            ) : null}
                        </>
                    )}
                </Container>
            ) : null}
        </AuthenticatedTemplate>
    );
};


/**
 * msal-react is built on the React context API and all parts of your app that require authentication must be 
 * wrapped in the MsalProvider component. You will first need to initialize an instance of PublicClientApplication 
 * then pass this to MsalProvider as a prop. All components underneath MsalProvider will have access to the 
 * PublicClientApplication instance via context as well as all hooks and components provided by msal-react. For more, visit:
 * https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/dev/lib/msal-react/docs/getting-started.md
 */
const App = ({ instance }) => {
    return (
        <MsalProvider instance={instance}>
            <PageLayout>
                <MainContent />
            </PageLayout>
        </MsalProvider>
    );
};

export default App;