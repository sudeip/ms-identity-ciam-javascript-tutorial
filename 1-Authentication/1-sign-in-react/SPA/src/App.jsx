import { useEffect, useState } from 'react';
import { MsalProvider, AuthenticatedTemplate, useMsal } from '@azure/msal-react';
import { InteractionStatus } from '@azure/msal-browser';
import { Container, Button, Tabs, Tab } from 'react-bootstrap';
import { PageLayout } from './components/PageLayout';
import { IdTokenData, AccessTokenData } from './components/DataDisplay';
import { decodeJwtClaims } from './utils/claimUtils';
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
    const [accessTokenClaims, setAccessTokenClaims] = useState(null);
    const [accessTokenError, setAccessTokenError] = useState(null);

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
    useEffect(() => {
        if (!activeAccount || inProgress !== InteractionStatus.None) return;
        instance
            .acquireTokenSilent({ ...loginRequest, account: activeAccount })
            .then((result) => setAccessTokenClaims(decodeJwtClaims(result.accessToken)))
            .catch((error) => setAccessTokenError(error.message || String(error)));
    }, [instance, activeAccount, inProgress]);

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
                    <div className="sensitive-feature-row">
                        <span className="drivers-license">
                            Driver's License: {stepUpSatisfied ? 'DL8773233198' : 'XXXXXXXX98'}
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