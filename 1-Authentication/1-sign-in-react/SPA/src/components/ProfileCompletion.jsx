import { useState } from 'react';
import { useMsal } from '@azure/msal-react';
import { Button, Form, Modal } from 'react-bootstrap';
import { saveProfile } from '../utils/profileStore';

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
    const [form, setForm] = useState(() => ({
        fullName: account?.name || account?.idTokenClaims?.name || '',
        phone: '',
        driversLicense: '',
        dob: '',
    }));

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        saveProfile(account, form);
        onComplete();
    };

    const handleCancel = () => {
        instance.logoutRedirect().catch((error) => console.log(error));
    };

    return (
        <Modal show backdrop="static" keyboard={false} onHide={handleCancel} centered className="profile-completion-modal">
            <Form onSubmit={handleSubmit}>
                <Modal.Header>
                    <Modal.Title>Complete your profile</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <p>We need a few more details before you can make a reservation.</p>
                    <Form.Group className="mb-3">
                        <Form.Label>Full name</Form.Label>
                        <Form.Control name="fullName" value={form.fullName} onChange={handleChange} required />
                    </Form.Group>
                    <Form.Group className="mb-3">
                        <Form.Label>Phone number</Form.Label>
                        <Form.Control name="phone" type="tel" value={form.phone} onChange={handleChange} />
                    </Form.Group>
                    <Form.Group className="mb-3">
                        <Form.Label>Driver's license number *</Form.Label>
                        <Form.Control
                            name="driversLicense"
                            value={form.driversLicense}
                            onChange={handleChange}
                            required
                        />
                    </Form.Group>
                    <Form.Group className="mb-3">
                        <Form.Label>Date of birth *</Form.Label>
                        <Form.Control name="dob" type="date" value={form.dob} onChange={handleChange} required />
                    </Form.Group>
                    <p className="profile-completion-required-note">* required to complete your profile</p>
                </Modal.Body>
                <Modal.Footer>
                    <Button type="button" variant="outline-secondary" onClick={handleCancel}>
                        Cancel &amp; sign out
                    </Button>
                    <Button type="submit" className="joinButton">
                        Save &amp; continue
                    </Button>
                </Modal.Footer>
            </Form>
        </Modal>
    );
};
