<?php
declare(strict_types=1);

// Loads role-appropriate records and summary totals for the application dashboard.
function load_dashboard(PDO $db, array $account): array
{
    // Send only role-relevant management data; write permissions are checked again by each action.
    $role = $account['role'];
    $canManageFunds = in_array($role, ['Treasurer', 'Admin'], true);
    $canAudit = in_array($role, ['Auditor', 'Admin'], true);
    $funds = $db->query(
        'SELECT id, source_name, income_category, amount, received_on, note,
                proof_name, (proof_path IS NOT NULL) AS has_proof
         FROM funds ORDER BY received_on DESC, id DESC'
    )->fetchAll();
    $disbursements = $db->query(
        "SELECT d.id, d.voucher_number, d.purpose, d.person_id, p.account_id AS recipient_account_id,
                COALESCE(CONCAT(a.first_name, ' ', a.last_name), p.name) AS accountable,
                d.project_id, pr.project_name AS project, pr.status AS project_status,
                d.amount, d.released_on, d.semester, d.month, DATE_ADD(d.released_on, INTERVAL 7 DAY) AS due_on,
                d.status, d.resolution_note, r.vendor AS receipt_vendor, r.reference AS receipt_reference,
                r.amount AS receipt_amount, r.submitted_on AS receipt_submitted_on, r.note AS receipt_note,
                r.proof_name AS receipt_proof_name, (r.proof_path IS NOT NULL) AS has_receipt_proof
         FROM disbursements d
         JOIN people p ON p.id = d.person_id
         LEFT JOIN accounts a ON a.id = p.account_id
         JOIN projects pr ON pr.id = d.project_id
         LEFT JOIN receipts r ON r.disbursement_id = d.id
         ORDER BY d.released_on DESC, d.id DESC"
    )->fetchAll();
    $projects = $canManageFunds ? $db->query(
        "SELECT pr.id, pr.project_name, pr.start_date, pr.end_date, pr.semester, pr.month, pr.status,
                (SELECT COUNT(*) FROM disbursements d WHERE d.project_id = pr.id) AS linked_transactions
         FROM projects pr
         ORDER BY pr.status, pr.project_name"
    )->fetchAll() : [];
    $people = $canManageFunds ? $db->query(
        "SELECT p.id, CONCAT(a.first_name, ' ', a.last_name) AS name,
                a.email, a.role AS position, p.status,
                (SELECT COUNT(*) FROM disbursements d WHERE d.person_id = p.id) AS linked_transactions,
                EXISTS (
                    SELECT 1 FROM disbursements d
                    WHERE d.person_id = p.id AND (
                        d.status = 'flagged'
                        OR (d.status = 'awaiting_receipt'
                            AND d.released_on < CURRENT_DATE() - INTERVAL 7 DAY)
                    )
                ) AS blocked
         FROM people p
         JOIN accounts a ON a.id = p.account_id
         WHERE p.status = 'active' AND a.status = 'approved'
         ORDER BY a.last_name, a.first_name, a.email"
    )->fetchAll() : [];
    $audit = $canAudit ? load_audit_entries($db) : [];
    $accounts = $role === 'Admin' ? $db->query(
        'SELECT id, first_name, last_name, email, role, status, created_at
         FROM accounts ORDER BY CASE status
           WHEN \'pending\' THEN 1 WHEN \'approved\' THEN 2 ELSE 3 END, created_at DESC'
    )->fetchAll() : [];
    $summary = $db->query(
        "SELECT
            COALESCE((SELECT SUM(amount) FROM funds), 0) AS total_received,
            COALESCE((SELECT SUM(amount) FROM disbursements), 0) AS total_released,
            COALESCE((SELECT SUM(amount) FROM disbursements WHERE status <> 'approved'), 0) AS outstanding,
            COALESCE((SELECT SUM(amount) FROM disbursements
                WHERE status = 'awaiting_receipt'
                AND released_on < CURRENT_DATE() - INTERVAL 7 DAY), 0) AS overdue,
            (SELECT COUNT(*) FROM disbursements WHERE status = 'for_review') AS review_count,
            (SELECT COUNT(*) FROM disbursements WHERE status = 'awaiting_receipt') AS outstanding_count,
            (SELECT COUNT(*) FROM disbursements
                WHERE status = 'awaiting_receipt'
                AND released_on < CURRENT_DATE() - INTERVAL 7 DAY) AS overdue_count,
            (SELECT COUNT(DISTINCT person_id) FROM disbursements
                WHERE status = 'flagged'
                OR (status = 'awaiting_receipt'
                    AND released_on < CURRENT_DATE() - INTERVAL 7 DAY)) AS blocked_people"
    )->fetch();

    return [
        'funds' => $funds,
        'disbursements' => $disbursements,
        'projects' => $projects,
        'people' => $people,
        'audit' => $audit,
        'accounts' => $accounts,
        'summary' => [
            'total_received' => (float)$summary['total_received'],
            'total_released' => (float)$summary['total_released'],
            'cash_on_hand' => (float)$summary['total_received'] - (float)$summary['total_released'],
            'outstanding' => (float)$summary['outstanding'],
            'overdue' => (float)$summary['overdue'],
            'review_count' => (int)$summary['review_count'],
            'outstanding_count' => (int)$summary['outstanding_count'],
            'overdue_count' => (int)$summary['overdue_count'],
            'blocked_people' => (int)$summary['blocked_people'],
        ],
    ];
}
