import { useState } from 'react';

/**
 * Visual "find a car" reservation widget, styled after the search cards on
 * rental/travel sites. There is no car inventory backend in this demo app,
 * so submitting doesn't search anything - it just surfaces that plainly
 * instead of pretending to return results.
 */
export const SearchWidget = () => {
    const [notice, setNotice] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        setNotice('This demo app only wires up sign-in/sign-up - car search isn’t implemented.');
    };

    return (
        <form className="search-widget" onSubmit={handleSubmit}>
            <div className="search-widget-field">
                <label htmlFor="pickupLocation">Pick-up &amp; return location</label>
                <input id="pickupLocation" type="text" defaultValue="Los Angeles, CA (LAX)" />
            </div>
            <div className="search-widget-field">
                <label htmlFor="pickupDate">Pick-up date</label>
                <input id="pickupDate" type="date" />
            </div>
            <div className="search-widget-field">
                <label htmlFor="returnDate">Return date</label>
                <input id="returnDate" type="date" />
            </div>
            <button type="submit" className="search-widget-button">
                Search Cars
            </button>
            {notice && <p className="search-widget-notice">{notice}</p>}
        </form>
    );
};