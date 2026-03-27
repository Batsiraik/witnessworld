<?php

declare(strict_types=1);

/**
 * @param array<string, mixed> $data String values only in payload (Expo requirement).
 * @return array<string, mixed>
 */
function ww_expo_push_build_message(string $to, string $title, string $body, array $data = []): array
{
    $msg = [
        'to' => $to,
        'title' => $title,
        'body' => $body,
        'sound' => 'default',
        'priority' => 'high',
        'channelId' => 'default',
    ];
    if ($data !== []) {
        $strData = [];
        foreach ($data as $k => $v) {
            $strData[(string) $k] = is_scalar($v) ? (string) $v : json_encode($v);
        }
        $msg['data'] = $strData;
    }

    return $msg;
}

/**
 * @param list<array<string, mixed>> $messages
 * @return array{accepted: int, rejected: int, ticket_ids: list<string>, error_samples: list<string>}
 */
function ww_expo_push_send_detailed(array $messages): array
{
    $accepted = 0;
    $rejected = 0;
    /** @var list<string> */
    $ticketIds = [];
    /** @var list<string> */
    $errorSamples = [];

    if ($messages === []) {
        return ['accepted' => 0, 'rejected' => 0, 'ticket_ids' => [], 'error_samples' => []];
    }

    $chunks = array_chunk($messages, 99);
    foreach ($chunks as $chunk) {
        $payload = json_encode($chunk, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
        $ch = curl_init('https://exp.host/--/api/v2/push/send');
        if ($ch === false) {
            $rejected += count($chunk);
            continue;
        }
        $headers = [
            'Content-Type: application/json',
            'Accept: application/json',
        ];
        $access = getenv('EXPO_ACCESS_TOKEN');
        if (is_string($access) && $access !== '') {
            $headers[] = 'Authorization: Bearer ' . $access;
        }
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_POSTFIELDS => $payload,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 30,
        ]);
        $raw = curl_exec($ch);
        curl_close($ch);

        if (!is_string($raw) || $raw === '') {
            $rejected += count($chunk);
            continue;
        }

        try {
            /** @var array<string, mixed> $decoded */
            $decoded = json_decode($raw, true, 512, JSON_THROW_ON_ERROR);
        } catch (Throwable) {
            $rejected += count($chunk);
            continue;
        }

        $items = $decoded['data'] ?? null;
        if (!is_array($items)) {
            $rejected += count($chunk);
            continue;
        }

        foreach ($items as $item) {
            if (!is_array($item)) {
                $rejected++;
                continue;
            }
            $st = (string) ($item['status'] ?? '');
            if ($st === 'ok') {
                $accepted++;
                $tid = (string) ($item['id'] ?? '');
                if ($tid !== '') {
                    $ticketIds[] = $tid;
                }
            } else {
                $rejected++;
                $msg = (string) ($item['message'] ?? 'error');
                $det = $item['details'] ?? null;
                if (is_array($det)) {
                    $code = (string) ($det['error'] ?? '');
                    if ($code !== '') {
                        $msg = $msg !== '' && $msg !== 'error' ? $msg . ' [' . $code . ']' : $code;
                    }
                }
                if ($msg !== '' && count($errorSamples) < 5) {
                    $errorSamples[] = $msg;
                }
            }
        }
    }

    return [
        'accepted' => $accepted,
        'rejected' => $rejected,
        'ticket_ids' => $ticketIds,
        'error_samples' => $errorSamples,
    ];
}

/**
 * @param list<array<string, mixed>> $messages
 */
function ww_expo_push_send(array $messages): void
{
    ww_expo_push_send_detailed($messages);
}

/**
 * Fetch Expo push receipts (delivery to FCM/APNs device). Call a short time after sending.
 *
 * @param list<string> $ticketIds
 * @return array{ok: int, failed: int}
 */
function ww_expo_push_get_receipts(array $ticketIds): array
{
    $ok = 0;
    $failed = 0;
    $ids = array_values(array_filter(array_unique($ticketIds), static fn ($id) => $id !== ''));
    if ($ids === []) {
        return ['ok' => 0, 'failed' => 0];
    }

    foreach (array_chunk($ids, 100) as $chunk) {
        $payload = json_encode(['ids' => $chunk], JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
        $ch = curl_init('https://exp.host/--/api/v2/push/getReceipts');
        if ($ch === false) {
            continue;
        }
        $headers = [
            'Content-Type: application/json',
            'Accept: application/json',
        ];
        $access = getenv('EXPO_ACCESS_TOKEN');
        if (is_string($access) && $access !== '') {
            $headers[] = 'Authorization: Bearer ' . $access;
        }
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_POSTFIELDS => $payload,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 30,
        ]);
        $raw = curl_exec($ch);
        curl_close($ch);
        if (!is_string($raw) || $raw === '') {
            continue;
        }
        try {
            /** @var array<string, mixed> $decoded */
            $decoded = json_decode($raw, true, 512, JSON_THROW_ON_ERROR);
            $data = $decoded['data'] ?? null;
            if (!is_array($data)) {
                continue;
            }
            foreach ($data as $receipt) {
                if (!is_array($receipt)) {
                    continue;
                }
                if (($receipt['status'] ?? '') === 'ok') {
                    $ok++;
                } else {
                    $failed++;
                }
            }
        } catch (Throwable) {
            continue;
        }
    }

    return ['ok' => $ok, 'failed' => $failed];
}

/**
 * @return list<string>
 */
function ww_push_tokens_for_user(PDO $pdo, int $userId): array
{
    if ($userId <= 0) {
        return [];
    }
    try {
        $st = $pdo->prepare(
            'SELECT expo_push_token FROM user_push_tokens WHERE user_id = ?'
        );
        $st->execute([$userId]);
        $out = [];
        while (($t = $st->fetchColumn()) !== false) {
            $t = (string) $t;
            if ($t !== '' && str_starts_with($t, 'ExponentPushToken[')) {
                $out[] = $t;
            }
        }

        return array_values(array_unique($out));
    } catch (Throwable) {
        return [];
    }
}

/**
 * @param array<string, string|int> $data
 */
function ww_push_to_user(PDO $pdo, int $userId, string $title, string $body, array $data = []): void
{
    $tokens = ww_push_tokens_for_user($pdo, $userId);
    if ($tokens === []) {
        return;
    }
    $messages = [];
    foreach ($tokens as $to) {
        $messages[] = ww_expo_push_build_message($to, $title, $body, $data);
    }
    ww_expo_push_send($messages);
}

/**
 * @param list<int> $userIds
 */
function ww_push_broadcast_users(PDO $pdo, array $userIds, string $title, string $body, array $data = []): void
{
    $ids = array_values(array_unique(array_filter($userIds, static fn ($id) => (int) $id > 0)));
    foreach ($ids as $uid) {
        ww_push_to_user($pdo, (int) $uid, $title, $body, $data);
    }
}
