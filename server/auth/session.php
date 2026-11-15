<?php
declare(strict_types=1);

// Initializes secure browser sessions and manages their CSRF tokens.
function start_app_session(): void
{
    // Restrict session IDs to cookies and keep them inaccessible to scripts where supported.
    ini_set('session.use_strict_mode', '1');
    ini_set('session.use_only_cookies', '1');
    ini_set('session.cookie_httponly', '1');
    ini_set('session.cookie_samesite', 'Lax');
    session_name('DTLSESSID');
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'secure' => isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== '' && $_SERVER['HTTPS'] !== 'off',
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    session_start();
    ensure_csrf_token();
}

function ensure_csrf_token(): string
{
    if (!isset($_SESSION['csrf_token']) || !is_string($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }

    return $_SESSION['csrf_token'];
}

function verify_csrf_token(): void
{
    // Mutating requests must prove they came from the active browser session.
    $provided = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
    $expected = $_SESSION['csrf_token'] ?? '';
    if (!is_string($provided) || !is_string($expected) || $provided === '' || !hash_equals($expected, $provided)) {
        respond(['error' => 'Your session token is invalid or expired. Refresh the page and try again.'], 419);
    }
}
