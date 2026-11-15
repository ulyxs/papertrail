<?php
declare(strict_types=1);

// Converts monetary values to integer cents for exact balance comparisons.
function amount_cents(string $value): int
{
    // Convert validated decimal strings to integer cents for exact financial comparisons.
    [$whole, $fraction] = array_pad(explode('.', $value, 2), 2, '0');
    return ((int)$whole * 100) + (int)str_pad($fraction, 2, '0');
}
