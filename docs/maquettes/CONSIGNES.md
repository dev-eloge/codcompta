# CODCompta : consignes pour coder la nouvelle maquette

Maquette complète (pour Eloge) : https://claude.ai/artifact/5frcWpaPekKwwsg6oB5muc
Ce dossier contient, pour chaque écran, une image `.png` (à regarder en premier) et le fichier `.dc.html` (textes exacts, couleurs, tailles). Les `.dc.html` ne s'ouvrent pas seuls dans un navigateur : lis-les comme du code source.

## Règles à respecter partout

- Lis `AGENTS.md` avant de commencer. Aucune nouvelle dépendance sans mon accord.
- Applique les règles du skill ui-ux-pro-max : cibles tactiles d'au moins 44 px, champs de 48 à 52 px, contraste suffisant, focus visible, `aria-*` corrects.
- Interface en français. Jamais de point médian « · » ni de signe « ≈ » dans les textes.
- Montants en F CFA, nombres avec espace des milliers et chiffres tabulaires.
- Reprends les couleurs et composants déjà en place (thème clair par défaut, tokens dans `resources/css/app.css`, badges `badge-success`, `badge-danger`…).
- Données d'exemple génériques uniquement : « Produit 1 », « Agence 1 », « Livreur 1 », « Closeuse 1 ».
- Ne touche jamais au `.env`. Ne lance jamais `php artisan db:seed` sur le serveur.
- Un test Feature pour chaque règle de calcul. Tous les tests doivent passer avant chaque commit.
- Travaille par étapes, dans l'ordre ci-dessous, avec un commit par étape. Montre-moi le plan de la migration avant de l'écrire.

## Étape 1 : la pub se saisit dans le rapport, par produit et par plateforme

Écrans : `Saisie-pub.png` (ordinateur) et `Saisie-mobile-pub.png` (téléphone).

Aujourd'hui `AdSpend` est lié à un pays et à une agence, mais pas à un produit. Il faut :

- Ajouter `product_id` à `ad_spends`. Les anciennes lignes sans produit restent valides et s'affichent comme « Pub sans produit ».
- Ajouter le mode de diffusion : `facebook`, `tiktok`, `facebook_tiktok` ou `autre`. Avec `facebook_tiktok`, on enregistre deux montants (Facebook et TikTok) et **un seul** nombre de commandes reçues. On ne sépare jamais les commandes entre les deux plateformes.
- Ajouter un champ « Commandes reçues », facultatif.
- Dans le formulaire du rapport, ajouter l'étape 3 « Publicité du jour », avec une carte par produit livré. La question « Où tourne la pub ? » se pose avec des boutons radio, et seuls les champs de montant utiles s'affichent. Il faut aussi une case « Pas de publicité aujourd'hui pour ces produits ».
- **Une même pub n'est jamais comptée deux fois.** Une pub vaut pour un produit, un pays et un jour. Si un produit est livré par deux agences et que sa pub est déjà notée dans le rapport de l'autre agence, on affiche « Pub déjà notée aujourd'hui » avec deux choix :
  - « C'est la même pub pour les deux agences » (par défaut) : on ne recrée rien, et le montant est partagé entre les agences selon leurs livraisons du produit ce jour-là.
  - « J'ai payé une pub à part pour cette agence » : on enregistre un montant propre à cette agence.
- Le récapitulatif à droite (en bas sur téléphone) ajoute la ligne « Pub du jour » et affiche le « Bénéfice net du jour ».
- La page « Dépenses publicitaires » existante reste en place pour consulter et corriger les pubs.

Tests à écrire : pub partagée entre deux agences, pub à part, total du pays sans double comptage, mode `facebook_tiktok`.

## Étape 2 : saisie sur téléphone en 4 étapes (PWA)

Écrans : `Saisie-mobile-v2.png`, `Saisie-mobile-pub.png` et `Saisie-mobile-equipe.png`.

