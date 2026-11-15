export const ROLE_PAGES = {
    User: ['overview', 'funds', 'disbursements', 'liquidation', 'archive'],
    Auditor: ['overview', 'funds', 'disbursements', 'liquidation', 'review', 'archive', 'audit'],
    Treasurer: ['overview', 'funds', 'disbursements', 'release', 'liquidation', 'archive', 'personnel'],
    Admin: ['overview', 'funds', 'disbursements', 'release', 'liquidation', 'review', 'archive', 'personnel', 'audit', 'accounts'],
};
export const NAV_SECTIONS = [
    { label: 'Ledger', items: [{ id: 'overview', label: 'Overview' }, { id: 'funds', label: 'Funds received' }, { id: 'disbursements', label: 'Disbursements' }] },
    { label: 'Operations', items: [{ id: 'release', label: 'Release funds' }, { id: 'liquidation', label: 'Liquidation' }] },
    { label: 'Accountability', items: [{ id: 'review', label: 'Review queue' }, { id: 'archive', label: 'Financial reports' }, { id: 'personnel', label: 'Personnel' }, { id: 'audit', label: 'Activity & Audit Log' }] },
    { label: 'Admin', items: [{ id: 'accounts', label: 'Account Management' }] },
];
