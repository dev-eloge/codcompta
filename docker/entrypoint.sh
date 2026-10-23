#!/bin/sh
# Starts a CODCompta container. CONTAINER_ROLE says which one:
#   app        php-fpm, runs the database migrations first
#   queue      background jobs (reading agency messages, Google Sheets)
#   scheduler  scheduled tasks (Google Sheets every morning at 6:00)
set -e

cd /var/www/html
ROLE="${CONTAINER_ROLE:-app}"

if [ -z "$APP_KEY" ]; then
    echo "ERREUR : APP_KEY est vide dans le fichier .env."
    echo "Générez-la avec : echo \"APP_KEY=base64:\$(openssl rand -base64 32)\" (voir DEPLOIEMENT.md, étape 2.2)"
    exit 1
fi

# The storage volume starts empty on a new server: recreate its folders.
mkdir -p storage/framework/cache/data storage/framework/sessions storage/framework/views storage/logs storage/app/public bootstrap/cache
chown -R www-data:www-data storage bootstrap/cache

# Wait for MySQL (up to about 2 minutes).
tries=0
until php -r "new PDO('mysql:host='.getenv('DB_HOST').';port='.(getenv('DB_PORT') ?: 3306), getenv('DB_USERNAME'), getenv('DB_PASSWORD'));" >/dev/null 2>&1; do
    tries=$((tries + 1))
    if [ "$tries" -ge 60 ]; then
        echo "ERREUR : MySQL ne répond pas (hôte ${DB_HOST}). Vérifiez DB_HOST, DB_USERNAME et DB_PASSWORD."
        exit 1
    fi
    echo "En attente de MySQL… ($tries)"
    sleep 2
done

if [ "$ROLE" = "app" ]; then
    rm -f /tmp/codcompta-ready
    su-exec www-data php artisan migrate --force --no-interaction
fi

# Configuration, routes and views are cached for speed (the .env is read at this moment).
su-exec www-data php artisan optimize --no-interaction >/dev/null

if [ "$ROLE" = "app" ]; then
    touch /tmp/codcompta-ready
    echo "CODCompta est prêt."
fi

if [ "$ROLE" = "app" ] && [ "$1" = "php-fpm" ]; then
    exec "$@"
fi

# Workers run as www-data so the files they write stay readable by php-fpm.
exec su-exec www-data "$@"
