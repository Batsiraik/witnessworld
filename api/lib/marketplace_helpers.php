<?php

declare(strict_types=1);

function ww_marketplace_like_escape(string $q): string
{
    return str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], $q);
}

function ww_marketplace_int_bounds(int $v, int $min, int $max, int $default): int
{
    if ($v < $min) {
        return $default;
    }
    if ($v > $max) {
        return $max;
    }
    return $v;
}
