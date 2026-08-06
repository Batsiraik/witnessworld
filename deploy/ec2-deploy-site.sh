#!/usr/bin/env bash
set -euo pipefail

echo "==> Extracting site into /var/www/witnessworld"
sudo mkdir -p /var/www/witnessworld
sudo tar -xzf /home/ubuntu/witnessworld-site.tar.gz -C /var/www/witnessworld

echo "==> Setting ownership and permissions"
sudo chown -R ubuntu:www-data /var/www/witnessworld
sudo find /var/www/witnessworld -type d -exec chmod 775 {} \;
sudo find /var/www/witnessworld -type f -exec chmod 664 {} \;
# Writable uploads
sudo mkdir -p /var/www/witnessworld/uploads
sudo chmod -R 775 /var/www/witnessworld/uploads

echo "==> Setting up MySQL"
bash /home/ubuntu/ec2-db-setup.sh

# Read credentials
# shellcheck disable=SC1091
source /dev/null
DB_NAME=$(grep '^DB_NAME=' /home/ubuntu/ww-db-credentials.txt | cut -d= -f2)
DB_USER=$(grep '^DB_USER=' /home/ubuntu/ww-db-credentials.txt | cut -d= -f2)
DB_PASS=$(grep '^DB_PASS=' /home/ubuntu/ww-db-credentials.txt | cut -d= -f2)

echo "==> Importing schema.sql (empty structure — replace later with full dump)"
# schema.sql may DROP tables — fine on fresh DB
if [ -f /home/ubuntu/schema.sql ]; then
  # Use sudo mysql for root socket auth before root password change takes effect inconsistently
  sudo mysql "${DB_NAME}" < /home/ubuntu/schema.sql || {
    echo "Schema import had warnings/errors — continuing (you will import full dump later)"
  }
fi

echo "==> Writing admin config.local.php (localhost MySQL)"
umask 077
cat > /var/www/witnessworld/admin/includes/config.local.php <<EOF
<?php

return [
    'db_host' => 'localhost',
    'db_name' => '${DB_NAME}',
    'db_user' => '${DB_USER}',
    'db_pass' => '${DB_PASS}',
    'db_charset' => 'utf8mb4',
];
EOF
chmod 640 /var/www/witnessworld/admin/includes/config.local.php
sudo chown ubuntu:www-data /var/www/witnessworld/admin/includes/config.local.php

echo "==> Writing api/config.local.php for IP-based public base"
# Keep stripe key if present in deployed file; rewrite PUBLIC base via a bootstrap override file
# Patch api/config.php to allow local override of WW_PUBLIC_BASE
python3 - <<'PY'
from pathlib import Path
p = Path('/var/www/witnessworld/api/config.php')
text = p.read_text(encoding='utf-8')
old = "define('WW_PUBLIC_BASE', 'https://witnessworldconnect.com');"
new = """$__wwPublic = getenv('WW_PUBLIC_BASE') ?: 'http://18.216.128.11';
define('WW_PUBLIC_BASE', $__wwPublic);"""
if old in text:
    p.write_text(text.replace(old, new), encoding='utf-8')
    print('Patched api/config.php for IP public base')
else:
    print('api/config.php already patched or pattern changed')
PY

# Ensure api config.local exists (stripe etc.) — leave whatever was in tarball if present
if [ ! -f /var/www/witnessworld/api/config.local.php ]; then
  cat > /var/www/witnessworld/api/config.local.php <<'EOF'
<?php
declare(strict_types=1);
define('WW_API_DEBUG', true);
EOF
fi

echo "==> PHP sanity check"
php -r "require '/var/www/witnessworld/admin/includes/config.local.php'; echo 'admin config ok\n';"
php -r "require '/var/www/witnessworld/api/config.php'; echo WW_PUBLIC_BASE, PHP_EOL;"

echo "==> Reload nginx/php"
sudo nginx -t
sudo systemctl reload nginx
sudo systemctl restart php8.3-fpm

echo "DEPLOY_OK"
ls -la /var/www/witnessworld | head -30
