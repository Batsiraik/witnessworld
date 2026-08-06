#!/usr/bin/env bash
set -euo pipefail
DB_USER=$(awk -F= '/^DB_USER=/{print $2}' /home/ubuntu/ww-db-credentials.txt)
DB_PASS=$(awk -F= '/^DB_PASS=/{print $2}' /home/ubuntu/ww-db-credentials.txt)
DB_NAME=$(awk -F= '/^DB_NAME=/{print $2}' /home/ubuntu/ww-db-credentials.txt)

echo "=== uploads on disk ==="
du -sh /var/www/witnessworld/uploads
find /var/www/witnessworld/uploads -type f | wc -l

echo "=== sample URLs ==="
mysql -u"$DB_USER" -p"$DB_PASS" "$DB_NAME" -N -e "
SELECT image_url FROM listings WHERE image_url IS NOT NULL AND image_url != '' LIMIT 6;
SELECT logo_url FROM stores WHERE logo_url IS NOT NULL AND logo_url != '' LIMIT 4;
SELECT avatar_url FROM users WHERE avatar_url IS NOT NULL AND avatar_url != '' LIMIT 4;
"
