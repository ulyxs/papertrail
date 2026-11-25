<?php
declare(strict_types=1);

// Records incoming funds and associates an optional verified proof image.
function handle_funds(PDO $db, array $data, array $account, ?string &$createdProofPath): void
{
    $user = account_actor($account);
    $source = required_string($data, 'source_name', 180);
    $category = required_string($data, 'income_category', 40);
    $categories = [
        'Department Allocation',
        'Membership Dues',
        'Sponsorships',
        'Donations',
        'Fundraising Activities',
        'Grants',
        'Others',
    ];
    if (!in_array($category, $categories, true)) {
        throw new InvalidArgumentException('Select a valid income category.');
    }
    $amount = valid_amount($data, 'amount');
    $receivedOn = valid_date($data, 'received_on');
    $note = trim((string)($data['note'] ?? ''));
    if (mb_strlen($note) > 500) {
        throw new InvalidArgumentException('Note must be at most 500 characters.');
    }
    if (isset($_FILES['proof']) && !is_array($_FILES['proof'])) {
        throw new InvalidArgumentException('The proof upload is invalid.');
    }
    $proof = isset($_FILES['proof']) ? save_proof($_FILES['proof'], 'fund-proofs', PROOF_MIME_TYPES) : null;
    if ($proof !== null) {
        $createdProofPath = $proof['storage_path'];
    }

    // Store the fund and its audit entry in one transaction.
    $db->beginTransaction();
    $statement = $db->prepare(
        'INSERT INTO funds
            (source_name, income_category, amount, received_on, note, proof_path, proof_mime, proof_name)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    );
    $statement->execute([
        $source,
        $category,
        $amount,
        $receivedOn,
        $note,
        $proof['path'] ?? null,
        $proof['mime'] ?? null,
        $proof['name'] ?? null,
    ]);
    log_action($db, $user, 'Recorded incoming funds', $source . ' · ' . $category . ' · ₱' . $amount);
    $db->commit();
    $createdProofPath = null;
    respond(['ok' => true], 201);
}

function handle_fund_proof(PDO $db, array $data, array $account, ?string &$createdProofPath): void
{
    $fundId = filter_var($data['fund_id'] ?? null, FILTER_VALIDATE_INT);
    if ($fundId === false || $fundId < 1) {
        throw new InvalidArgumentException('Select a valid fund record.');
    }
    if (!isset($_FILES['proof']) || !is_array($_FILES['proof'])) {
        throw new InvalidArgumentException('Select a proof image to attach.');
    }
    $proof = save_proof($_FILES['proof'], 'fund-proofs', PROOF_MIME_TYPES);
    if ($proof === null) {
        throw new InvalidArgumentException('Select a proof image to attach.');
    }
    $createdProofPath = $proof['storage_path'];

    $db->beginTransaction();
    $statement = $db->prepare('SELECT source_name, income_category, proof_path FROM funds WHERE id = ? FOR UPDATE');
    $statement->execute([$fundId]);
    $fund = $statement->fetch();
    if (!$fund) {
        throw new InvalidArgumentException('This fund record could not be found.');
    }
    if ($fund['proof_path'] !== null) {
        throw new InvalidArgumentException('This fund record already has a proof image.');
    }

    $update = $db->prepare(
        'UPDATE funds SET proof_path = ?, proof_mime = ?, proof_name = ? WHERE id = ?'
    );
    $update->execute([$proof['path'], $proof['mime'], $proof['name'], $fundId]);
    log_action(
        $db,
        account_actor($account),
        'Attached proof to incoming funds',
        $fund['source_name'] . ' · ' . $fund['income_category']
    );
    $db->commit();
    $createdProofPath = null;
    respond(['ok' => true, 'message' => 'Proof attached to the fund record.']);
}
