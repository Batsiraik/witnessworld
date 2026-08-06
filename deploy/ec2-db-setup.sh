#!/usr/bin/env bash
set -euo pipefail

DB_NAME="witnessworld"
DB_USER="ww_app"
# Strong random password
DB_PASS="$(openssl rand -base64 24 | tr -d '/+=' | head -c 28)"
# Separate phpMyAdmin admin user (root stays socket-auth for sudo mysql)
PMA_USER="ww_admin"
PMA_PASS="$(openssl rand -base64 24 | tr -d '/+=' | head -c 28)"

echo "==> Creating MySQL database and app user"
sudo mysql -e "CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
sudo mysql -e "CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASS}';"
sudo mysql -e "ALTER USER '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASS}';"
sudo mysql -e "GRANT ALL PRIVILEGES ON \`${DB_NAME}\`.* TO '${DB_USER}'@'localhost';"
sudo mysql -e "CREATE USER IF NOT EXISTS '${PMA_USER}'@'localhost' IDENTIFIED BY '${PMA_PASS}';"
sudo mysql -e "ALTER USER '${PMA_USER}'@'localhost' IDENTIFIED BY '${PMA_PASS}';"
sudo mysql -e "GRANT ALL PRIVILEGES ON *.* TO '${PMA_USER}'@'localhost' WITH GRANT OPTION;"
sudo mysql -e "FLUSH PRIVILEGES;"

# Save credentials securely on server
umask 077
cat > /home/ubuntu/ww-db-credentials.txt <<EOF
DB_HOST=localhost
DB_NAME=${DB_NAME}
DB_USER=${DB_USER}
DB_PASS=${DB_PASS}
PMA_USER=${PMA_USER}
PMA_PASS=${PMA_PASS}
PMA_URL=http://18.216.128.11/phpmyadmin
SITE_URL=http://18.216.128.11
ADMIN_URL=http://18.216.128.11/admin/
EOF
chown ubuntu:ubuntu /home/ubuntu/ww-db-credentials.txt
chmod 600 /home/ubuntu/ww-db-credentials.txt

echo "DB_SETUP_OK"
echo "Credentials written to /home/ubuntu/ww-db-credentials.txt"
