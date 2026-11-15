<?php
declare(strict_types=1);

// Applies Admin account changes and keeps approved accounts in sync with recipients.
function handle_account_management(PDO $db, array $data, array $account): void
{
    $user = account_actor($account);
    require_roles($account, ['Admin']);
    $operation = $data['operation'] ?? 'update';
    if (!in_array($operation, ['update', 'approve', 'disapprove'], true)) {
        throw new InvalidArgumentException('Choose a valid account action.');
    }
    $accountId = filter_var($data['account_id'] ?? null, FILTER_VALIDATE_INT);
    if ($accountId === false || $accountId < 1) {
        throw new InvalidArgumentException('Select a valid account.');
    }
    if ((int)$accountId === (int)$account['id']) {
        respond(['error' => 'You cannot modify your own account through Account Management.'], 403);
    }

    $firstName = $operation === 'update' ? required_string($data, 'first_name', 80) : null;
    $lastName = $operation === 'update' ? required_string($data, 'last_name', 80) : null;
    $email = $operation === 'update' ? normalized_email($data) : null;
    $role = $operation === 'update' ? ($data['role'] ?? '') : null;
    $status = $operation === 'approve' ? 'approved' : ($operation === 'disapprove' ? 'disapproved' : ($data['status'] ?? ''));
    if ($operation === 'update' && !in_array($role, ['User', 'Auditor', 'Treasurer', 'Admin'], true)) {
        throw new InvalidArgumentException('Select a valid account role.');
    }
    if (!in_array($status, ['pending', 'approved', 'disapproved'], true)) {
        throw new InvalidArgumentException('Select a valid account status.');
    }

    // Serialize account administration and protect the final approved Admin from removal.
    $db->beginTransaction();
    $db->query('SELECT id FROM app_lock WHERE id = 1 FOR UPDATE');
    $select = $db->prepare('SELECT id, first_name, last_name, email, role, status FROM accounts WHERE id = ? FOR UPDATE');
    $select->execute([$accountId]);
    $target = $select->fetch();
    if (!$target) {
        throw new InvalidArgumentException('The selected account does not exist.');
    }
    $firstName = $firstName ?? $target['first_name'];
    $lastName = $lastName ?? $target['last_name'];
    $email = $email ?? $target['email'];
    $role = $role ?? $target['role'];

    $duplicate = $db->prepare('SELECT id FROM accounts WHERE email = ? AND id <> ?');
    $duplicate->execute([$email, $accountId]);
    if ($duplicate->fetch()) {
        throw new InvalidArgumentException('An account with that email address already exists.');
    }

    $wasApprovedAdmin = $target['role'] === 'Admin' && $target['status'] === 'approved';
    $willBeApprovedAdmin = $role === 'Admin' && $status === 'approved';
    if ($wasApprovedAdmin && !$willBeApprovedAdmin) {
        $activeAdmins = (int)$db->query("SELECT COUNT(*) FROM accounts WHERE role = 'Admin' AND status = 'approved'")->fetchColumn();
        if ($activeAdmins <= 1) {
            throw new InvalidArgumentException('The last approved Admin account cannot be demoted or disapproved.');
        }
    }

    $update = $db->prepare(
        'UPDATE accounts SET first_name = ?, last_name = ?, email = ?, role = ?, status = ? WHERE id = ?'
    );
    $update->execute([$firstName, $lastName, $email, $role, $status, $accountId]);
    $recipientName = $firstName . ' ' . $lastName;
    if ($status === 'approved') {
        $syncRecipient = $db->prepare(
            "INSERT INTO people (account_id, name, position, status)
             VALUES (?, ?, ?, 'active')
             ON DUPLICATE KEY UPDATE
                name = VALUES(name), position = VALUES(position), status = 'active'"
        );
        $syncRecipient->execute([$accountId, $recipientName, $role]);
    } else {
        $syncRecipient = $db->prepare(
            "UPDATE people SET name = ?, position = ?, status = 'archived' WHERE account_id = ?"
        );
        $syncRecipient->execute([$recipientName, $role, $accountId]);
    }
    $targetLabel = $target['first_name'] . ' ' . $target['last_name'] . ' · ' . $target['email'];
    if ($target['role'] !== $role) {
        log_action($db, $user, 'Changed account role', $targetLabel . ' · ' . $target['role'] . ' → ' . $role);
    }
    if ($target['status'] !== $status) {
        $statusAction = $status === 'approved' ? 'Approved account' : ($status === 'disapproved' ? 'Disapproved account' : 'Set account to pending');
        log_action($db, $user, $statusAction, $targetLabel . ' · ' . $target['status'] . ' → ' . $status);
    }
    if ($target['first_name'] !== $firstName || $target['last_name'] !== $lastName || $target['email'] !== $email) {
        log_action(
            $db,
            $user,
            'Updated account details',
            $targetLabel . ' → ' . $firstName . ' ' . $lastName . ' · ' . $email
        );
    }
    $db->commit();
    respond(['ok' => true]);
}
