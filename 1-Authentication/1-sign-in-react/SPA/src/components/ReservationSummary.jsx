import { useState } from 'react';

// Fixed dummy vehicle/extras - there's no real inventory or add-ons system in
// this demo, so these stand in for whatever the user "picked" in the earlier
// (non-functional) Vehicle and Extras steps.
const DUMMY_VEHICLE = {
    name: 'Toyota RAV4 or similar',
    className: 'Midsize SUV',
    dailyRate: 58,
};
const DUMMY_EXTRAS = ['GPS Navigation', 'Additional Driver'];

const addDays = (date, days) => {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
};

const formatDate = (date) => date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

const CarIcon = () => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 13l1.5-4.5A2 2 0 0 1 6.4 7h11.2a2 2 0 0 1 1.9 1.5L21 13" />
        <rect x="2.5" y="13" width="19" height="5" rx="1.5" />
        <circle cx="7" cy="18.5" r="1.5" />
        <circle cx="17" cy="18.5" r="1.5" />
    </svg>
);

/**
 * Left-hand "what you're reserving" recap for the Driver Details step. Uses
 * whatever location/dates the user actually entered on the search form; if
 * they left the date fields blank (nothing enforces filling them there),
 * falls back to a sensible default 3-day rental starting a couple of days
 * out, computed once so it doesn't drift across re-renders.
 */
export const ReservationSummary = ({ location, pickupDate, returnDate }) => {
    const [fallback] = useState(() => {
        const start = addDays(new Date(), 2);
        const end = addDays(start, 3);
        return { pickup: start, return: end };
    });

    const pickup = pickupDate ? new Date(`${pickupDate}T00:00:00`) : fallback.pickup;
    const dropoff = returnDate ? new Date(`${returnDate}T00:00:00`) : fallback.return;
    const msPerDay = 1000 * 60 * 60 * 24;
    const days = Math.max(1, Math.round((dropoff - pickup) / msPerDay));
    const total = days * DUMMY_VEHICLE.dailyRate;

    return (
        <aside className="reservation-summary">
            <h4>Your Reservation</h4>
            <div className="reservation-summary-vehicle">
                <CarIcon />
                <div>
                    <strong>{DUMMY_VEHICLE.name}</strong>
                    <div className="reservation-summary-vehicle-class">{DUMMY_VEHICLE.className}</div>
                </div>
            </div>
            <dl className="reservation-summary-details">
                <dt>Pick-up</dt>
                <dd>{location || 'Los Angeles, CA (LAX)'}<br />{formatDate(pickup)}</dd>
                <dt>Return</dt>
                <dd>{location || 'Los Angeles, CA (LAX)'}<br />{formatDate(dropoff)}</dd>
                <dt>Extras</dt>
                <dd>{DUMMY_EXTRAS.join(', ')}</dd>
            </dl>
            <div className="reservation-summary-total">
                <span>
                    {days} day{days !== 1 ? 's' : ''} &times; ${DUMMY_VEHICLE.dailyRate}
                </span>
                <strong>${total} estimated</strong>
            </div>
        </aside>
    );
};
