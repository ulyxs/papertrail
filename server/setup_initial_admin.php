<?php
declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

// This one-time provisioner is intentionally unavailable over HTTP.
function prompt(string $label): string
{
    fwrite(STDOUT, $label);
    $value = fgets(STDIN);
    if ($value === false) {
        throw new RuntimeException('Could not read setup input.');
    }

    return rtrim($value, "\r\n");
}

try {
    $firstName = trim(prompt('Admin first name: '));
    $lastName = trim(prompt('Admin last name: '));
    $email = mb_strtolower(trim(prompt('Admin email address: ')));
    $password = prompt('Initial Admin password (input is visible in this terminal): ');
    $confirmation = prompt('Confirm initial Admin password: ');

    if ($firstName === '' || mb_strlen($firstName) > 80 || $lastName === '' || mb_strlen($lastName) > 80) {
        throw new InvalidArgumentException('First and last names are required and must be at most 80 characters.');
    }
    if (strlen($email) > 254 || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        throw new InvalidArgumentException('Enter a valid email address.');
    }
    if (strlen($password) < 12 || strlen($password) > 72) {
        throw new InvalidArgumentException('Initial Admin passwords must be between 12 and 72 bytes.');
    }
    if (!hash_equals($password, $confirmation)) {
        throw new InvalidArgumentException('The password confirmation does not match.');
    }

    require_once __DIR__ . '/config/database.php';
    require_once __DIR__ . '/helpers/audit.php';
    $db = database_connection();

    // Lock setup and account creation so concurrent runs cannot create multiple initial Admins.
    $db->beginTransaction();
    $db->exec('INSERT IGNORE INTO app_lock (id) VALUES (1)');
    $db->query('SELECT id FROM app_lock WHERE id = 1 FOR UPDATE');
    $admins = (int)$db->query("SELECT COUNT(*) FROM accounts WHERE role = 'Admin'")->fetchColumn();
    if ($admins > 0) {
        throw new RuntimeException('An Admin account already exists; initial setup is no longer available.');
    }

    $insert = $db->prepare(
        "INSERT INTO accounts (first_name, last_name, email, password_hash, role, status)
         VALUES (?, ?, ?, ?, 'Admin', 'approved')"
    );
    $insert->execute([$firstName, $lastName, $email, password_hash($password, PASSWORD_DEFAULT)]);
    $accountId = (int)$db->lastInsertId();
    $recipient = $db->prepare(
        "INSERT INTO people (account_id, name, position, status) VALUES (?, ?, 'Admin', 'active')"
    );
    $recipient->execute([$accountId, $firstName . ' ' . $lastName]);
    $audit = $db->prepare(
        "INSERT INTO audit_log (actor, action, detail) VALUES ('System setup', 'Provisioned initial Admin', ?)"
    );
    $audit->execute(['Created initial Admin account ' . $email]);
    $db->commit();

    $password = '';
    $confirmation = '';
    fwrite(STDOUT, "Initial Admin account created and approved. Sign in with {$email}.\n");
} catch (InvalidArgumentException | RuntimeException $exception) {
    if (isset($db) && $db instanceof PDO && $db->inTransaction()) {
        $db->rollBack();
    }
    fwrite(STDERR, $exception->getMessage() . "\n");
    exit(1);
} catch (Throwable $exception) {
    if (isset($db) && $db instanceof PDO && $db->inTransaction()) {
        $db->rollBack();
    }
    fwrite(STDERR, "Initial Admin setup failed: " . $exception->getMessage() . "\n");
    exit(1);
}
