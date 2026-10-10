// API contract shared by apps/api (producer) and apps/web (consumer).
// Dates are ISO strings. Money is whole MVR. Months are 'YYYY-MM'.
export const DISTRICTS = [
    'Henveiru · Malé',
    'Machangolhi · Malé',
    'Maafannu · Malé',
    'Galolhu · Malé',
    'Phase 1 · Hulhumalé',
    'Phase 2 · Hulhumalé',
    'Villingili'
];
export const FEEDBACK_METRICS = [
    'None',
    'Financial constraint ("Little expensive")',
    'Location ("Too far from work/school")',
    'Size ("Rooms too small")',
    'Furnishing ("Needs more furniture")'
];
export const MAINTENANCE_CATEGORIES = ['Plumbing', 'Electrical', 'Air conditioning', 'Furniture', 'Other'];
export const QUEUE_CHECKS = {
    PROPERTY: ['Ownership documents verified', 'Unit inspected and furnished', 'Rent within area guidance'],
    APPLICATION: ['National ID verified', 'Employment letter received', 'Reference contacted']
};
export const MANAGEMENT_FEE_RATE = 0.1;
