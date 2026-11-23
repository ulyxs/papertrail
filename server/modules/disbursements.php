<?php
declare(strict_types=1);

// Validates and records project-linked releases as disbursement vouchers.
function handle_release(PDO $db, array $data, array $account): void
{
    $user = account_actor($account);
    $purpose = required_string($data, 'purpose', 180);
    $personId = filter_var($data['person_id'] ?? null, FILTER_VALIDATE_INT);
    if ($personId === false || $personId < 1) {
        throw new InvalidArgumentException('Select an accountable person.');
    }
    $projectId = filter_var($data['project_id'] ?? null, FILTER_VALIDATE_INT);
    if ($projectId === false || $projectId < 1) {
        throw new InvalidArgumentException('Select an active project.');
    }
    $amount = valid_amount($data, 'amount');
    $releasedOn = valid_date($data, 'released_on');
    $semester = trim((string)($data['semester'] ?? ''));
    if (!in_array($semester, ['First Semester', 'Second Semester', 'Summer'], true)) {
        throw new InvalidArgumentException('Select a valid semester.');
    }
    $month = filter_var($data['month'] ?? null, FILTER_VALIDATE_INT);
    if ($month === false || $month < 1 || $month > 12) {
        throw new InvalidArgumentException('Select a valid month.');
    }
    $monthSemester = $month >= 8 ? 'First Semester'
        : ($month <= 5 ? 'Second Semester' : 'Summer');
    if ($semester !== $monthSemester) {
        throw new InvalidArgumentException('The selected month does not belong to the selected semester.');
    }
    $releasedMonth = (int)date('n', strtotime($releasedOn));
    if ($releasedMonth !== $month) {
        throw new InvalidArgumentException('The selected month must match the release date.');
    }

    $db->beginTransaction();
    $db->query('SELECT id FROM app_lock WHERE id = 1 FOR UPDATE');
    $projectQuery = $db->prepare('SELECT project_name, status FROM projects WHERE id = ? FOR UPDATE');
    $projectQuery->execute([$projectId]);
    $project = $projectQuery->fetch();
    if (!$project || $project['status'] !== 'active') {
        throw new InvalidArgumentException('Select a project that is currently active.');
    }

    $person = $db->prepare(
        "SELECT p.id, CONCAT(a.first_name, ' ', a.last_name) AS name
         FROM people p
         JOIN accounts a ON a.id = p.account_id
         WHERE p.id = ? AND p.status = 'active' AND a.status = 'approved'
         FOR UPDATE"
    );
    $person->execute([$personId]);
    $person = $person->fetch();
    if (!$person) {
        throw new InvalidArgumentException('The selected person does not exist.');
    }

    $blocked = $db->prepare(
        "SELECT COUNT(*) FROM disbursements
         WHERE person_id = ? AND (
            status = 'flagged'
            OR (status = 'awaiting_receipt'
                AND DATE_ADD(released_on, INTERVAL 7 DAY) < CURRENT_DATE())
         )"
    );
    $blocked->execute([$personId]);
    if ((int)$blocked->fetchColumn() > 0) {
        throw new InvalidArgumentException('This person is on hold until their flagged or overdue transaction is resolved.');
    }

    $totals = $db->query(
        'SELECT COALESCE((SELECT SUM(amount) FROM funds), 0) AS received,
                COALESCE((SELECT SUM(amount) FROM disbursements), 0) AS released'
    )->fetch();
    $availableCents = amount_cents((string)$totals['received']) - amount_cents((string)$totals['released']);
    if (amount_cents($amount) > $availableCents) {
        throw new InvalidArgumentException('There is not enough cash on hand for this release.');
    }

    $nextNumber = (int)$db->query('SELECT COALESCE(MAX(id), 0) + 1 FROM disbursements')->fetchColumn();
    $voucher = 'DV-' . date('Y', strtotime($releasedOn)) . '-' . str_pad((string)$nextNumber, 3, '0', STR_PAD_LEFT);
    $insert = $db->prepare(
        "INSERT INTO disbursements
            (voucher_number, purpose, person_id, project_id, amount, released_on, semester, month)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    );
    $insert->execute([$voucher, $purpose, $personId, $projectId, $amount, $releasedOn, $semester, $month]);
    log_action($db, $user, 'Released funds', $voucher . ' · ' . $project['project_name'] . ' · ₱' . $amount . ' to ' . $person['name']);
    $db->commit();
    respond(['ok' => true, 'voucher_number' => $voucher], 201);
}
