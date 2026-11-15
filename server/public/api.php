<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

const MAX_PROOF_SIZE = 5242880;
const DUMMY_PASSWORD_HASH = '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.';
const PROOF_MIME_TYPES = [
    'image/jpeg' => 'jpg',
    'image/png' => 'png',
    'image/webp' => 'webp',
];
const RECEIPT_PROOF_MIME_TYPES = [
    'image/jpeg' => 'jpg',
    'image/png' => 'png',
];

function respond(array $body, int $status = 200): void
{
    http_response_code($status);
    echo json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function request_data(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === false || $raw === '') {
        return [];
    }

    try {
        $data = json_decode($raw, true, 512, JSON_THROW_ON_ERROR);
    } catch (JsonException $exception) {
        throw new InvalidArgumentException('Request body must be valid JSON.');
    }

    if (!is_array($data)) {
        throw new InvalidArgumentException('Request body must be a JSON object.');
    }

    return $data;
}

function required_string(array $data, string $key, int $maxLength): string
{
    $value = trim((string)($data[$key] ?? ''));
    if ($value === '' || mb_strlen($value) > $maxLength) {
        throw new InvalidArgumentException(ucfirst(str_replace('_', ' ', $key)) . ' is required and must be at most ' . $maxLength . ' characters.');
    }

    return $value;
}

function valid_date(array $data, string $key): string
{
    $value = required_string($data, $key, 10);
    $date = DateTimeImmutable::createFromFormat('!Y-m-d', $value);
    if ($date === false || $date->format('Y-m-d') !== $value) {
        throw new InvalidArgumentException(ucfirst(str_replace('_', ' ', $key)) . ' must be a valid date.');
    }

    return $value;
}

function valid_amount(array $data, string $key): string
{
    $value = trim((string)($data[$key] ?? ''));
    if (!preg_match('/^(\d{1,10})(?:\.(\d{1,2}))?$/', $value, $matches)) {
        throw new InvalidArgumentException(ucfirst(str_replace('_', ' ', $key)) . ' must be greater than zero and have no more than two decimal places.');
    }

    $whole = ltrim($matches[1], '0') ?: '0';
    $fraction = str_pad($matches[2] ?? '', 2, '0');
    if ((int)$whole === 0 && (int)$fraction === 0) {
        throw new InvalidArgumentException(ucfirst(str_replace('_', ' ', $key)) . ' must be greater than zero and have no more than two decimal places.');
    }

    return $whole . '.' . $fraction;
}

function amount_cents(string $value): int
{
    // Convert validated decimal strings to integer cents for exact financial comparisons.
    [$whole, $fraction] = array_pad(explode('.', $value, 2), 2, '0');
    return ((int)$whole * 100) + (int)str_pad($fraction, 2, '0');
}

function save_proof(array $file, string $folder, array $allowedMimeTypes): ?array
{
    $error = $file['error'] ?? UPLOAD_ERR_NO_FILE;
    if ($error === UPLOAD_ERR_NO_FILE) {
        return null;
    }
    if ($error !== UPLOAD_ERR_OK) {
        throw new InvalidArgumentException('The proof image could not be uploaded. Check your PHP upload size settings and try again.');
    }
    if (!isset($file['tmp_name'], $file['size']) || (int)$file['size'] < 1 || (int)$file['size'] > MAX_PROOF_SIZE) {
        throw new InvalidArgumentException('Proof images must be no larger than 5 MB.');
    }
    if (!is_uploaded_file($file['tmp_name'])) {
        throw new InvalidArgumentException('The proof upload is invalid.');
    }

    // Verify the file contents, not its submitted name or browser-provided content type.
    $imageInfo = getimagesize($file['tmp_name']);
    $mime = (new finfo(FILEINFO_MIME_TYPE))->file($file['tmp_name']);
    if ($imageInfo === false
        || !isset($allowedMimeTypes[$mime])
        || image_type_to_mime_type($imageInfo[2]) !== $mime) {
        throw new InvalidArgumentException('Proof must be a valid JPEG, PNG, or WebP image.');
    }
    if ($imageInfo[0] * $imageInfo[1] > 40000000) {
        throw new InvalidArgumentException('Proof images must be 40 megapixels or smaller.');
    }

    if (!in_array($folder, ['fund-proofs', 'receipt-proofs'], true)) {
        throw new RuntimeException('Invalid proof storage location.');
    }
    // Store uploads outside the public directory and use a random server-generated filename.
    $storagePath = dirname(__DIR__) . DIRECTORY_SEPARATOR . 'storage' . DIRECTORY_SEPARATOR . $folder;
    if (!is_dir($storagePath) && !mkdir($storagePath, 0700, true) && !is_dir($storagePath)) {
        throw new RuntimeException('Could not create proof storage.');
    }

    $filename = bin2hex(random_bytes(24)) . '.' . $allowedMimeTypes[$mime];
    if (!move_uploaded_file($file['tmp_name'], $storagePath . DIRECTORY_SEPARATOR . $filename)) {
        throw new RuntimeException('Could not save proof image.');
    }

    $originalName = basename(str_replace('\\', '/', (string)($file['name'] ?? 'proof')));
    $originalName = mb_substr(preg_replace('/[\x00-\x1F\x7F]/u', '', $originalName) ?: 'proof', 0, 255);

    return [
        'path' => $filename,
        'mime' => $mime,
        'name' => $originalName,
        'storage_path' => $storagePath . DIRECTORY_SEPARATOR . $filename,
    ];
}

