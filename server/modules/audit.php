<?php
declare(strict_types=1);

// Reads audit entries for users authorized to inspect activity history.
function load_audit_entries(PDO $db): array
{
    return $db->query(
        'SELECT id, actor, action, detail, created_at FROM audit_log ORDER BY id DESC'
    )->fetchAll();
}
