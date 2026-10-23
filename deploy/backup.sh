#!/bin/sh
# Saves the MySQL database in backups/codcompta-YYYY-MM-DD-HHMM.sql.gz and keeps the last 14.
# Usage (from the project folder): sh deploy/backup.sh   — or every night with cron (see DEPLOIEMENT.md).
set -e

cd "$(dirname "$0")/.."
mkdir -p backups
file="backups/codcompta-$(date +%Y-%m-%d-%H%M).sql.gz"

docker compose exec -T db sh -c 'exec mysqldump --single-transaction --routines -u root -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE"' | gzip > "$file"

ls -1t backups/codcompta-*.sql.gz | tail -n +15 | xargs -r rm -f
echo "Sauvegarde : $file"
