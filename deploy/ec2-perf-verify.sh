#!/usr/bin/env bash
set -euo pipefail

echo "=== services ==="
systemctl is-active nginx php8.3-fpm mysql

echo "=== mysql vars ==="
sudo mysql -e "SHOW VARIABLES LIKE 'innodb_buffer_pool_size';"
sudo mysql -e "SHOW VARIABLES LIKE 'skip_name_resolve';"

echo "=== indexes ==="
sudo mysql witnessworld -e "SHOW INDEX FROM listings WHERE Key_name LIKE 'idx_listings_mod%';"
sudo mysql witnessworld -e "SHOW INDEX FROM conversations WHERE Key_name LIKE 'idx_conv_user%';"
sudo mysql witnessworld -e "SHOW INDEX FROM messages WHERE Key_name LIKE 'idx_msg_conv%';"

echo "=== opcache ==="
php-fpm8.3 -i 2>/dev/null | grep -E 'opcache.enable =>|opcache.memory_consumption =>|opcache.jit =>|opcache.jit_buffer' | head -10 || true

echo "=== bench ==="
for i in 1 2 3 4 5; do
  curl -s -o /dev/null -w "health %{http_code} %{time_total}s\n" http://127.0.0.1/api/health.php
done
for i in 1 2 3; do
  curl -s -o /dev/null -w "discover %{http_code} %{time_total}s\n" 'http://127.0.0.1/api/discover-feed.php'
done
for i in 1 2 3; do
  curl -s -o /dev/null -w "home %{http_code} %{time_total}s\n" 'http://127.0.0.1/api/marketplace-home-feed.php'
done
for i in 1 2 3; do
  curl -s -o /dev/null -w "login_bad %{http_code} %{time_total}s\n" \
    -H 'Content-Type: application/json' \
    -d '{"email":"x@y.com","password":"nope"}' \
    http://127.0.0.1/api/login.php
done

echo "VERIFY_OK"
