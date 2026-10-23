# syntax=docker/dockerfile:1

# CODCompta: one PHP image (web app, queue worker, scheduler) and one Nginx image.
# Build and start everything with: docker compose up -d --build

############################
# PHP 8.3 with the extensions Laravel needs
############################
FROM php:8.3-fpm-alpine AS base

RUN apk add --no-cache icu-libs libzip fcgi su-exec \
    && apk add --no-cache --virtual .build-deps $PHPIZE_DEPS icu-dev libzip-dev linux-headers \
    && docker-php-ext-install -j"$(nproc)" pdo_mysql bcmath intl zip opcache pcntl \
    && apk del .build-deps

COPY docker/php/php.ini /usr/local/etc/php/conf.d/zz-codcompta.ini
COPY docker/php/www.conf /usr/local/etc/php-fpm.d/zz-codcompta.conf
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

############################
# PHP dependencies (without dev tools)
############################
FROM base AS vendor

COPY composer.json composer.lock ./
RUN composer install --no-dev --no-scripts --no-autoloader --prefer-dist --no-interaction --no-progress

COPY . .
RUN composer dump-autoload --optimize --no-dev --no-interaction \
    && rm -f bootstrap/cache/*.php

############################
# Front-end build (React, Tailwind) with Vite
############################
FROM node:22-alpine AS assets

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .
# The Ziggy route helper is shipped inside the PHP package.
COPY --from=vendor /var/www/html/vendor/tightenco ./vendor/tightenco
RUN npm run build

############################
# Final PHP image: php-fpm, or the queue worker / scheduler (same code)
############################
FROM base AS app

COPY --from=vendor --chown=www-data:www-data /var/www/html /var/www/html
COPY --from=assets --chown=www-data:www-data /app/public/build /var/www/html/public/build
COPY docker/entrypoint.sh /usr/local/bin/codcompta-entrypoint

RUN chmod +x /usr/local/bin/codcompta-entrypoint \
    && rm -f /usr/bin/composer \
    && mkdir -p storage/framework/cache/data storage/framework/sessions storage/framework/views storage/logs bootstrap/cache \
    && chown -R www-data:www-data storage bootstrap/cache

ENTRYPOINT ["codcompta-entrypoint"]
CMD ["php-fpm"]

############################
# Nginx serving the built files and passing PHP to the app container
############################
FROM nginx:1.27-alpine AS web

COPY docker/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=app /var/www/html/public /var/www/html/public
