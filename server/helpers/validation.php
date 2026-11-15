<?php
declare(strict_types=1);

// Validates and normalizes values accepted by financial and account workflows.
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
