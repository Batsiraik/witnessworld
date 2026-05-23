<?php

declare(strict_types=1);

require_once __DIR__ . '/includes/guard.php';

$params = $_GET;
unset($params['tab']);
header('Location: categories.php?' . http_build_query(array_merge(['tab' => 'service'], $params)));
exit;
