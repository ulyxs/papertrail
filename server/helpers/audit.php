<?php
declare(strict_types=1);

// Writes a financial or account action to the shared audit log.
function log_action(PDO $db, string $actor, string $action, string $detail): void
{
    $statement = $db->prepare('INSERT INTO audit_log (actor, action, detail) VALUES (?, ?, ?)');
    $statement->execute([$actor, $action, $detail]);
}
