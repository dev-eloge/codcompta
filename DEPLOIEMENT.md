# Déployer CODCompta avec Docker

Ce guide met CODCompta en ligne sur **https://elogecompta.africodehub.net**, sur un VPS où tourne déjà une autre application avec Nginx et un certificat SSL.

## Comment c'est organisé

```
Internet ──HTTPS──▶ Nginx du VPS (déjà installé, certificat SSL)
                      │  elogecompta.africodehub.net
                      ▼
              127.0.0.1:8081  (visible seulement depuis le VPS)
                      │
   ┌──────────────── docker compose ────────────────┐
   │  web        Nginx : fichiers du site + PHP     │
   │  app        Laravel (php-fpm), fait les        │
   │             migrations au démarrage            │
   │  queue      lit les messages d'agence et les   │
   │             Google Sheets en arrière-plan      │
   │  scheduler  relit les Sheets chaque matin à 6 h│
   │  db         MySQL 8.4 (volume « mysql-data »)  │
   └────────────────────────────────────────────────┘
```

Les conteneurs ne touchent pas aux ports 80 et 443 : ton autre application continue de fonctionner comme avant. Le Nginx du VPS reçoit simplement un nouveau nom de domaine et le transmet à CODCompta.

---

## 1. Préparer le VPS (une seule fois)

### 1.1 Le nom de domaine

Chez ton fournisseur DNS, ajoute un enregistrement :

| Type | Nom | Valeur |
|------|-----|--------|
| A | `elogecompta` | l'adresse IP du VPS |

Vérifie depuis ton Mac, une fois la propagation faite (de quelques minutes à 1 h) : `ping elogecompta.africodehub.net` doit répondre avec l'IP du VPS.

### 1.2 Docker

Connecte-toi au VPS (`ssh utilisateur@ip-du-vps`) et vérifie :

```bash
docker --version
docker compose version
```

Si Docker n'est pas installé :

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER   # puis déconnecte-toi et reconnecte-toi
```

### 1.3 Le port 8081

```bash
sudo ss -ltnp | grep 8081
```

Si cette commande n'affiche rien, le port est libre. Si quelque chose l'utilise déjà, choisis un autre port (par exemple 8082). Tu le mettras dans `APP_PORT` à l'étape 2.2 et dans le fichier Nginx à l'étape 4.

---

## 2. Récupérer le code et le configurer

### 2.1 Cloner le dépôt

```bash
sudo mkdir -p /var/www && sudo chown $USER /var/www
cd /var/www
git clone https://github.com/dev-eloge/codcompta.git
cd codcompta
```

Le dépôt est privé : quand git demande le mot de passe, colle un **token GitHub** (Settings → Developer settings → Personal access tokens, avec le droit « repo » en lecture).

### 2.2 Le fichier `.env` de production

```bash
cp deploy/production.env.example .env
chmod 600 .env
```

Génère les secrets :

```bash
echo "APP_KEY=base64:$(openssl rand -base64 32)"
echo "DB_PASSWORD=$(openssl rand -hex 24)"
echo "DB_ROOT_PASSWORD=$(openssl rand -hex 24)"
```

Ouvre le fichier (`nano .env`) et remplis :

| Variable | Valeur |
|----------|--------|
| `APP_KEY` | la ligne générée ci-dessus |
| `DB_PASSWORD`, `DB_ROOT_PASSWORD` | les deux mots de passe générés |
| `ANTHROPIC_API_KEY` | ta clé Claude (console.anthropic.com) |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | tes identifiants Google Cloud |
| `APP_PORT` | 8081, sauf si tu as dû le changer |

Ne change pas `APP_URL` ni `GOOGLE_REDIRECT_URI` : ils sont déjà réglés sur `https://elogecompta.africodehub.net`.

> **Garde une copie de `APP_KEY`.** Si tu la changes plus tard, tous les utilisateurs sont déconnectés et la connexion Google doit être refaite (les jetons Google sont chiffrés avec cette clé).

---

## 3. Lancer l'application

```bash
docker compose up -d --build
```

Le premier lancement prend 5 à 10 minutes : Docker construit l'image (PHP, dépendances, build React). Les suivants sont beaucoup plus rapides.

Vérifie que tout tourne :

```bash
docker compose ps
```

Les cinq services doivent être `running`, et `app`, `web` et `db` doivent être `healthy`. Pour suivre le démarrage :

```bash
docker compose logs -f app
```

Le message « CODCompta est prêt. » s'affiche quand les migrations sont faites. Quitte avec Ctrl+C. Test local depuis le VPS :

```bash
curl -I http://127.0.0.1:8081/up      # doit répondre 200
```

---

## 4. Brancher le nom de domaine sur le Nginx du VPS

Le fichier à utiliser dépend de ton certificat actuel. Pour le savoir :

```bash
sudo certbot certificates
```

### Cas A : le certificat ne couvre que l'autre application (cas le plus courant)

Tu ajoutes simplement un certificat gratuit pour le nouveau sous-domaine. Certbot s'en charge et ne touche pas à l'autre site.

