<?php
declare(strict_types=1);

const DUMMY_PASSWORD_HASH = '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.';

// Handles account registration, authentication, session status, and logout.
function handle_auth_status(PDO $db): void
{
    $account = session_account($db);
    respond([
        'user' => $account ? public_account($account) : null,
        'csrf_token' => ensure_csrf_token(),
    ]);
}

function handle_registration(PDO $db, array $data): void
{
    $firstName = required_string($data, 'first_name', 80);
    $lastName = required_string($data, 'last_name', 80);
    $email = normalized_email($data);
    $password = (string)($data['password'] ?? '');
    $confirmation = (string)($data['confirm_password'] ?? '');
    if (strlen($password) < 8 || strlen($password) > 72) {
        throw new InvalidArgumentException('Password must be between 8 and 72 bytes.');
    }
    if (!hash_equals($password, $confirmation)) {
        throw new InvalidArgumentException('Password and Confirm Password must match.');
    }

    // The database default keeps public registrations pending and assigns no elevated role.
    $db->beginTransaction();
    $insert = $db->prepare(
        'INSERT INTO accounts (first_name, last_name, email, password_hash)
         VALUES (?, ?, ?, ?)'
    );
    try {
        $insert->execute([$firstName, $lastName, $email, password_hash($password, PASSWORD_DEFAULT)]);
    } catch (PDOException $exception) {
        if ((int)($exception->errorInfo[1] ?? 0) === 1062) {
            throw new InvalidArgumentException('An account with that email address already exists.');
        }
        throw $exception;
    }
    log_action($db, 'System', 'Registered an account', $firstName . ' ' . $lastName . ' · ' . $email);
    $db->commit();
    respond(['ok' => true, 'status' => 'pending'], 201);
}

function handle_login(PDO $db, array $data): void
{
    $email = mb_strtolower(trim((string)($data['email'] ?? '')));
    $password = (string)($data['password'] ?? '');
    $statement = $db->prepare(
        'SELECT id, first_name, last_name, email, password_hash, role, status
         FROM accounts WHERE email = ?'
    );
    $statement->execute([$email]);
    $account = $statement->fetch();
    $storedHash = $account['password_hash'] ?? DUMMY_PASSWORD_HASH;
    $passwordMatches = password_verify(substr($password, 0, 72), $storedHash);
    // Verify a dummy hash for unknown emails to reduce account-enumeration timing differences.
    if (!$account || strlen($password) > 72 || !$passwordMatches) {
        respond(['error' => 'Email address or password is incorrect.'], 401);
    }
    if ($account['status'] === 'pending') {
        respond(['error' => 'Your account is pending Admin approval.'], 403);
    }
    if ($account['status'] === 'disapproved') {
        respond(['error' => 'Your account was disapproved. Contact an Admin for assistance.'], 403);
    }

    if (!session_regenerate_id(true)) {
        throw new RuntimeException('Could not establish a secure login session.');
    }
    $_SESSION['account_id'] = (int)$account['id'];
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    if (password_needs_rehash($account['password_hash'], PASSWORD_DEFAULT)) {
        $rehash = $db->prepare('UPDATE accounts SET password_hash = ? WHERE id = ?');
        $rehash->execute([password_hash($password, PASSWORD_DEFAULT), $account['id']]);
    }
    respond([
        'ok' => true,
        'user' => public_account($account),
        'csrf_token' => $_SESSION['csrf_token'],
    ]);
}

function handle_logout(PDO $db, array $account): void
{
    log_action($db, account_actor($account), 'Signed out', $account['email']);
    $_SESSION = [];
    $cookie = session_get_cookie_params();
    setcookie(session_name(), '', [
        'expires' => time() - 42000,
        'path' => $cookie['path'],
        'domain' => $cookie['domain'],
        'secure' => $cookie['secure'],
        'httponly' => $cookie['httponly'],
        'samesite' => $cookie['samesite'] ?? 'Lax',
    ]);
    session_destroy();
    respond(['ok' => true]);
}
