<?php
declare(strict_types=1);

const MAX_PROOF_SIZE = 5242880;
const PROOF_MIME_TYPES = [
    'image/jpeg' => 'jpg',
    'image/png' => 'png',
    'image/webp' => 'webp',
];
const RECEIPT_PROOF_MIME_TYPES = [
    'image/jpeg' => 'jpg',
    'image/png' => 'png',
];

// Stores verified proof images outside the public directory and serves authorized records.
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