```bash
sudo cp deploy/nginx/elogecompta.africodehub.net.conf /etc/nginx/sites-available/
sudo ln -s /etc/nginx/sites-available/elogecompta.africodehub.net.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d elogecompta.africodehub.net
```

Quand Certbot le demande, choisis la **redirection HTTP vers HTTPS**. Le renouvellement est automatique.

### Cas B : le certificat existant couvre `*.africodehub.net` (wildcard)

Utilise la variante prévue pour réutiliser ce certificat :

```bash
sudo cp deploy/nginx/elogecompta.africodehub.net.wildcard.conf /etc/nginx/sites-available/elogecompta.africodehub.net.conf
sudo nano /etc/nginx/sites-available/elogecompta.africodehub.net.conf   # vérifie les 2 chemins ssl_certificate
sudo ln -s /etc/nginx/sites-available/elogecompta.africodehub.net.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

> Si ton serveur utilise un dossier `conf.d` au lieu de `sites-available`/`sites-enabled`, copie le fichier dans `/etc/nginx/conf.d/` (son nom doit finir par `.conf`).
>
> Si ton autre application passe par un proxy qui tourne lui-même dans Docker (Traefik, Caddy, nginx-proxy), ces étapes ne s'appliquent pas telles quelles. Dis-moi lequel c'est et j'adapte le `docker-compose.yml`.

Ouvre **https://elogecompta.africodehub.net** : la page d'accueil s'affiche avec le cadenas.

---

## 5. Derniers réglages

1. **Ton compte** : clique sur « Créer un compte ». La base de production est vide : aucun compte de démo n'y est créé.
2. **Google Cloud** (API et services → Identifiants → ton ID client OAuth) : ajoute l'URI de redirection autorisée
   `https://elogecompta.africodehub.net/google/callback`
   Garde aussi `http://localhost:8000/google/callback` si tu continues à travailler en local.
3. **Anthropic** : vérifie qu'il reste du crédit sur console.anthropic.com.

---

## 6. Mettre à jour après un `git push`

Sur le VPS, dans `/var/www/codcompta` :

```bash
sh deploy/update.sh
```

Le script récupère le code, reconstruit l'image et redémarre les conteneurs. Les nouvelles migrations s'exécutent toutes seules et les données sont conservées.

Si tu modifies seulement le `.env`, pas besoin de reconstruire :

```bash
docker compose up -d --force-recreate
```

---

## 7. Sauvegardes

Sauvegarde manuelle de la base :

```bash
sh deploy/backup.sh
```

Le fichier est créé dans `backups/` et les 14 dernières sauvegardes sont gardées. Pour une sauvegarde automatique chaque nuit à 2 h, ouvre `crontab -e` et ajoute :

```
0 2 * * * cd /var/www/codcompta && sh deploy/backup.sh >> backups/backup.log 2>&1
```

Copie régulièrement ce dossier hors du VPS (sur ton Mac ou sur Google Drive).

Pour restaurer une sauvegarde :

```bash
gunzip -c backups/codcompta-AAAA-MM-JJ-HHMM.sql.gz | docker compose exec -T db sh -c 'mysql -u root -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE"'
```

---

## 8. Commandes utiles

| Besoin | Commande |
|--------|----------|
| État des conteneurs | `docker compose ps` |
| Journaux en direct | `docker compose logs -f app queue scheduler` |
| Commande Laravel | `docker compose exec app php artisan <commande>` |
| Relire les Sheets tout de suite | `docker compose exec app php artisan sheets:sync` |
| Ouvrir MySQL | `docker compose exec db sh -c 'mysql -u root -p"$MYSQL_ROOT_PASSWORD" codcompta'` |
| Redémarrer | `docker compose restart` |
| Arrêter | `docker compose down` |

> ⚠️ N'utilise **jamais** `docker compose down -v` : l'option `-v` supprime le volume MySQL, donc toutes les données.

---

## 9. En cas de problème

| Symptôme | Cause probable | Solution |
|----------|----------------|----------|
| `app` redémarre en boucle, « APP_KEY est vide » | `.env` incomplet | remplis `APP_KEY` (étape 2.2), puis `docker compose up -d` |
| « MySQL ne répond pas » | mots de passe changés après le premier lancement | MySQL garde les mots de passe du premier démarrage : remets les anciens dans `.env` |
| 502 Bad Gateway sur le domaine | conteneurs pas encore prêts, ou mauvais port | `docker compose ps`, puis `curl -I http://127.0.0.1:8081/up` ; vérifie le port dans le fichier Nginx |
| Erreur 419 (page expirée) au formulaire | site ouvert en `http://` | ouvre toujours `https://` (Certbot ajoute la redirection) |
| Styles absents, page blanche | build raté | `docker compose build --no-cache app web && docker compose up -d` |
| Message ou Sheet bloqué sur « Lecture en cours » | conteneur `queue` arrêté | `docker compose logs queue`, puis `docker compose restart queue` |
| Google : `redirect_uri_mismatch` | URI absente de Google Cloud | ajoute `https://elogecompta.africodehub.net/google/callback` (étape 5) |
| Port 8081 déjà utilisé | une autre application l'occupe | change `APP_PORT` dans `.env` et le port dans le fichier Nginx, puis `docker compose up -d` |
