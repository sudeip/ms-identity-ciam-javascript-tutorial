import { AuthenticatedTemplate } from '@azure/msal-react';

import { NavigationBar } from './NavigationBar.jsx';
import { SearchWidget } from './SearchWidget.jsx';
import heroImage from '../assets/landing/hero.jpg';
import '../styles/Landing.css';

export const PageLayout = (props) => {
    /**
     * Most applications will need to conditionally render certain components based on whether a user is signed in or not.
     * msal-react provides 2 easy ways to do this. AuthenticatedTemplate and UnauthenticatedTemplate components will
     * only render their children if a user is authenticated or unauthenticated, respectively.
     */
    return (
        <>
            <NavigationBar />

            <header className="hero" style={{ backgroundImage: `url(${heroImage})` }}>
                <div className="hero-overlay">
                    <div className="hero-content">
                        <p className="hero-eyebrow">Banana Rental</p>
                        <h1>Find your perfect ride, anywhere.</h1>
                        <p className="hero-subtitle">
                            Fast, affordable car rentals in 500+ cities. Book in minutes, drive in style.
                        </p>
                    </div>
                </div>
                <div className="search-widget-dock">
                    <SearchWidget />
                </div>
            </header>

            {/* Authenticated demo content (step-up MFA button + ID token claims) renders here. */}
            <div className="dashboard-section">{props.children}</div>

            <footer className="site-footer">
                <div className="site-footer-inner">
                    <span>© {new Date().getFullYear()} Banana Rental. All rights reserved.</span>
                    <AuthenticatedTemplate>
                        <a
                            href="https://forms.office.com/Pages/ResponsePage.aspx?id=v4j5cvGGr0GRqy180BHbR_ivMYEeUKlEq8CxnMPgdNZUNDlUTTk2NVNYQkZSSjdaTk5KT1o4V1VVNS4u"
                            rel="noopener noreferrer"
                            target="_blank"
                        >
                            Share your experience!
                        </a>
                    </AuthenticatedTemplate>
                </div>
            </footer>
        </>
    );
}