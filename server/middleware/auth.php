<?php
declare(strict_types=1);

// Resolves the active account and enforces authentication and role permissions.
function session_account(PDO $db): ?array
{
    $accountId = filter_var($_SESSION['account_id'] ?? null, FILTER_VALIDATE_INT);
    if ($accountId === false || $accountId < 1) {
        return null;
    }

    $statement = $db->prepare(
        'SELECT id, first_name, last_name, email, role, status
         FROM accounts WHERE id = ?'
    );
    $statement->execute([$accountId]);
    $account = $statement->fetch();
    if (!$account || $account['status'] !== 'approved') {
        // A changed or revoked account must not keep using an already-issued session.
        unset($_SESSION['account_id']);
        session_regenerate_id(true);
        ensure_csrf_token();
        return null;
    }

    return $account;
}

function require_account(PDO $db): array
{
    $account = session_account($db);
    if (!$account) {
        respond(['error' => 'Please sign in to continue.'], 401);
    }

    return $account;
}

function require_roles(array $account, array $roles): void
{
    if (!in_array($account['role'], $roles, true)) {
        respond(['error' => 'Your account does not have permission to perform this action.'], 403);
    }
}

function account_actor(array $account): string
{
    return trim($account['first_name'] . ' ' . $account['last_name']);
}
