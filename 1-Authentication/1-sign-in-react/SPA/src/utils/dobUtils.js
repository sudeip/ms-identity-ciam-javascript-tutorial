export const DAYS = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0'));
export const MONTHS = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
const CURRENT_YEAR = new Date().getFullYear();
export const YEARS = Array.from({ length: 100 }, (_, i) => String(CURRENT_YEAR - i));
export const MINIMUM_AGE = 21;

/**
 * Whole-years age as of today, accounting for whether the birthday has
 * happened yet this year - not just a year subtraction.
 */
export const calculateAge = (day, month, year) => {
    if (!day || !month || !year) return null;
    const dob = new Date(Number(year), Number(month) - 1, Number(day));
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const hadBirthdayThisYear =
        today.getMonth() > dob.getMonth() || (today.getMonth() === dob.getMonth() && today.getDate() >= dob.getDate());
    if (!hadBirthdayThisYear) age -= 1;
    return age;
};
