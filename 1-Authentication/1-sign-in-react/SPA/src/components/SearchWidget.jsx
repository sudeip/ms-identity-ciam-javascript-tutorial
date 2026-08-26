import { useState } from 'react';
import { ReservationSignup } from './ReservationSignup';

/**
 * Visual "find a car" reservation widget, styled after the search cards on
 * rental/travel sites. There is no car inventory backend in this demo app,
 * so submitting doesn't search anything - instead it moves on to collecting
 * guest details and offering to join the loyalty program (ReservationSignup),
 * carrying forward whatever location/dates were entered here.
 */
export const SearchWidget = () => {
    const [submitted, setSubmitted] = useState(false);
    const [location, setLocation] = useState('Los Angeles, CA (LAX)');
    const [pickupDate, setPickupDate] = useState('');
    const [returnDate, setReturnDate] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        setSubmitted(true);
    };

    if (submitted) {
        return (
            <div className="search-widget">
                <ReservationSignup location={location} pickupDate={pickupDate} returnDate={returnDate} />
            </div>
        );
    }

    return (
        <form className="search-widget" onSubmit={handleSubmit}>
            <div className="search-widget-field">
                <label htmlFor="pickupLocation">Pick-up &amp; return location</label>
                <input
                    id="pickupLocation"
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                />
            </div>
            <div className="search-widget-field">
                <label htmlFor="pickupDate">Pick-up date</label>
                <input id="pickupDate" type="date" value={pickupDate} onChange={(e) => setPickupDate(e.target.value)} />
            </div>
            <div className="search-widget-field">
                <label htmlFor="returnDate">Return date</label>
                <input id="returnDate" type="date" value={returnDate} onChange={(e) => setReturnDate(e.target.value)} />
            </div>
            <button type="submit" className="search-widget-button">
                Search Cars
            </button>
        </form>
    );
};