function serve_proof(PDO $db, string $action, int $recordId): void
{
    // Only fixed table/column mappings are accepted; request data never becomes a filesystem path.
    $queries = [
        'proof' => ['SELECT proof_path, proof_mime FROM funds WHERE id = ?', 'fund-proofs'],
        'receipt-proof' => ['SELECT proof_path, proof_mime FROM receipts WHERE disbursement_id = ?', 'receipt-proofs'],
    ];
    if (!isset($queries[$action])) {
        respond(['error' => 'Unknown proof type.'], 404);
    }

    [$query, $folder] = $queries[$action];
    $statement = $db->prepare($query);
    $statement->execute([$recordId]);
    $proof = $statement->fetch();
    $allowedMimeTypes = $action === 'proof' ? PROOF_MIME_TYPES : RECEIPT_PROOF_MIME_TYPES;
    if (!$proof || !$proof['proof_path'] || !isset($allowedMimeTypes[$proof['proof_mime']])) {
        respond(['error' => 'No proof image is available for this transaction.'], 404);
    }

    $filename = (string)$proof['proof_path'];
    if (!preg_match('/^[a-f0-9]{48}\.(?:jpg|png|webp)$/', $filename)) {
        respond(['error' => 'The stored proof reference is invalid.'], 404);
    }
    $path = dirname(__DIR__) . DIRECTORY_SEPARATOR . 'storage' . DIRECTORY_SEPARATOR . $folder . DIRECTORY_SEPARATOR . $filename;
    if (!is_file($path) || !is_readable($path)) {
        respond(['error' => 'The proof image could not be found.'], 404);
    }

    header('Content-Type: ' . $proof['proof_mime']);
    header('X-Content-Type-Options: nosniff');
    header('Content-Length: ' . filesize($path));
    readfile($path);
    exit;
}

function log_action(PDO $db, string $actor, string $action, string $detail): void
{
    $statement = $db->prepare('INSERT INTO audit_log (actor, action, detail) VALUES (?, ?, ?)');
    $statement->execute([$actor, $action, $detail]);
}

function normalized_email(array $data): string
{
    $email = mb_strtolower(trim((string)($data['email'] ?? '')));
    if ($email === '' || strlen($email) > 254 || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        throw new InvalidArgumentException('Enter a valid email address.');
    }

    return $email;
}

