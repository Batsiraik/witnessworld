#!/usr/bin/env bash
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive

echo "==> Updating packages"
sudo apt-get update -y
sudo apt-get upgrade -y

echo "==> Installing Nginx, MySQL, PHP 8.3, tools"
sudo apt-get install -y nginx mysql-server \
  php8.3-fpm php8.3-mysql php8.3-cli php8.3-common php8.3-curl php8.3-gd \
  php8.3-mbstring php8.3-xml php8.3-zip php8.3-intl php8.3-bcmath php8.3-readline \
  unzip curl git ufw fail2ban apache2-utils

echo "==> Installing phpMyAdmin (noninteractive)"
echo "phpmyadmin phpmyadmin/dbconfig-install boolean true" | sudo debconf-set-selections
echo "phpmyadmin phpmyadmin/app-password-confirm password temp_pma_setup" | sudo debconf-set-selections
echo "phpmyadmin phpmyadmin/mysql/admin-pass password" | sudo debconf-set-selections
echo "phpmyadmin phpmyadmin/mysql/app-pass password temp_pma_setup" | sudo debconf-set-selections
echo "phpmyadmin phpmyadmin/reconfigure-webserver multiselect none" | sudo debconf-set-selections
sudo apt-get install -y phpmyadmin

echo "==> Enabling services"
sudo systemctl enable --now nginx php8.3-fpm mysql

echo "==> Tuning PHP-FPM"
PHP_INI=/etc/php/8.3/fpm/php.ini
sudo sed -i 's/^;*\s*cgi.fix_pathinfo\s*=.*/cgi.fix_pathinfo=0/' "$PHP_INI"
sudo sed -i 's/^upload_max_filesize\s*=.*/upload_max_filesize = 64M/' "$PHP_INI"
sudo sed -i 's/^post_max_size\s*=.*/post_max_size = 64M/' "$PHP_INI"
sudo sed -i 's/^memory_limit\s*=.*/memory_limit = 256M/' "$PHP_INI"
sudo sed -i 's/^max_execution_time\s*=.*/max_execution_time = 120/' "$PHP_INI"
sudo sed -i 's/^;*\s*opcache.enable\s*=.*/opcache.enable=1/' "$PHP_INI"
sudo sed -i 's/^;*\s*opcache.memory_consumption\s*=.*/opcache.memory_consumption=128/' "$PHP_INI"
sudo sed -i 's/^;*\s*opcache.validate_timestamps\s*=.*/opcache.validate_timestamps=1/' "$PHP_INI"
sudo sed -i 's/^;*\s*opcache.revalidate_freq\s*=.*/opcache.revalidate_freq=2/' "$PHP_INI"
sudo systemctl restart php8.3-fpm

echo "==> Creating web root"
sudo mkdir -p /var/www/witnessworld
sudo chown -R ubuntu:www-data /var/www/witnessworld
sudo chmod -R 775 /var/www/witnessworld

echo "==> Writing Nginx site config"
sudo tee /etc/nginx/sites-available/witnessworld >/dev/null <<'NGINX'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;

    root /var/www/witnessworld;
    index index.php index.html;

    client_max_body_size 64M;

    # Security / performance headers
    add_header X-Content-Type-Options nosniff always;
    add_header X-Frame-Options SAMEORIGIN always;
    add_header Referrer-Policy strict-origin-when-cross-origin always;

    # Gzip
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml image/svg+xml;
    gzip_min_length 1024;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    # phpMyAdmin
    location /phpmyadmin {
        alias /usr/share/phpmyadmin/;
        index index.php;

        location ~ ^/phpmyadmin/(.+\.php)$ {
            alias /usr/share/phpmyadmin/$1;
            include snippets/fastcgi-php.conf;
            fastcgi_pass unix:/run/php/php8.3-fpm.sock;
            fastcgi_param SCRIPT_FILENAME /usr/share/phpmyadmin/$1;
            include fastcgi_params;
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

    # Deny hidden / config files
    location ~ /\. {
        deny all;
    }
    location ~* /(config\.local\.php|composer\.(json|lock))$ {
        deny all;
    }

    # Static cache
    location ~* \.(css|js|jpg|jpeg|png|gif|ico|svg|webp|woff2?|mp4|webm)$ {
        expires 7d;
        access_log off;
        try_files $uri =404;
    }

    location ~* ^/uploads/ {
        expires 7d;
        access_log off;
        try_files $uri =404;
    }
}
NGINX

sudo rm -f /etc/nginx/sites-enabled/default
sudo ln -sfn /etc/nginx/sites-available/witnessworld /etc/nginx/sites-enabled/witnessworld
sudo nginx -t
sudo systemctl reload nginx

echo "==> UFW firewall (SSH/HTTP/HTTPS)"
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable || true

echo "STACK_INSTALL_OK"
php -v | head -1
nginx -v 2>&1
mysql --version
dpkg -l phpmyadmin | awk 'END{print}'
ss -tlnp | grep -E ':80|:443|:3306|:22' || true
df -h /
