@AGENTS.md

# CODCompta — règles pour les assistants de code

## UI/UX : skills obligatoires

Toute tâche qui change ce que l'utilisateur voit ou manipule (page, composant, formulaire, tableau, navigation, couleurs, typographie, animation, email, logo) DOIT suivre les skills du dossier `.claude/skills/` :

- `ui-ux-pro-max` : règles UX par priorité (accessibilité, interactions, performance, mise en page, formulaires, navigation, graphiques) et recherche dans sa base de données.
- `ui-styling` : shadcn/ui + Tailwind (le stack de ce projet).
- `design-system` : architecture des tokens (primitifs → sémantiques → composants).

Déroulé attendu :

1. Lire `.claude/skills/ui-ux-pro-max/SKILL.md`.
2. Lancer les recherches utiles, depuis la racine du projet :
   ```bash
   python3 .claude/skills/ui-ux-pro-max/scripts/search.py "<besoin>" --domain ux
   python3 .claude/skills/ui-ux-pro-max/scripts/search.py "<besoin>" --stack shadcn
   python3 .claude/skills/ui-ux-pro-max/scripts/search.py "<besoin>" --stack laravel
   ```
   (Le SKILL.md écrit `${CLAUDE_PLUGIN_ROOT}/.claude/skills/...` : dans ce projet, le chemin est `.claude/skills/...`.)
3. Avant de livrer, passer la checklist de `references/quick-reference.md` (§1 à §3 au minimum) et celle de `references/pro-rules.md`.

## Identité de CODCompta (prioritaire sur les palettes proposées par la recherche)

La recherche `--design-system` sert d'inspiration ; l'identité existante ne change pas sans accord :

- Couleurs : émeraude `#0F8A6C` (principale), menthe `#5FD3B0`, or `#F4B23E` (la pièce, l'épargne), encre `#0B2A33` (textes), corail `#E4654A` (pertes et alertes uniquement). Toujours via les tokens CSS de `resources/css/app.css`, jamais de hex brut dans les composants.
- Typographie : Sora (titres, chiffres, logo), Manrope (textes).
- Style : surfaces pleines et bordures fines (`.glass` = carte standard), une seule surface sombre par page réservée au chiffre principal (`.glass-hero`), rayons 8/12/16 px, boutons de 44 et 48 px, chiffres en `tabular-nums`. Statuts via `.badge-success`, `.badge-warning`, `.badge-danger`, `.badge-info`, `.badge-neutral`.
- Logo : `resources/js/components/app-logo-icon.tsx` (variantes `tile`, `mark`, `white`). Charte complète dans Figma « CODCompta — Identité de marque ».
- Langue de l'interface : français ; pas de point médian « · » dans les textes.
