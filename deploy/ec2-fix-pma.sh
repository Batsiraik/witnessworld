#!/usr/bin/env bash
set -euo pipefail

# Confirm phpMyAdmin path
PMA_PATH="/usr/share/phpmyadmin"
if [ ! -d "$PMA_PATH" ]; then
  echo "phpMyAdmin not found at $PMA_PATH"
  ls -la /usr/share/ | head
  exit 1
fi

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

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml image/svg+xml;
    gzip_min_length 1024;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location /phpmyadmin {
        return 301 /phpmyadmin/;
    }

    location /phpmyadmin/ {
        alias /usr/share/phpmyadmin/;
        index index.php index.html;

        location ~ ^/phpmyadmin/(.+\.php)$ {
            alias /usr/share/phpmyadmin/$1;
            include fastcgi_params;
            fastcgi_param SCRIPT_FILENAME /usr/share/phpmyadmin/$1;
            fastcgi_pass unix:/run/php/php8.3-fpm.sock;
        }

        location ~* ^/phpmyadmin/(.+\.(js|css|png|jpg|jpeg|gif|ico|svg|woff2?))$ {
            alias /usr/share/phpmyadmin/$1;
            expires 7d;
            access_log off;
        }
    }

    location ~ \.php$ {
        include snippets/fastcgi-php.conf;
        fastcgi_pass unix:/run/php/php8.3-fpm.sock;
        fastcgi_read_timeout 120;
    }

    location ~ /\. {
        deny all;
    }

    location ~* /(config\.local\.php|composer\.(json|lock))$ {
        deny all;
    }

    location ~* \.(css|js|jpg|jpeg|png|gif|ico|svg|webp|woff2?|mp4|webm)$ {
        expires 7d;
        access_log off;
        try_files $uri =404;
    }
}
NGINX

# Also symlink into web root as a reliable fallback
sudo ln -sfn /usr/share/phpmyadmin /var/www/witnessworld/phpmyadmin

sudo nginx -t
sudo systemctl reload nginx

echo "=== PMA local test ==="
curl -sI http://127.0.0.1/phpmyadmin/ | head -12
curl -s http://127.0.0.1/phpmyadmin/ | head -c 200; echo

echo "=== credentials ==="
cat /home/ubuntu/ww-db-credentials.txt

echo "=== tables ==="
DB_USER=$(awk -F= '/^DB_USER=/{print $2}' /home/ubuntu/ww-db-credentials.txt)
DB_PASS=$(awk -F= '/^DB_PASS=/{print $2}' /home/ubuntu/ww-db-credentials.txt)
DB_NAME=$(awk -F= '/^DB_NAME=/{print $2}' /home/ubuntu/ww-db-credentials.txt)
mysql -u"$DB_USER" -p"$DB_PASS" "$DB_NAME" -e "SHOW TABLES;"
