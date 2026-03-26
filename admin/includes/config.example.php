<?php

/**
 * Copy this file to config.local.php and fill in your values.
 * config.local.php is gitignored.
 *
 * db_host depends on WHERE PHP runs:
 * - PHP on Hostinger (this account): use "localhost" — same server as MySQL.
 * - PHP on your PC (XAMPP) hitting Hostinger MySQL: use the remote host from
 *   hPanel → Databases (e.g. srv####.hstgr.io) and whitelist your IP under Remote MySQL.
 */
return [
    'db_host' => 'localhost',
    'db_name' => 'your_database_name',
    'db_user' => 'your_database_user',
    'db_pass' => 'your_database_password',
    'db_charset' => 'utf8mb4',
];