function public_account(array $account): array
{
    return [
        'id' => (int)$account['id'],
        'first_name' => $account['first_name'],
        'last_name' => $account['last_name'],
        'email' => $account['email'],
        'role' => $account['role'],
        'status' => $account['status'],
    ];
}

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
                d.project_id, pr.project_name AS project,
                d.amount, d.released_on, DATE_ADD(d.released_on, INTERVAL 7 DAY) AS due_on,
                d.status, r.vendor AS receipt_vendor, r.reference AS receipt_reference,
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
        "SELECT pr.id, pr.project_name, pr.start_date, pr.end_date, pr.status,
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
                            AND DATE_ADD(d.released_on, INTERVAL 7 DAY) < CURRENT_DATE())
                    )
                ) AS blocked
         FROM people p
         JOIN accounts a ON a.id = p.account_id
         WHERE p.status = 'active' AND a.status = 'approved'
         ORDER BY a.last_name, a.first_name, a.email"
    )->fetchAll() : [];
    $personnel = $canManageFunds ? $db->query(
        'SELECT id, first_name, last_name, email, role, status, created_at
         FROM accounts ORDER BY last_name, first_name, email'
    )->fetchAll() : [];
    $audit = $canAudit
        ? $db->query('SELECT id, actor, action, detail, created_at FROM audit_log ORDER BY id DESC')->fetchAll()
        : [];
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
                AND DATE_ADD(released_on, INTERVAL 7 DAY) < CURRENT_DATE()), 0) AS overdue,
            (SELECT COUNT(*) FROM disbursements WHERE status = 'for_review') AS review_count,
            (SELECT COUNT(*) FROM disbursements WHERE status = 'awaiting_receipt') AS outstanding_count,
            (SELECT COUNT(*) FROM disbursements
                WHERE status = 'awaiting_receipt'
                AND DATE_ADD(released_on, INTERVAL 7 DAY) < CURRENT_DATE()) AS overdue_count,
            (SELECT COUNT(DISTINCT person_id) FROM disbursements
                WHERE status = 'flagged'
                OR (status = 'awaiting_receipt'
                    AND DATE_ADD(released_on, INTERVAL 7 DAY) < CURRENT_DATE())) AS blocked_people"
    )->fetch();

    return [
        'funds' => $funds,
        'disbursements' => $disbursements,
        'projects' => $projects,
        'people' => $people,
        'personnel' => $personnel,
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

$createdProofPath = null;
require dirname(__DIR__) . '/auth.php';

try {
    start_app_session();
    $config = require dirname(__DIR__) . '/config.php';
    $dsn = sprintf(
        'mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4',
        $config['host'],
        $config['port'],
        $config['database']
    );
    $db = new PDO($dsn, $config['username'], $config['password'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);

    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    $action = $_GET['action'] ?? 'dashboard';

    if ($method === 'GET' && $action === 'auth-status') {
        $account = session_account($db);
        respond([
            'user' => $account ? public_account($account) : null,
            'csrf_token' => ensure_csrf_token(),
        ]);
    }

    if ($method === 'GET' && in_array($action, ['proof', 'receipt-proof'], true)) {
        require_account($db);
        $recordId = filter_var($_GET['id'] ?? null, FILTER_VALIDATE_INT);
        if ($recordId === false || $recordId < 1) {
            respond(['error' => 'A valid transaction ID is required.'], 422);
        }
        serve_proof($db, $action, $recordId);
    }

    if ($method === 'GET' && $action === 'dashboard') {
        $account = require_account($db);
        respond(load_dashboard($db, $account));
    }

    if ($method !== 'POST') {
        header('Allow: GET, POST');
        respond(['error' => 'Method not allowed.'], 405);
    }

    verify_csrf_token();
    $data = in_array($action, ['funds', 'receipt'], true) ? $_POST : request_data();

    if ($action === 'register') {
        $firstName = required_string($data, 'first_name', 80);
        $lastName = required_string($data, 'last_name', 80);
        $email = normalized_email($data);
        $password = (string)($data['password'] ?? '');
        $confirmation = (string)($data['confirm_password'] ?? '');
        if (strlen($password) < 8 || strlen($password) > 72) {
            throw new InvalidArgumentException('Password must be between 8 and 72 bytes.');
        }
        if (!hash_equals($password, $confirmation)) {
            throw new InvalidArgumentException('Password and Confirm Password must match.');
        }

        // The database default keeps public registrations pending and assigns no elevated role.
        $db->beginTransaction();
        $insert = $db->prepare(
            'INSERT INTO accounts (first_name, last_name, email, password_hash)
             VALUES (?, ?, ?, ?)'
        );
        try {
            $insert->execute([$firstName, $lastName, $email, password_hash($password, PASSWORD_DEFAULT)]);
        } catch (PDOException $exception) {
            if ((int)($exception->errorInfo[1] ?? 0) === 1062) {
                throw new InvalidArgumentException('An account with that email address already exists.');
            }
            throw $exception;
        }
        log_action($db, 'System', 'Registered an account', $firstName . ' ' . $lastName . ' · ' . $email);
        $db->commit();
        respond(['ok' => true, 'status' => 'pending'], 201);
    }

    if ($action === 'login') {
        $email = mb_strtolower(trim((string)($data['email'] ?? '')));
        $password = (string)($data['password'] ?? '');
        $statement = $db->prepare(
            'SELECT id, first_name, last_name, email, password_hash, role, status
             FROM accounts WHERE email = ?'
        );
        $statement->execute([$email]);
        $account = $statement->fetch();
        $storedHash = $account['password_hash'] ?? DUMMY_PASSWORD_HASH;
        $passwordMatches = password_verify(substr($password, 0, 72), $storedHash);
        // Verify a dummy hash for unknown emails to reduce account-enumeration timing differences.
        if (!$account || strlen($password) > 72 || !$passwordMatches) {
            respond(['error' => 'Email address or password is incorrect.'], 401);
        }
        if ($account['status'] === 'pending') {
            respond(['error' => 'Your account is pending Admin approval.'], 403);
        }
        if ($account['status'] === 'disapproved') {
            respond(['error' => 'Your account was disapproved. Contact an Admin for assistance.'], 403);
        }

        if (!session_regenerate_id(true)) {
            throw new RuntimeException('Could not establish a secure login session.');
        }
        $_SESSION['account_id'] = (int)$account['id'];
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
        if (password_needs_rehash($account['password_hash'], PASSWORD_DEFAULT)) {
            $rehash = $db->prepare('UPDATE accounts SET password_hash = ? WHERE id = ?');
            $rehash->execute([password_hash($password, PASSWORD_DEFAULT), $account['id']]);
        }
        respond([
            'ok' => true,
            'user' => public_account($account),
            'csrf_token' => $_SESSION['csrf_token'],
        ]);
    }

    $account = require_account($db);
    if ($action === 'logout') {
        log_action($db, account_actor($account), 'Signed out', $account['email']);
        $_SESSION = [];
        $cookie = session_get_cookie_params();
        setcookie(session_name(), '', [
            'expires' => time() - 42000,
            'path' => $cookie['path'],
            'domain' => $cookie['domain'],
            'secure' => $cookie['secure'],
            'httponly' => $cookie['httponly'],
            'samesite' => $cookie['samesite'] ?? 'Lax',
        ]);
        session_destroy();
        respond(['ok' => true]);
    }

    $user = account_actor($account);

    if ($action === 'account') {
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

    // Client-side navigation is for usability; these API checks enforce actual write access.
    $rolePermissions = [
        'funds' => ['Treasurer', 'Admin'],
        'project' => ['Treasurer', 'Admin'],
        'release' => ['Treasurer', 'Admin'],
        'receipt' => ['Treasurer', 'Admin'],
        'review' => ['Auditor', 'Admin'],
    ];
    if (!isset($rolePermissions[$action])) {
        respond(['error' => 'Unknown action.'], 404);
    }
    require_roles($account, $rolePermissions[$action]);

    if ($action === 'funds') {
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

        // Serialize releases so concurrent requests cannot overspend the same cash balance.
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

    if ($action === 'project') {
        $operation = $data['operation'] ?? '';
        if (!in_array($operation, ['create', 'update', 'archive', 'activate', 'delete'], true)) {
            throw new InvalidArgumentException('Choose a valid project action.');
        }

        $projectId = null;
        if ($operation !== 'create') {
            $projectId = filter_var($data['project_id'] ?? null, FILTER_VALIDATE_INT);
            if ($projectId === false || $projectId < 1) {
                throw new InvalidArgumentException('Select a valid project.');
            }
        }

        $db->beginTransaction();
        if ($operation === 'create' || $operation === 'update') {
            $projectName = required_string($data, 'project_name', 180);
            $startDate = valid_date($data, 'start_date');
            $endDate = valid_date($data, 'end_date');
            if ($startDate > $endDate) {
                throw new InvalidArgumentException('Project end date must be on or after the start date.');
            }

            if ($operation === 'update') {
                $select = $db->prepare('SELECT id FROM projects WHERE id = ? FOR UPDATE');
                $select->execute([$projectId]);
                if (!$select->fetch()) {
                    throw new InvalidArgumentException('The selected project does not exist.');
                }
            }

            $duplicate = $db->prepare($operation === 'create'
                ? 'SELECT id FROM projects WHERE project_name = ? FOR UPDATE'
                : 'SELECT id FROM projects WHERE project_name = ? AND id <> ? FOR UPDATE'
            );
            $duplicate->execute($operation === 'create' ? [$projectName] : [$projectName, $projectId]);
            if ($duplicate->fetch()) {
                throw new InvalidArgumentException('A project with that name already exists.');
            }

            if ($operation === 'create') {
                $insert = $db->prepare('INSERT INTO projects (project_name, start_date, end_date) VALUES (?, ?, ?)');
                $insert->execute([$projectName, $startDate, $endDate]);
                $projectId = (int)$db->lastInsertId();
                $logDetail = 'Created project ' . $projectName;
            } else {
                $update = $db->prepare('UPDATE projects SET project_name = ?, start_date = ?, end_date = ? WHERE id = ?');
                $update->execute([$projectName, $startDate, $endDate, $projectId]);
                $logDetail = 'Updated project ' . $projectName;
            }
            log_action($db, $user, $operation === 'create' ? 'Created a project' : 'Updated a project', $logDetail);
        } else {
            $select = $db->prepare('SELECT id, project_name FROM projects WHERE id = ? FOR UPDATE');
            $select->execute([$projectId]);
            $project = $select->fetch();
            if (!$project) {
                throw new InvalidArgumentException('The selected project does not exist.');
            }

            if ($operation === 'delete') {
                $linked = $db->prepare('SELECT COUNT(*) FROM disbursements WHERE project_id = ?');
                $linked->execute([$projectId]);
                if ((int)$linked->fetchColumn() > 0) {
                    throw new InvalidArgumentException('This project has financial records and cannot be deleted. Archive it instead.');
                }
                $delete = $db->prepare('DELETE FROM projects WHERE id = ?');
                $delete->execute([$projectId]);
                log_action($db, $user, 'Deleted a project', $project['project_name']);
            } else {
                $status = $operation === 'archive' ? 'archived' : 'active';
                $update = $db->prepare('UPDATE projects SET status = ? WHERE id = ?');
                $update->execute([$status, $projectId]);
                log_action(
                    $db,
                    $user,
                    $operation === 'archive' ? 'Archived a project' : 'Reactivated a project',
                    $project['project_name']
                );
            }
        }

        $db->commit();
        respond(['ok' => true, 'project_id' => $projectId], 200);
    }

    if ($action === 'release') {
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
                (voucher_number, purpose, person_id, project_id, amount, released_on)
             VALUES (?, ?, ?, ?, ?, ?)"
        );
        $insert->execute([$voucher, $purpose, $personId, $projectId, $amount, $releasedOn]);
        log_action($db, $user, 'Released funds', $voucher . ' · ' . $project['project_name'] . ' · ₱' . $amount . ' to ' . $person['name']);
        $db->commit();
        respond(['ok' => true, 'voucher_number' => $voucher], 201);
    }

    if ($action === 'receipt') {
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

    if ($action === 'review') {
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
        $update = $db->prepare('UPDATE disbursements SET status = ? WHERE id = ?');
        $update->execute([$status, $disbursementId]);
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

    respond(['error' => 'Unknown action.'], 404);
} catch (InvalidArgumentException $exception) {
    if (isset($db) && $db instanceof PDO && $db->inTransaction()) {
        $db->rollBack();
    }
    // Do not leave an uploaded proof orphaned if its database transaction fails.
    if ($createdProofPath !== null) {
        if (is_file($createdProofPath)) {
            unlink($createdProofPath);
        }
    }
    respond(['error' => $exception->getMessage()], 422);
} catch (Throwable $exception) {
    if (isset($db) && $db instanceof PDO && $db->inTransaction()) {
        $db->rollBack();
    }
    if ($createdProofPath !== null) {
        if (is_file($createdProofPath)) {
            unlink($createdProofPath);
        }
    }
    error_log($exception->__toString());
    respond(['error' => 'The server could not complete the request. Check the PHP error log for details.'], 500);
}
