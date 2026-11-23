<?php
declare(strict_types=1);

// Creates the shared PDO connection using environment-configured database settings.
function database_connection(): PDO
{
    $host = getenv('DB_HOST') ?: '127.0.0.1';
    $port = getenv('DB_PORT') ?: '3306';
    $database = getenv('DB_NAME') ?: 'treasury_ledger';
    $username = getenv('DB_USER') ?: 'root';
    $password = getenv('DB_PASSWORD') ?: '';
    $dsn = sprintf('mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4', $host, $port, $database);

    $db = new PDO($dsn, $username, $password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);

    $projectColumns = $db->query("SHOW COLUMNS FROM projects")->fetchAll();
    $projectColumnNames = array_column($projectColumns, 'Field');
    if (!in_array('semester', $projectColumnNames, true)) {
        $db->exec("ALTER TABLE projects
            ADD COLUMN semester ENUM('First Semester', 'Second Semester', 'Summer') NULL AFTER end_date");
    }
    if (!in_array('month', $projectColumnNames, true)) {
        $db->exec("ALTER TABLE projects
            ADD COLUMN month TINYINT UNSIGNED NULL AFTER semester");
    }

    $columns = $db->query("SHOW COLUMNS FROM disbursements")->fetchAll();
    $columnNames = array_column($columns, 'Field');
    $needsUpgrade = false;
    if (!in_array('semester', $columnNames, true)) {
        $db->exec("ALTER TABLE disbursements
            ADD COLUMN semester ENUM('First Semester', 'Second Semester', 'Summer') NULL AFTER released_on");
        $needsUpgrade = true;
    }
    if (!in_array('month', $columnNames, true)) {
        $db->exec("ALTER TABLE disbursements
            ADD COLUMN month TINYINT UNSIGNED NULL AFTER semester");
        $needsUpgrade = true;
    }
    if ($needsUpgrade) {
        $db->exec("UPDATE disbursements SET
            month = MONTH(released_on),
            semester = CASE
                WHEN MONTH(released_on) >= 8 THEN 'First Semester'
                WHEN MONTH(released_on) <= 5 THEN 'Second Semester'
                ELSE 'Summer'
            END
            WHERE semester IS NULL OR month IS NULL");
        $db->exec("ALTER TABLE disbursements
            MODIFY COLUMN semester ENUM('First Semester', 'Second Semester', 'Summer') NOT NULL,
            MODIFY COLUMN month TINYINT UNSIGNED NOT NULL");
    }

    return $db;
}
