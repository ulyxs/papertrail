<?php
declare(strict_types=1);

// Saves liquidation receipts and optional proof images for released vouchers.
function handle_receipt(PDO $db, array $data, array $account, ?string &$createdProofPath): void
{
    $user = account_actor($account);
    $disbursementId = filter_var($data['disbursement_id'] ?? null, FILTER_VALIDATE_INT);
    if ($disbursementId === false || $disbursementId < 1) {
        throw new InvalidArgumentException('Select a valid disbursement.');
    }
    $vendor = required_string($data, 'vendor', 180);
    $reference = trim((string)($data['reference'] ?? ''));
    $amount = valid_amount($data, 'amount');
    $submittedOn = valid_date($data, 'submitted_on');
    $note = trim((string)($data['note'] ?? ''));
    if (mb_strlen($reference) > 120 || mb_strlen($note) > 500) {
        throw new InvalidArgumentException('Receipt reference or note is too long.');
    }
    if (isset($_FILES['proof']) && !is_array($_FILES['proof'])) {
        throw new InvalidArgumentException('The receipt proof upload is invalid.');
    }
    $proof = isset($_FILES['proof'])
        ? save_proof($_FILES['proof'], 'receipt-proofs', RECEIPT_PROOF_MIME_TYPES)
        : null;
    if ($proof !== null) {
        $createdProofPath = $proof['storage_path'];
    }

    // Lock the voucher row so concurrent submissions cannot create duplicate receipts.
    $db->beginTransaction();
    $select = $db->prepare('SELECT id, voucher_number, status FROM disbursements WHERE id = ? FOR UPDATE');
    $select->execute([$disbursementId]);
    $disbursement = $select->fetch();
    if (!$disbursement || $disbursement['status'] !== 'awaiting_receipt') {
        throw new InvalidArgumentException('This disbursement is no longer waiting for a receipt.');
    }

    $insert = $db->prepare(
        'INSERT INTO receipts
            (disbursement_id, vendor, reference, amount, submitted_on, note, proof_path, proof_mime, proof_name)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    $insert->execute([
        $disbursementId,
        $vendor,
        $reference,
        $amount,
        $submittedOn,
        $note,
        $proof['path'] ?? null,
        $proof['mime'] ?? null,
        $proof['name'] ?? null,
    ]);
    $update = $db->prepare("UPDATE disbursements SET status = 'for_review' WHERE id = ?");
    $update->execute([$disbursementId]);
    log_action($db, $user, 'Submitted a receipt', $disbursement['voucher_number'] . ' · ' . $vendor);
    $db->commit();
    $createdProofPath = null;
    respond(['ok' => true], 201);
}

function handle_receipt_proof(PDO $db, array $data, array $account, ?string &$createdProofPath): void
{
    $disbursementId = filter_var($data['disbursement_id'] ?? null, FILTER_VALIDATE_INT);
    if ($disbursementId === false || $disbursementId < 1) {
        throw new InvalidArgumentException('Select a valid disbursement.');
    }
    if (!isset($_FILES['proof']) || !is_array($_FILES['proof'])) {
        throw new InvalidArgumentException('Select a receipt proof image to attach.');
    }
    $proof = save_proof($_FILES['proof'], 'receipt-proofs', RECEIPT_PROOF_MIME_TYPES);
    if ($proof === null) {
        throw new InvalidArgumentException('Select a receipt proof image to attach.');
    }
    $createdProofPath = $proof['storage_path'];

    $db->beginTransaction();
    $select = $db->prepare('SELECT voucher_number, status FROM disbursements WHERE id = ? FOR UPDATE');
    $select->execute([$disbursementId]);
    $disbursement = $select->fetch();
    if (!$disbursement || $disbursement['status'] !== 'for_review') {
        throw new InvalidArgumentException('This disbursement is no longer waiting for receipt review.');
    }

    $select = $db->prepare('SELECT vendor, proof_path FROM receipts WHERE disbursement_id = ? FOR UPDATE');
    $select->execute([$disbursementId]);
    $receipt = $select->fetch();
    if (!$receipt) {
        throw new InvalidArgumentException('The submitted receipt could not be found.');
    }
    if ($receipt['proof_path'] !== null) {
        throw new InvalidArgumentException('This receipt already has a proof image.');
    }

    $update = $db->prepare(
        'UPDATE receipts SET proof_path = ?, proof_mime = ?, proof_name = ? WHERE disbursement_id = ?'
    );
    $update->execute([$proof['path'], $proof['mime'], $proof['name'], $disbursementId]);
    log_action(
        $db,
        account_actor($account),
        'Attached proof to submitted receipt',
        $disbursement['voucher_number'] . ' · ' . $receipt['vendor']
    );
    $db->commit();
    $createdProofPath = null;
    respond(['ok' => true, 'message' => 'Proof attached to the submitted receipt.']);
}
