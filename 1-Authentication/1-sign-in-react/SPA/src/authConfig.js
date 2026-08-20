/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { LogLevel } from '@azure/msal-browser';

/**
 * Configuration object to be passed to MSAL instance on creation. 
 * For a full list of MSAL.js configuration parameters, visit:
 * https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/dev/lib/msal-browser/docs/configuration.md 
 */

export const msalConfig = {
    auth: {
        clientId: 'a9c3ed42-c649-4ad4-b003-43ec0f35d44d', // This is the ONLY mandatory field that you need to supply.
        authority: 'https://bsccustomers.ciamlogin.com/', // Replace the placeholder with your tenant subdomain 
        redirectUri: 'http://localhost:3000/redirect', // Points to window.location.origin. You must register this URI on Microsoft Entra admin center/App Registration.
        postLogoutRedirectUri: '/', // Indicates the page to navigate after logout.
        navigateToLoginRequestUrl: false, // If "true", will navigate back to the original request location before processing the auth code response.
    },
    cache: {
        cacheLocation: 'sessionStorage', // Configures cache location. "sessionStorage" is more secure, but "localStorage" gives you SSO between tabs.
        storeAuthStateInCookie: false, // Set this to "true" if you are having issues on IE11 or Edge
    },
    system: {
        loggerOptions: {
            loggerCallback: (level, message, containsPii) => {
                if (containsPii) {
                    return;
                }
                switch (level) {
                    case LogLevel.Error:
                        console.error(message);
                        return;
                    case LogLevel.Info:
                        console.info(message);
                        return;
                    case LogLevel.Verbose:
                        console.debug(message);
                        return;
                    case LogLevel.Warning:
                        console.warn(message);
                        return;
                    default:
                        return;
                }
            },
        },
    },
};

/**
 * Scopes you add here will be prompted for user consent during sign-in.
 * By default, MSAL.js will add OIDC scopes (openid, profile, email) to any login request.
 * For more information about OIDC scopes, visit: 
 * https://docs.microsoft.com/en-us/azure/active-directory/develop/v2-permissions-and-consent#openid-connect-scopes
 */
export const loginRequest = {
    scopes: ["api://bsc-api/web"],
};

/**
 * Same request, but with prompt: 'create' so Entra routes the user through
 * sign-up instead of sign-in. Used by the "Join Banana Club" action.
 */
export const joinRequest = {
    ...loginRequest,
    prompt: 'create',
};

/**
 * Claims request used to demand a specific Authentication Context Class Reference (ACRS)
 * on the access token. Conditional Access policies can be scoped to an Authentication Context
 * (e.g. "c1") in the Microsoft Entra admin center; when this claim is requested, CA will
 * evaluate that policy and can force step-up authentication (e.g. MFA) before the token is issued.
 *
 * Replace "c1" with the Authentication Context ID you configured for the CA policy you want to trigger.
 */
export const stepUpAuthenticationContext = "c1";

export const stepUpAuthRequest = {
    ...loginRequest,
    claims: JSON.stringify({
        access_token: {
            acrs: { essential: true, value: stepUpAuthenticationContext },
        },
    }),
};

/**
 * An optional silentRequest object can be used to achieve silent SSO
 * between applications by providing a "login_hint" property.
 */
// export const silentRequest = {
//     scopes: ["openid", "profile"],
//     loginHint: "example@domain.net"
// };
