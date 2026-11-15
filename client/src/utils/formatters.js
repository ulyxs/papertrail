export const money = (value) => new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
}).format(Number(value) || 0);
// Compare and display money at cent precision instead of relying on float equality.
export const cents = (value) => Math.round((Number(value) || 0) * 100);
export const today = () => {
    const date = new Date();
    date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
    return date.toISOString().slice(0, 10);
};
export function formatDate(value) {
    if (!value)
        return '—';
    const date = new Date(`${value.slice(0, 10)}T00:00:00`);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('en-PH', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
}
export function daysUntil(value) {
    // Compare calendar dates at midnight so the deadline does not drift with the current time.
    const due = new Date(`${value}T00:00:00`);
    const current = new Date();
    current.setHours(0, 0, 0, 0);
    return Math.round((due.getTime() - current.getTime()) / 86400000);
}
export function isOverdue(record) {
    return record.status === 'awaiting_receipt' && daysUntil(record.due_on) < 0;
}
export function statusLabel(record) {
    if (isOverdue(record))
        return 'Receipt overdue';
    const labels = {
        awaiting_receipt: 'Awaiting receipt',
        for_review: 'For review',
        flagged: 'Flagged',
        approved: 'Approved',
    };
    return labels[record.status];
}
