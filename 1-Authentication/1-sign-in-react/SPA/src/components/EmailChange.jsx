import { useState } from 'react';
import { Button, Form } from 'react-bootstrap';
import { requestEmailChange, confirmEmailChange } from '../utils/emailChangeStore';

/**
 * Shows the sign-in email (read-only - it's the Entra identity, not a plain
 * profile field) and a "change email" flow. The flow itself is mocked: see
 * emailChangeStore.js for why a real change has to happen server-side via
 * Microsoft Graph, not from this SPA.
 */
export const EmailChange = ({ account, currentEmail, onChanged }) => {
    const [step, setStep] = useState('view'); // 'view' | 'enterEmail' | 'enterCode'
    const [newEmail, setNewEmail] = useState('');
    const [sentCode, setSentCode] = useState('');
    const [enteredCode, setEnteredCode] = useState('');
    const [error, setError] = useState('');

    const handleRequestCode = (e) => {
        e.preventDefault();
        setError('');
        const code = requestEmailChange(account, newEmail);
        setSentCode(code);
        setStep('enterCode');
    };

    const handleConfirm = (e) => {
        e.preventDefault();
        const result = confirmEmailChange(account, enteredCode);
        if (!result.success) {
            setError(result.error);
            return;
        }
        setError('');
        setStep('view');
        setEnteredCode('');
        onChanged(result.newEmail);
    };

    const handleCancel = () => {
        setStep('view');
        setNewEmail('');
        setEnteredCode('');
        setError('');
    };

    return (
        <div className="email-change">
            <div className="email-change-current">
                <strong>Email:</strong> {currentEmail}
                {step === 'view' && (
                    <Button variant="link" className="email-change-link" onClick={() => setStep('enterEmail')}>
                        Change
                    </Button>
                )}
            </div>

            {step === 'enterEmail' && (
                <Form onSubmit={handleRequestCode} className="email-change-form">
                    <Form.Group className="mb-2">
                        <Form.Label>New email address</Form.Label>
                        <Form.Control
                            type="email"
                            value={newEmail}
                            onChange={(e) => setNewEmail(e.target.value)}
                            required
                        />
                    </Form.Group>
                    <div className="email-change-actions">
                        <Button type="button" variant="outline-secondary" size="sm" onClick={handleCancel}>
                            Cancel
                        </Button>
                        <Button type="submit" className="joinButton" size="sm">
                            Send verification code
                        </Button>
                    </div>
                </Form>
            )}

            {step === 'enterCode' && (
                <Form onSubmit={handleConfirm} className="email-change-form">
                    <p className="email-change-demo-note">
                        Demo mode - no email is actually sent. Verification code for {newEmail}: <strong>{sentCode}</strong>
                    </p>
                    <Form.Group className="mb-2">
                        <Form.Label>Enter verification code</Form.Label>
                        <Form.Control
                            value={enteredCode}
                            onChange={(e) => setEnteredCode(e.target.value)}
                            required
                        />
                    </Form.Group>
                    {error && <p className="warningMessage">{error}</p>}
                    <div className="email-change-actions">
                        <Button type="button" variant="outline-secondary" size="sm" onClick={handleCancel}>
                            Cancel
                        </Button>
                        <Button type="submit" className="joinButton" size="sm">
                            Confirm
                        </Button>
                    </div>
                </Form>
            )}
        </div>
    );
};
