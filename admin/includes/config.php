<?php

$local = __DIR__ . '/config.local.php';
if (!is_readable($local)) {
    throw new RuntimeException(
        'Missing admin/includes/config.local.php — copy config.example.php to config.local.php and set your credentials.'
    );
}

return require $local;