- Sous 768 px, le formulaire de rapport devient un parcours en 4 étapes : Qui livre, Produits, Pub, Frais. Une barre de progression et le texte « Étape X sur 4 » sont en haut.
- Le bouton « Ajouter un produit » est **en haut** de la liste. Le produit en cours de saisie est ouvert, et les produits validés se replient en une ligne avec un bouton « Modifier ».
- Une barre collée en bas affiche le montant restant ou le bénéfice du jour, avec le bouton « Suivant » ou « Enregistrer ».
- Pas de barre d'onglets pendant la saisie. Une croix en haut permet de quitter, avec une confirmation si des données ont été tapées.
- Une seule chose à faire par écran et des textes courts. Pas de tableau large sur téléphone : des cartes, toujours.
- Les données tapées ne doivent pas se perdre en changeant d'étape. Garde-les dans le même formulaire Inertia.

## Étape 3 : quelle plateforme rapporte le plus

Écrans : `Pub-plateformes.png` (nouvel onglet de « Dépenses publicitaires ») et `Pub-plateformes-mobile.png`.

- Pour chaque produit sur la période choisie, on regroupe **les jours** selon le mode de pub : Facebook, TikTok, Facebook et TikTok.
- Pour chaque groupe, on affiche : nombre de jours, pub payée, commandes reçues, livraisons (les vraies livraisons du produit ces jours-là, sans estimation), coût par livraison, bénéfice après pub et **bénéfice par jour**.
- Le gagnant est le groupe avec le meilleur bénéfice par jour. Il est annoncé en haut de la carte, par exemple « Facebook et TikTok ensemble rapportent le plus : 11 250 F par jour ».
- Un produit avec un seul mode affiche « Une seule plateforme : rien à comparer ».
- Les jours de pub sans mode noté sont signalés, par exemple « 3 jours de pub sans plateforme notée », avec un lien « Compléter ».

## Étape 4 : tableaux de bord

Écrans : `Vue-generale.png`, `Vue-generale-mobile.png` et `Tous-les-pays.png`.

- Dans « Mes rapports », ajouter des puces en haut : Vue générale | Tous les pays | un bouton par pays (l'écran pays actuel ne change pas).
- **Vue générale** :
  - bénéfice net de tous les pays, avec l'écart par rapport à la période d'avant ;
  - répartition actuelle du bénéfice, comme sur l'écran pays ;
  - quatre chiffres clés : chiffre d'affaires, pub (avec le % du CA), livrés, marge ;
  - bandeau « X choses à régler » ;
  - trois cartes : par pays, par produit, selon la plateforme de pub.
- **Tous les pays** : une carte par pays, du plus rentable au moins rentable, avec l'écart, la part du bénéfice total, CA, pub, livrés, marge et un lien « Ouvrir ». Un pays en perte affiche « Passe en perte » en rouge. Un tableau « Comparer en un coup d'œil » suit, avec une ligne Total.
- Le F CFA d'Afrique de l'Ouest et celui d'Afrique centrale ont la même valeur : les pays s'additionnent sans conversion.

## Étape 5 : ma propre équipe (livreurs et closeuses)

Écrans : `Livraison-equipe.png` et `Saisie-mobile-equipe.png`.

- Pour chaque pays, on choisit « Qui livre vos commandes ? » : une agence de livraison, ma propre équipe, ou les deux.
- Nouvelles tables pour les livreurs et les closeuses (nom, mode de paiement, montant) :
  - un livreur est payé par livraison, au mois ou par jour de travail ;
  - une closeuse est payée par commande livrée (choix par défaut), par commande confirmée, au mois ou par jour de travail.
- Frais fixes du mois : location moto, crédit téléphone, magasin.
- Rapport du jour en mode « Mon équipe » : à l'étape Frais, on note le nombre de livraisons de chaque livreur et le nombre de commandes de chaque closeuse, avec des boutons − et +. Le montant à payer se calcule tout seul. Seul le carburant se tape à la main.
- Ce qui est payé chaque jour sort du bénéfice du jour. Les salaires du mois et les frais fixes sortent **une seule fois** du bénéfice du mois, jamais du rapport du jour.
- Avec « Les deux », le rapport commence par le choix entre « Mon équipe » et une agence.

Tests à écrire : calcul des paiements par livraison et par commande, salaires retirés une fois par mois.

## Pas pour cette fois

La conversion F CFA vers euro ou dollar et la règle de partage personnalisée (section 8 de la maquette) attendent ma validation. Ne les code pas maintenant.
