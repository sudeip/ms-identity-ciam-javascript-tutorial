import { forwardRef, useState } from 'react';
import { AuthenticatedTemplate, UnauthenticatedTemplate, useMsal } from '@azure/msal-react';
import { Navbar, Button, Dropdown } from 'react-bootstrap';
import { loginRequest, joinRequest } from '../authConfig';
import navLogo from '../assets/landing/nav_logo.png';

const LANGUAGES = ['EN', 'ES', 'FR'];
const CURRENCIES = ['USD', 'EUR', 'GBP'];

// Custom dropdown toggle so we control the button's look instead of Bootstrap's default caret button.
const FlyoutToggle = forwardRef(({ onClick }, ref) => (
    <button
        ref={ref}
        className="btn-outline-gold flyout-toggle"
        onClick={(e) => {
            e.preventDefault();
            onClick(e);
        }}
    >
        Sign In / Join Banana Club <span className="flyout-caret" />
    </button>
));

const UtilityToggle = forwardRef(({ onClick, children }, ref) => (
    <button
        ref={ref}
        className="utility-link utility-toggle"
        onClick={(e) => {
            e.preventDefault();
            onClick(e);
        }}
    >
        {children} <span className="flyout-caret" />
    </button>
));

export const NavigationBar = () => {
    const { instance } = useMsal();
    const [language, setLanguage] = useState('EN');
    const [currency, setCurrency] = useState('USD');
    const [flyoutOpen, setFlyoutOpen] = useState(false);

    const handleLoginRedirect = () => {
        instance.loginRedirect(loginRequest).catch((error) => console.log(error));
    };

    const handleJoinRedirect = () => {
        instance.loginRedirect(joinRequest).catch((error) => console.log(error));
    };

    const handleLogoutRedirect = () => {
        instance.logoutRedirect().catch((error) => console.log(error));
    };

    /**
     * Most applications will need to conditionally render certain components based on whether a user is signed in or not.
     * msal-react provides 2 easy ways to do this. AuthenticatedTemplate and UnauthenticatedTemplate components will
     * only render their children if a user is authenticated or unauthenticated, respectively.
     */
    return (
        <>
            {/* Utility bar: locations / language / currency / help. Language and currency
                selectors only change the displayed label here - there's no i18n or
                localized pricing wired up behind them in this demo. */}
            <div className="utility-bar">
                <a className="utility-link" href="#pickupLocation">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21Z" />
                        <circle cx="12" cy="9.5" r="2.25" />
                    </svg>
                    Find a Location
                </a>
                <div className="utility-bar-right">
                    <Dropdown onSelect={(k) => setLanguage(k)}>
                        <Dropdown.Toggle as={UtilityToggle}>{language}</Dropdown.Toggle>
                        <Dropdown.Menu className="utility-menu">
                            {LANGUAGES.map((l) => (
                                <Dropdown.Item key={l} eventKey={l}>{l}</Dropdown.Item>
                            ))}
                        </Dropdown.Menu>
                    </Dropdown>
                    <Dropdown onSelect={(k) => setCurrency(k)}>
                        <Dropdown.Toggle as={UtilityToggle}>{currency}</Dropdown.Toggle>
                        <Dropdown.Menu className="utility-menu">
                            {CURRENCIES.map((c) => (
                                <Dropdown.Item key={c} eventKey={c}>{c}</Dropdown.Item>
                            ))}
                        </Dropdown.Menu>
                    </Dropdown>
                    <a className="utility-link" href="mailto:support@bananarental.example">
                        Help
                    </a>
                </div>
            </div>

            <Navbar className="brand-navbar" variant="dark">
                <a className="brand-navbar-logo" href="/">
                    <img src={navLogo} alt="Banana Rental" height="32" />
                </a>
                <AuthenticatedTemplate>
                    <div className="collapse navbar-collapse justify-content-end">
                        <Button className="btn-outline-gold" onClick={handleLogoutRedirect}>
                            Sign out
                        </Button>
                    </div>
                </AuthenticatedTemplate>
                <UnauthenticatedTemplate>
                    <div className="collapse navbar-collapse justify-content-end">
                        <Dropdown
                            align="end"
                            show={flyoutOpen}
                            onToggle={(isOpen) => setFlyoutOpen(isOpen)}
                            onMouseEnter={() => setFlyoutOpen(true)}
                            onMouseLeave={() => setFlyoutOpen(false)}
                        >
                            <Dropdown.Toggle as={FlyoutToggle} />
                            <Dropdown.Menu className="flyout-menu">
                                <Button className="signInButton flyout-btn" onClick={handleLoginRedirect}>
                                    Sign In
                                </Button>
                                <Button className="joinButton flyout-btn" onClick={handleJoinRedirect}>
                                    Join Banana Club
                                </Button>
                            </Dropdown.Menu>
                        </Dropdown>
                    </div>
                </UnauthenticatedTemplate>
            </Navbar>
        </>
    );
};