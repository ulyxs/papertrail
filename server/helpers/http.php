<?php
declare(strict_types=1);

// Shared JSON response and request-body parsing helpers for the API.
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
