<?php

/**
 * Shared PDO (localhost on EC2 / Hostinger, or remote Hostinger from XAMPP).
 */
function witnessworld_pdo(): PDO
{
    static $pdo = null;
    if ($pdo instanceof PDO) {
        return $pdo;
    }

    $config = require __DIR__ . '/config.php';
    $host = (string) $config['db_host'];
    $dsn = sprintf(
        'mysql:host=%s;dbname=%s;charset=%s;connect_timeout=5',
        $host,
        $config['db_name'],
        $config['db_charset']
    );

    // Persistent connections are a big win when MySQL is local (EC2).
    // Keep them off for remote hosts to avoid sticky stale sockets.
    $persistent = in_array(strtolower($host), ['localhost', '127.0.0.1'], true);

    $pdo = new PDO($dsn, $config['db_user'], $config['db_pass'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
        PDO::ATTR_PERSISTENT => $persistent,
    ]);

    return $pdo;
}
