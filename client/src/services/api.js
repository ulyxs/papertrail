export class ApiError extends Error {
    status;
    constructor(message, status) {
        super(message);
        this.status = status;
        this.name = 'ApiError';
    }
}
export async function loadDashboard() {
    // Avoid showing stale financial records after submissions or account changes.
    const response = await fetch('/api.php', { cache: 'no-store' });
    const text = await response.text();
    let result;
    try {
        result = JSON.parse(text);
    }
    catch {
        throw new Error('The PHP API did not return JSON. Check that the PHP server is running.');
    }
    if (!response.ok) {
        throw new ApiError(result.error || 'Could not load the ledger.', response.status);
    }
    return result;
}
export async function loadAuthState() {
    const response = await fetch('/api.php?action=auth-status', { cache: 'no-store' });
    const text = await response.text();
    let result;
    try {
        result = JSON.parse(text);
    }
    catch {
        throw new Error('The PHP API did not return JSON. Check that the PHP server is running.');
    }
    if (!response.ok) {
        throw new ApiError(result.error || 'Could not check the login session.', response.status);
    }
    return result;
}
export async function postAuthAction(action, values, csrfToken) {
    const response = await fetch(`/api.php?action=${encodeURIComponent(action)}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify(values),
    });
    const text = await response.text();
    let result;
    try {
        result = JSON.parse(text);
    }
    catch {
        throw new Error('The PHP API did not return JSON. Check that the PHP server is running.');
    }
    if (!response.ok) {
        throw new ApiError(result.error || 'Could not complete the request.', response.status);
    }
    return result;
}
export async function postAction(action, values, csrfToken) {
    let body;
    let headers;
    // Funds and receipts use multipart requests to carry proof images; other actions are JSON.
    if (action === 'funds' || action === 'receipt') {
        const formData = new FormData();
        body = formData;
        Object.entries(values).forEach(([key, value]) => {
            if (key === 'proof') {
                if (value instanceof File && value.size > 0)
                    formData.append(key, value);
            }
            else {
                formData.append(key, String(value));
            }
        });
        headers = { 'X-CSRF-Token': csrfToken };
    }
    else {
        body = JSON.stringify(values);
        headers = { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken };
    }
    const response = await fetch(`/api.php?action=${encodeURIComponent(action)}`, {
        method: 'POST',
        headers,
        body,
    });
    const text = await response.text();
    let result;
    try {
        result = JSON.parse(text);
    }
    catch {
        throw new Error('The PHP API did not return JSON. Check that the PHP server is running.');
    }
    if (!response.ok) {
        throw new ApiError(result.error || 'Could not save this change.', response.status);
    }
    return result;
}
