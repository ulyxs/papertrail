<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

// Keep the public API path stable while delegating shared and domain logic to modules.
$serverRoot = dirname(__DIR__);
require_once $serverRoot . '/config/database.php';
require_once $serverRoot . '/helpers/http.php';
require_once $serverRoot . '/helpers/validation.php';
require_once $serverRoot . '/helpers/financial.php';
require_once $serverRoot . '/helpers/proofs.php';
require_once $serverRoot . '/helpers/audit.php';
require_once $serverRoot . '/auth/session.php';
require_once $serverRoot . '/middleware/auth.php';
require_once $serverRoot . '/auth/handlers.php';
require_once $serverRoot . '/modules/audit.php';
require_once $serverRoot . '/modules/dashboard.php';
require_once $serverRoot . '/modules/accounts.php';
require_once $serverRoot . '/modules/funds.php';
require_once $serverRoot . '/modules/projects.php';
require_once $serverRoot . '/modules/disbursements.php';
require_once $serverRoot . '/modules/receipts.php';
require_once $serverRoot . '/modules/review.php';

$createdProofPath = null;

try {
    start_app_session();
    $db = database_connection();
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    $action = $_GET['action'] ?? 'dashboard';

    if ($method === 'GET' && $action === 'auth-status') {
        handle_auth_status($db);
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
    $data = in_array($action, ['funds', 'fund-proof', 'receipt', 'receipt-proof'], true) ? $_POST : request_data();

    if ($action === 'register') {
        handle_registration($db, $data);
    }
    if ($action === 'login') {
        handle_login($db, $data);
    }

    $account = require_account($db);
    if ($action === 'logout') {
        handle_logout($db, $account);
    }
    if ($action === 'account') {
        require_roles($account, ['Admin']);
        handle_account_management($db, $data, $account);
    }

    $rolePermissions = [
        'funds' => ['Treasurer', 'Admin'],
        'fund-proof' => ['Treasurer', 'Admin'],
        'project' => ['Treasurer', 'Admin'],
        'release' => ['Treasurer', 'Admin'],
        'receipt' => ['Treasurer', 'Admin'],
        'receipt-proof' => ['Treasurer', 'Admin'],
        'review' => ['Auditor', 'Admin'],
    ];
    if (!isset($rolePermissions[$action])) {
        respond(['error' => 'Unknown action.'], 404);
    }
    require_roles($account, $rolePermissions[$action]);

    $handlers = [
        'funds' => static function () use ($db, $data, $account, &$createdProofPath): void {
            handle_funds($db, $data, $account, $createdProofPath);
        },
        'fund-proof' => static function () use ($db, $data, $account, &$createdProofPath): void {
            handle_fund_proof($db, $data, $account, $createdProofPath);
        },
        'project' => static function () use ($db, $data, $account): void {
            handle_project($db, $data, $account);
        },
        'release' => static function () use ($db, $data, $account): void {
            handle_release($db, $data, $account);
        },
        'receipt' => static function () use ($db, $data, $account, &$createdProofPath): void {
            handle_receipt($db, $data, $account, $createdProofPath);
        },
        'receipt-proof' => static function () use ($db, $data, $account, &$createdProofPath): void {
            handle_receipt_proof($db, $data, $account, $createdProofPath);
        },
        'review' => static function () use ($db, $data, $account): void {
            handle_review($db, $data, $account);
        },
    ];
    $handlers[$action]();
} catch (InvalidArgumentException $exception) {
    if (isset($db) && $db instanceof PDO && $db->inTransaction()) {
        $db->rollBack();
    }
    if ($createdProofPath !== null && is_file($createdProofPath)) {
        unlink($createdProofPath);
    }
    respond(['error' => $exception->getMessage()], 422);
} catch (Throwable $exception) {
    if (isset($db) && $db instanceof PDO && $db->inTransaction()) {
        $db->rollBack();
    }
    if ($createdProofPath !== null && is_file($createdProofPath)) {
        unlink($createdProofPath);
    }
    error_log($exception->__toString());
    respond(['error' => 'The server could not complete the request. Check the PHP error log for details.'], 500);
}
