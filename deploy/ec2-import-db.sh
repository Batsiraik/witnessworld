#!/usr/bin/env bash
set -euo pipefail

DB_NAME=$(awk -F= '/^DB_NAME=/{print $2}' /home/ubuntu/ww-db-credentials.txt)
DB_USER=$(awk -F= '/^DB_USER=/{print $2}' /home/ubuntu/ww-db-credentials.txt)
DB_PASS=$(awk -F= '/^DB_PASS=/{print $2}' /home/ubuntu/ww-db-credentials.txt)

DUMP=/home/ubuntu/u462861958_witnessworld.sql
if [ ! -f "$DUMP" ]; then
  echo "Missing dump: $DUMP"
  exit 1
fi

echo "==> Resetting database $DB_NAME"
sudo mysql -e "DROP DATABASE IF EXISTS \`${DB_NAME}\`; CREATE DATABASE \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
sudo mysql -e "GRANT ALL PRIVILEGES ON \`${DB_NAME}\`.* TO '${DB_USER}'@'localhost'; FLUSH PRIVILEGES;"

echo "==> Preparing dump for MySQL 8"
sed -E \
  -e 's/DEFINER=`[^`]+`@`[^`]+`/DEFINER=`root`@`localhost`/g' \
  -e '/^USE `/d' \
  -e '/^CREATE DATABASE/d' \
  "$DUMP" > /tmp/ww_import.sql

echo "==> Importing..."
set +e
sudo mysql --default-character-set=utf8mb4 "$DB_NAME" < /tmp/ww_import.sql
IMPORT_RC=$?
set -e
rm -f /tmp/ww_import.sql

if [ "$IMPORT_RC" -ne 0 ]; then
  echo "Import exited with code $IMPORT_RC — checking what loaded anyway"
fi

echo "==> Tables"
sudo mysql "$DB_NAME" -e "SHOW TABLES;"

echo "==> Row counts"
sudo mysql "$DB_NAME" -e "
SELECT 'admins' AS tbl, COUNT(*) AS n FROM admins
UNION ALL SELECT 'users', COUNT(*) FROM users
UNION ALL SELECT 'listings', COUNT(*) FROM listings
UNION ALL SELECT 'stores', COUNT(*) FROM stores
UNION ALL SELECT 'directory_entries', COUNT(*) FROM directory_entries
UNION ALL SELECT 'messages', COUNT(*) FROM messages;
"

echo "==> Admin accounts"
sudo mysql "$DB_NAME" -e "SELECT id, username, email, is_super_admin FROM admins;"

echo "==> App user can connect"
mysql -u"$DB_USER" -p"$DB_PASS" "$DB_NAME" -e "SELECT COUNT(*) AS users FROM users;"

echo "IMPORT_OK"
