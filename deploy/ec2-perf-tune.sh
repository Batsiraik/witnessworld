#!/usr/bin/env bash
set -euo pipefail

echo "==> PHP-FPM / OPcache tuning"
sudo tee /etc/php/8.3/fpm/conf.d/99-ww-performance.ini >/dev/null <<'INI'
; WitnessWorld performance
memory_limit = 256M
max_execution_time = 120
realpath_cache_size = 4096K
realpath_cache_ttl = 600

opcache.enable=1
opcache.enable_cli=0
opcache.memory_consumption=192
opcache.interned_strings_buffer=16
opcache.max_accelerated_files=20000
opcache.validate_timestamps=1
opcache.revalidate_freq=60
opcache.save_comments=1
opcache.fast_shutdown=1
opcache.jit=1255
opcache.jit_buffer_size=64M
INI

# PHP-FPM pool — m7i-flex.large has ~7.6GB RAM
sudo sed -i 's/^pm = .*/pm = dynamic/' /etc/php/8.3/fpm/pool.d/www.conf
sudo sed -i 's/^pm.max_children = .*/pm.max_children = 40/' /etc/php/8.3/fpm/pool.d/www.conf
sudo sed -i 's/^pm.start_servers = .*/pm.start_servers = 8/' /etc/php/8.3/fpm/pool.d/www.conf
sudo sed -i 's/^pm.min_spare_servers = .*/pm.min_spare_servers = 4/' /etc/php/8.3/fpm/pool.d/www.conf
sudo sed -i 's/^pm.max_spare_servers = .*/pm.max_spare_servers = 16/' /etc/php/8.3/fpm/pool.d/www.conf
if ! grep -q '^pm.max_requests' /etc/php/8.3/fpm/pool.d/www.conf; then
  echo 'pm.max_requests = 500' | sudo tee -a /etc/php/8.3/fpm/pool.d/www.conf >/dev/null
else
  sudo sed -i 's/^pm.max_requests = .*/pm.max_requests = 500/' /etc/php/8.3/fpm/pool.d/www.conf
fi

echo "==> Nginx performance"
sudo tee /etc/nginx/conf.d/ww-performance.conf >/dev/null <<'NGX'
# WitnessWorld global perf
open_file_cache max=5000 inactive=60s;
open_file_cache_valid 60s;
open_file_cache_min_uses 2;
open_file_cache_errors on;

gzip on;
gzip_comp_level 5;
gzip_min_length 256;
gzip_vary on;
gzip_proxied any;
gzip_types
  text/plain
  text/css
  text/xml
  application/json
  application/javascript
  application/xml
  application/rss+xml
  image/svg+xml
  font/woff2;
NGX

# Refresh site vhost with stronger static caching + fastcgi buffers
sudo tee /etc/nginx/sites-available/witnessworld >/dev/null <<'NGINX'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;

    root /var/www/witnessworld;
    index index.php index.html;
    client_max_body_size 64M;

    add_header X-Content-Type-Options nosniff always;
    add_header X-Frame-Options SAMEORIGIN always;
    add_header Referrer-Policy strict-origin-when-cross-origin always;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \.php$ {
        include snippets/fastcgi-php.conf;
        fastcgi_pass unix:/run/php/php8.3-fpm.sock;
        fastcgi_read_timeout 120;
        fastcgi_buffers 16 16k;
        fastcgi_buffer_size 32k;
        fastcgi_param SCRIPT_FILENAME $request_filename;
    }

    location ~ /\. {
        deny all;
    }

    location ~* /(config\.local\.php|composer\.(json|lock))$ {
        deny all;
    }

    location ~* \.(css|js|jpg|jpeg|png|gif|ico|svg|webp|woff2?|mp4|webm)$ {
        expires 30d;
        add_header Cache-Control "public, max-age=2592000, immutable";
        access_log off;
        try_files $uri =404;
    }

    location ^~ /uploads/ {
        expires 7d;
        add_header Cache-Control "public, max-age=604800";
        access_log off;
        try_files $uri =404;
    }
}
NGINX

echo "==> MySQL innodb buffer pool (~2GB on 7.6GB box)"
sudo tee /etc/mysql/mysql.conf.d/ww-performance.cnf >/dev/null <<'MY'
[mysqld]
innodb_buffer_pool_size = 2G
innodb_buffer_pool_instances = 2
innodb_log_file_size = 256M
innodb_flush_method = O_DIRECT
tmp_table_size = 64M
max_heap_table_size = 64M
table_open_cache = 2000
max_connections = 150
skip_name_resolve = ON
MY

echo "==> Apply performance indexes (ignore duplicates)"
DB_NAME=$(awk -F= '/^DB_NAME=/{print $2}' /home/ubuntu/ww-db-credentials.txt)
while IFS= read -r line || [ -n "$line" ]; do
  [[ "$line" =~ ^[[:space:]]*-- ]] && continue
  [[ -z "${line// }" ]] && continue
  sudo mysql "$DB_NAME" -e "$line" 2>/dev/null || true
done < /home/ubuntu/revisions_performance_indexes.sql

echo "==> Restart services"
sudo nginx -t
sudo systemctl restart php8.3-fpm
sudo systemctl reload nginx
sudo systemctl restart mysql

echo "==> Warm + benchmark"
sleep 2
for i in 1 2 3 4 5; do
  curl -s -o /dev/null -w "health %{http_code} %{time_total}s\n" http://127.0.0.1/api/health.php
done
for i in 1 2 3; do
  curl -s -o /dev/null -w "discover %{http_code} %{time_total}s\n" 'http://127.0.0.1/api/discover-feed.php'
done
for i in 1 2 3; do
  curl -s -o /dev/null -w "marketplace-home %{http_code} %{time_total}s\n" 'http://127.0.0.1/api/marketplace-home-feed.php'
done

echo "PERF_TUNE_OK"
df -h /
free -h | head -2
