<?php
declare(strict_types=1);

// Applies auditor decisions while preserving amount checks and transaction integrity.
function handle_review(PDO $db, array $data, array $account): void
{
    $user = account_actor($account);
    $disbursementId = filter_var($data['disbursement_id'] ?? null, FILTER_VALIDATE_INT);
    if ($disbursementId === false || $disbursementId < 1) {
        throw new InvalidArgumentException('Select a valid disbursement.');
    }
    $decision = $data['decision'] ?? '';
    if (!in_array($decision, ['approve', 'flag', 'resolve'], true)) {
        throw new InvalidArgumentException('Decision must be approve, flag, or resolve.');
    }
    $resolutionNote = trim((string)($data['resolution_note'] ?? ''));
    if (mb_strlen($resolutionNote) > 500) {
        throw new InvalidArgumentException('Resolution note must be at most 500 characters.');
    }
    if ($decision === 'resolve' && $resolutionNote === '') {
        throw new InvalidArgumentException('Describe how the flagged discrepancy was resolved.');
    }

    $db->beginTransaction();
    $expectedStatus = $decision === 'resolve' ? 'flagged' : 'for_review';
    $select = $db->prepare(
        'SELECT d.voucher_number, d.amount, r.amount AS receipt_amount
         FROM disbursements d JOIN receipts r ON r.disbursement_id = d.id
         WHERE d.id = ? AND d.status = ? FOR UPDATE'
    );
    $select->execute([$disbursementId, $expectedStatus]);
    $disbursement = $select->fetch();
    if (!$disbursement) {
        throw new InvalidArgumentException('This disbursement is no longer waiting for that decision.');
    }
    // A receipt is approved only when its amount exactly matches the released amount.
    if ($decision === 'approve'
        && amount_cents((string)$disbursement['amount']) !== amount_cents((string)$disbursement['receipt_amount'])) {
        throw new InvalidArgumentException('The receipt amount does not match the release. Flag the discrepancy instead of approving it.');
    }

    $status = $decision === 'flag' ? 'flagged' : 'approved';
    $update = $db->prepare('UPDATE disbursements SET status = ?, resolution_note = ? WHERE id = ?');
    $update->execute([$status, $decision === 'resolve' ? $resolutionNote : null, $disbursementId]);
    $actionLabel = [
        'approve' => 'Approved a transaction',
        'flag' => 'Flagged a discrepancy',
        'resolve' => 'Resolved a flagged transaction',
    ][$decision];
    $detail = $disbursement['voucher_number'];
    if ($decision === 'resolve') {
        $detail .= ' · ' . $resolutionNote;
    }
    log_action($db, $user, $actionLabel, $detail);
    $db->commit();
    respond(['ok' => true], 200);
}
