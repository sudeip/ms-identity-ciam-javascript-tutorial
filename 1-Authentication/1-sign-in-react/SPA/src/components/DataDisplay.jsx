import { Table } from 'react-bootstrap';
import { createClaimsTable } from '../utils/claimUtils';

import '../styles/App.css';

/**
 * Renders a claims table for any decoded token (ID token or access token).
 * The acrs row (Authentication Context / step-up MFA claim) is highlighted
 * since it's the claim this whole demo revolves around.
 */
const ClaimsTable = ({ claims, tokenLabel, docsUrl }) => {
    const tokenClaims = createClaimsTable(claims);

    const tableRow = Object.keys(tokenClaims).map((key) => {
        const [claimName, value, description] = tokenClaims[key];
        return (
            <tr key={key} className={claimName === 'acrs' ? 'claim-row-highlight' : undefined}>
                <td>{claimName}</td>
                <td>{value}</td>
                <td>{description}</td>
            </tr>
        );
    });

    return (
        <div className="data-area-div">
            <p>
                See below the claims in your <strong>{tokenLabel}</strong>. For more information, visit:{' '}
                <span>
                    <a href={docsUrl}>docs.microsoft.com</a>
                </span>
            </p>
            <div className="data-area-div">
                <Table responsive striped bordered hover>
                    <thead>
                        <tr>
                            <th>Claim</th>
                            <th>Value</th>
                            <th>Description</th>
                        </tr>
                    </thead>
                    <tbody>{tableRow}</tbody>
                </Table>
            </div>
        </div>
    );
};

export const IdTokenData = ({ idTokenClaims }) => (
    <ClaimsTable
        claims={idTokenClaims}
        tokenLabel="ID token"
        docsUrl="https://docs.microsoft.com/en-us/azure/active-directory/develop/id-tokens#claims-in-an-id-token"
    />
);

export const AccessTokenData = ({ accessTokenClaims }) => (
    <ClaimsTable
        claims={accessTokenClaims}
        tokenLabel="access token"
        docsUrl="https://learn.microsoft.com/en-us/entra/identity-platform/access-tokens#claims-in-an-access-token"
    />
);