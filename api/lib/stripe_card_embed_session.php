<?php

declare(strict_types=1);

/**
 * Short-lived server-side session for embedded card WebView (no JWT in URL).
 * Stored as JSON files under the system temp directory.
 */
function ww_stripe_embed_cache_dir(): string
{
    $dir = rtrim(sys_get_temp_dir(), DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . 'ww_stripe_embed';
    if (!is_dir($dir)) {
        @mkdir($dir, 0700, true);
    }

    return $dir;
}

/** @param array{user_id: int, client_secret: string, publishable_key: string, setup_intent_id: string} $data */
function ww_stripe_embed_save(string $id, array $data): void
{
    if (!preg_match('/^[a-f0-9]{64}$/', $id)) {
        throw new InvalidArgumentException('Invalid embed id');
    }
    $payload = array_merge($data, ['_created' => time()]);
    $path = ww_stripe_embed_cache_dir() . DIRECTORY_SEPARATOR . $id . '.json';
    file_put_contents($path, json_encode($payload, JSON_THROW_ON_ERROR), LOCK_EX);
}

/**
 * @return array{user_id: int, client_secret: string, publishable_key: string, setup_intent_id: string}|null
 */
function ww_stripe_embed_load(string $id): ?array
{
    if (!preg_match('/^[a-f0-9]{64}$/', $id)) {
        return null;
    }
    $path = ww_stripe_embed_cache_dir() . DIRECTORY_SEPARATOR . $id . '.json';
    if (!is_file($path)) {
        return null;
    }
    $raw = @file_get_contents($path);
    if ($raw === false || $raw === '') {
        return null;
    }
    try {
        /** @var array<string, mixed> $d */
        $d = json_decode($raw, true, 512, JSON_THROW_ON_ERROR);
    } catch (\Throwable) {
        @unlink($path);

        return null;
    }
    $created = (int) ($d['_created'] ?? 0);
    if ($created < 1 || (time() - $created) > 900) {
        @unlink($path);

        return null;
    }
    $userId = (int) ($d['user_id'] ?? 0);
    $cs = (string) ($d['client_secret'] ?? '');
    $pk = (string) ($d['publishable_key'] ?? '');
    $seti = (string) ($d['setup_intent_id'] ?? '');
    if ($userId < 1 || $cs === '' || $pk === '' || $seti === '') {
        @unlink($path);

        return null;
    }

    return [
        'user_id' => $userId,
        'client_secret' => $cs,
        'publishable_key' => $pk,
        'setup_intent_id' => $seti,
    ];
}

function ww_stripe_embed_delete(string $id): void
{
    if (!preg_match('/^[a-f0-9]{64}$/', $id)) {
        return;
    }
    $path = ww_stripe_embed_cache_dir() . DIRECTORY_SEPARATOR . $id . '.json';
    if (is_file($path)) {
        @unlink($path);
    }
}
