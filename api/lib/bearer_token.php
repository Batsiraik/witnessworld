<?php

declare(strict_types=1);

function ww_bearer_token(): ?string
{
    $h = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';

    if ($h === '' && !empty($_SERVER['HTTP_X_AUTH_TOKEN'])) {
        return trim((string) $_SERVER['HTTP_X_AUTH_TOKEN']);
    }

    if ($h === '' && function_exists('getallheaders')) {
        foreach (getallheaders() as $key => $value) {
            if (strcasecmp((string) $key, 'Authorization') === 0) {
                $h = (string) $value;
                break;
            }
            if (strcasecmp((string) $key, 'X-Auth-Token') === 0) {
                $t = trim((string) $value);
                if ($t !== '') {
                    return $t;
                }
            }
        }
    }

    if (preg_match('/Bearer\s+(\S+)/i', $h, $m)) {
        return $m[1];
    }

    return null;
}
