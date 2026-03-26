<?php

declare(strict_types=1);

/**
 * @return array{0: int, 1: int}
 */
function ww_conv_ordered_pair(int $a, int $b): array
{
    if ($a === $b) {
        throw new InvalidArgumentException('same_user');
    }
    return $a < $b ? [$a, $b] : [$b, $a];
}

function ww_conv_context_key(string $type, int $subjectId): string
{
    $type = strtolower(trim($type));
    if ($type === 'general' || $type === '') {
        return 'general';
    }
    if (!in_array($type, ['listing', 'store', 'product', 'directory_entry'], true)) {
        throw new InvalidArgumentException('bad_context');
    }
    if ($subjectId <= 0) {
        throw new InvalidArgumentException('bad_subject');
    }
    return $type . ':' . $subjectId;
}
