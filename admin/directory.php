<?php

declare(strict_types=1);

require_once __DIR__ . '/includes/guard.php';

$params = $_GET;
unset($params['tab']);
header('Location: content.php?' . http_build_query(array_merge(['tab' => 'directory'], $params)));
exit;
