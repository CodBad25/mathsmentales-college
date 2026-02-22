# MathsMentales Collège

Plateforme de calcul mental pour le collège basée sur [MathsMentales.net](https://mathsmentales.net) (Sébastien Cogez), avec suivi des élèves via Google Classroom et Supabase.

## Stack technique

- **Frontend** : Next.js 14, React 18, TypeScript, Tailwind CSS
- **Auth** : Supabase Auth + Google OAuth (compatible Classroom)
- **BDD** : Supabase PostgreSQL (project `ewyelltfbkfrocygnydd`)
- **Moteur d'exercices** : Site original MathsMentales intégré en sous-dossier statique (`public/mathsmentales/`)
- **Déploiement** : Vercel

## Architecture

```
mathsmentales-college/
├── app/
│   ├── page.tsx                    # Page d'accueil
│   ├── layout.tsx                  # Layout principal
│   ├── auth/
│   │   ├── login/page.tsx          # Connexion Google
│   │   └── callback/route.ts       # Callback OAuth
│   ├── dashboard/
│   │   ├── page.tsx                # Dashboard prof/élève
│   │   └── sessions/new/page.tsx   # Création de session
│   ├── exercices/
│   │   ├── page.tsx                # Catalogue d'exercices
│   │   └── play/page.tsx           # Player React (exercices JSON)
│   ├── play/page.tsx               # Wrapper iframe MathsMentales
│   ├── s/[code]/page.tsx           # Accès session par code
│   └── api/
│       ├── results/route.ts        # Sauvegarde résultats (exercice libre)
│       └── sessions/
│           ├── route.ts            # CRUD sessions
│           └── results/route.ts    # Résultats de session
├── components/
│   └── RedirectCheck.tsx           # Redirect post-login vers exercice partagé
├── lib/
│   ├── supabase-browser.ts         # Client Supabase (browser)
│   └── exercises.ts                # Générateur d'exercices
├── public/
│   ├── mathsmentales/              # Site original intégré (voir section dédiée)
│   ├── sounds/                     # Sons du diaporama (17 mp3)
│   └── library/                    # Exercices JSON (224 fichiers)
├── supabase/
│   └── setup-final.sql             # Schéma complet BDD
└── middleware.ts                    # Protection routes /dashboard/*
```

## Intégration du site original MathsMentales

Le site original (vanilla JS, build Gulp/Rollup) est intégré comme sous-dossier statique dans `public/mathsmentales/`. Cela permet d'avoir 100% des exercices et modes originaux (diaporama, ceinture, exercices, duel, puzzle, wall, dominos, etc.).

### Source et build

- Repo original : `git@forge.apps.education.fr:mathsmentales/mathsmentales.forge.apps.education.fr.git`
- Clone dans `/tmp/mathsmentales-original/`, puis `npm install && npm run build` (Gulp)
- Les fichiers buildés sont copiés dans `public/mathsmentales/`
- Les bundles JS sont des IIFE (`type="module"`) — les variables internes ne sont PAS accessibles globalement

### Modifications apportées à l'original

- **Suppression lycée** : `"grille-lycee"` retiré de `library.ordre` dans les 15 bundles JS, menu lycée retiré de `index.html`
- **Chemins relatifs** : `/brevet-2025.html` → `brevet-2025.html`, `/favicon/...` → `favicon/...`
- **Spritesheet** : `spritesheetrev.webp` + `.png` copiés dans `css/` (icônes restart, pause, stop, etc.)
- **Valeurs par défaut** : 5 questions (au lieu de 10), 30 secondes (au lieu de 8) — modifié dans `index.html` (sliders) et fallbacks JS
- **Attribution** : section crédit Sébastien Cogez ajoutée dans `index.html`

### bridge.js — Script d'injection

Fichier `public/mathsmentales/bridge.js`, injecté dans les 17 pages HTML via `<script src="bridge.js">`.

**Rôle** : Détecter la fin d'une activité et permettre au prof de récupérer un lien partageable.

**Fonctionnement** :
1. Ignore la page d'accueil (`index.html`)
2. Surveille `#tab-content` (MutationObserver sur l'attribut `class`) — quand il perd la classe `hidden`, le diaporama est terminé
3. Affiche un **bouton flottant "Partager"** (bas droite, violet) qui ouvre une modale avec :
   - Le lien partageable au format `/play?mode=diaporama&...` (passe par la gate d'auth)
   - Un bouton "Copier"
   - Instructions pour coller dans Pronote/Classroom/cahier de texte
4. En mode interactif (`o=yes`), détecte aussi le score (`<section class="score">X/Y</section>`) et l'affiche
5. En iframe (via `/play`) : envoie un `postMessage` au parent Next.js + monkey-patch de `postMessage` pour intercepter `nbBonnesReponses`
6. Le bouton disparaît quand le diaporama est relancé (tab-content redevient hidden)

**Important** : Le mode diaporama classique (non interactif) n'a PAS de score natif — seul le mode interactif (`o=yes`) en produit un.

### Fichiers JS modifiés (15 bundles)

Tous dans `public/mathsmentales/js/lib.*.js` :
- `lib.mathsmentales-2.3.176.js` (page principale)
- `lib.diaporama-2.3.176.js`
- `lib.ceinture-2.3.176.js`
- `lib.exercices-2.3.176.js`
- `lib.duel-2.3.176.js`
- `lib.wall-2.3.176.js`
- `lib.puzzle-2.3.176.js`
- `lib.cartesflash-2.3.176.js`
- `lib.courseauxnombres-2.3.176.js`
- `lib.dominos-2.3.176.js`
- `lib.jaiquia-2.3.176.js`
- `lib.fichememo-2.3.176.js`
- `lib.exam-2.3.176.js`
- `lib.editor-2.3.176.js`
- `lib.editoryaml-2.3.176.js`

## Page /play — Wrapper iframe

`app/play/page.tsx` : page plein écran avec iframe qui charge le site MathsMentales.

- Écoute les `postMessage` de type `mathsmentales-result` depuis bridge.js
- Auth gate : si lien partagé et pas connecté → prompt Google login
- Sauvegarde les résultats dans Supabase (exercice libre ou session)
- Overlay de résultat avec score et lien de partage
- `makeShareableUrl()` : convertit l'URL iframe en URL `/play?mode=...&params`
- Redirige les params d'URL vers l'iframe (`mode`, `c`, `n`, `u`, etc.)

## Flux de partage (prof → élève)

1. Le prof lance un diaporama en classe depuis `/mathsmentales/`
2. A la fin, le bouton "Partager" apparaît (bridge.js)
3. Le prof copie le lien (`/play?mode=diaporama&c=...`)
4. Le prof colle le lien dans Pronote, Google Classroom, ou son cahier de texte
5. L'élève ouvre le lien → `/play` avec auth gate
6. L'élève se connecte avec Google → résultats sauvegardés dans Supabase
7. Le prof voit les résultats dans le dashboard

## Base de données (Supabase)

Tables principales (voir `supabase/setup-final.sql`) :
- `profiles` : id, email, full_name, avatar_url, role
- `classes` : id, name, teacher_id, google_classroom_id, join_code
- `class_students` : class_id, student_id
- `sessions` : id, class_id, teacher_id, title, exercise_config, code (6 chars)
- `session_results` : session_id, student_id, score, total_questions, time_spent
- `student_results` : exercice libre (hors session)

RLS activé sur toutes les tables.

## Commandes

```bash
# Développement
npm run dev              # Serveur de dev (port 3000)
npm run build            # Build production
npm run lint             # Linter

# Si port bloqué
lsof -ti :3001 | xargs kill -9; rm -rf .next; npx next dev -p 3001
```

## Crédits

- **MathsMentales** : Sébastien Cogez — [mathsmentales.net](https://mathsmentales.net) (Licence Apache 2.0)
- **Intégration Next.js et suivi élèves** : Mohamed Belhaj
