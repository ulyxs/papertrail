export class ApiError extends Error {
    status;
    constructor(message, status) {
        super(message);
        this.status = status;
        this.name = 'ApiError';
    }
}

async function parseApiResponse(response, fallbackMessage) {
    const text = await response.text();
    let result;
    try {
        result = JSON.parse(text);
    }
    catch {
        throw new Error('The PHP API did not return JSON. Check that the PHP server is running.');
    }
    if (!response.ok) {
        throw new ApiError(result?.error || fallbackMessage, response.status);
    }
    return result;
}

export async function loadDashboard() {
    // Avoid showing stale financial records after submissions or account changes.
    const response = await fetch('/api.php', { cache: 'no-store' });
    return parseApiResponse(response, 'Could not load the ledger.');
}
export async function loadAuthState() {
    const response = await fetch('/api.php?action=auth-status', { cache: 'no-store' });
    return parseApiResponse(response, 'Could not check the login session.');
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
    return parseApiResponse(response, 'Could not complete the request.');
}
export async function postAction(action, values, csrfToken) {
    let body;
    let headers;
    // Funds and receipts use multipart requests to carry proof images; other actions are JSON.
    if (action === 'funds' || action === 'receipt' || action === 'fund-proof' || action === 'receipt-proof') {
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
    return parseApiResponse(response, 'Could not save this change.');
}
