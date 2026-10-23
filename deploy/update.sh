#!/bin/sh
# Updates CODCompta on the VPS after a git push: pulls the code, rebuilds and restarts.
# Usage (from the project folder): sh deploy/update.sh
set -e

git pull --ff-only
docker compose up -d --build --remove-orphans
docker image prune -f >/dev/null
docker compose ps
echo "CODCompta est à jour."
