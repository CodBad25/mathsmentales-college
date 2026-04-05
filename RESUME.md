# MathsMentales Collège

Plateforme de calcul mental pour le collège basée sur [MathsMentales.net](https://mathsmentales.net) (Sébastien Cogez), avec suivi des élèves via Google Classroom et Supabase.

## Stack technique

- **Frontend** : Next.js 14, React 18, TypeScript, Tailwind CSS
- **Auth** : Supabase Auth + Google OAuth (compatible Classroom)
- **BDD** : Supabase PostgreSQL (project `ewyelltfbkfrocygnydd`)
- **Moteur d'exercices** : Site original MathsMentales intégré en sous-dossier statique (`public/mathsmentales/`)
- **Déploiement** : Oracle Cloud (PM2 + Nginx) sur `mathsmentales.beltools.fr`

## Architecture

```
mathsmentales-college/
├── app/
│   ├── page.tsx                    # Page d'accueil
│   ├── layout.tsx                  # Layout principal
│   ├── auth/
│   │   ├── login/page.tsx          # Connexion Google
│   │   ├── logout/route.ts         # Déconnexion
│   │   └── callback/route.ts       # Callback OAuth (NEXT_PUBLIC_APP_URL pour redirect)
│   ├── dashboard/
│   │   ├── page.tsx                # Dashboard prof/élève
│   │   ├── sessions/new/page.tsx   # Création de session (avancé)
│   │   └── ...                     # progress, students, sessions
│   ├── exercices/
│   │   ├── page.tsx                # Catalogue d'exercices (459 exercices)
│   │   └── play/page.tsx           # Player React (exercices JSON locaux)
│   ├── play/page.tsx               # Wrapper iframe MathsMentales (pour liens partagés)
│   ├── s/[code]/page.tsx           # Accès session par code
│   └── api/
│       ├── results/route.ts        # Sauvegarde résultats (exercice libre)
│       └── sessions/
│           ├── route.ts            # CRUD sessions
│           └── results/route.ts    # Résultats de session
├── hooks/
│   ├── useExerciseOptions.ts       # Logique sélection options/variantes (partagé)
│   └── useExerciseDetail.ts        # Chargement détail exercice (partagé)
├── components/
│   ├── ExerciseModal.tsx           # Modale config exercice (partagé catalogue/sessions)
│   ├── QuickSessionCreator.tsx     # Création rapide de session depuis catalogue
│   └── RedirectCheck.tsx           # Redirect post-login vers exercice partagé
├── lib/
│   ├── supabase.ts                 # Client Supabase (server)
│   ├── supabase-browser.ts         # Client Supabase (browser)
│   └── exercises.ts                # Générateur d'exercices
├── public/
│   ├── mathsmentales/              # Site original intégré (voir section dédiée)
│   ├── sounds/                     # Sons du diaporama (17 mp3)
│   └── library/                    # Exercices JSON (224 fichiers, 459 indexés dans content.json)
├── supabase/
│   └── setup-final.sql             # Schéma complet BDD
└── middleware.ts                    # Protection routes /dashboard/*, redirect derrière Nginx
```

## Déploiement Oracle Cloud

- **IP** : 89.168.61.230
- **SSH** : `ssh -i ~/.ssh/oracle-serveur.key ubuntu@89.168.61.230`
- **Domaine** : `mathsmentales.beltools.fr` (DNS A record)
- **Process** : PM2 (`pm2 restart mathsmentales`)
- **Reverse proxy** : Nginx (`/etc/nginx/sites-enabled/mathsmentales-college`)
- **SSL** : Let's Encrypt via Certbot

### Config Nginx importante

Supabase Auth + Google OAuth avec 8 scopes Classroom = cookies très gros. Nginx doit avoir des buffers augmentés :
```nginx
proxy_buffer_size 128k;
proxy_buffers 4 256k;
proxy_busy_buffers_size 256k;
```
Sans ça → `502 Bad Gateway` sur `/auth/callback` (erreur : `upstream sent too big header`).

### Variables d'environnement (`.env.local` sur le serveur)

```
NEXT_PUBLIC_APP_URL=https://mathsmentales.beltools.fr
NEXT_PUBLIC_GOOGLE_REDIRECT_URI=https://mathsmentales.beltools.fr/auth/callback
NEXT_PUBLIC_SUPABASE_URL=https://ewyelltfbkfrocygnydd.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

`NEXT_PUBLIC_APP_URL` est critique : derrière Nginx, `request.url` résout en `localhost:3000`. Les redirections auth utilisent cette variable.

### Déployer

```bash
ssh -i ~/.ssh/oracle-serveur.key ubuntu@89.168.61.230 "cd /home/ubuntu/mathsmentales-college && git pull && npm run build && pm2 restart mathsmentales"
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

Fichier `public/mathsmentales/bridge.js` (cache-buster: `?v=2`), injecté dans les 17 pages HTML via `<script src="bridge.js?v=2">`.

**Rôle** : Détecter la fin d'une activité et permettre au prof de récupérer un lien partageable.

**Fonctionnement** :
1. Ignore la page d'accueil (`index.html`)
2. Surveille `#tab-content` (MutationObserver sur l'attribut `class`) — quand il perd la classe `hidden`, le diaporama est terminé
3. Affiche un **bouton flottant "Partager"** (bas droite, violet) qui ouvre une modale avec :
   - Le lien partageable au format `/play?mode=diaporama&...` (passe par la gate d'auth)
   - Un bouton "Copier"
   - Instructions pour coller dans Pronote/Classroom/cahier de texte
4. Affiche un **bouton "Créer une session"** (bas droite, vert) :
   - En iframe : envoie postMessage au parent
   - En navigation directe : redirige vers `/dashboard/sessions/new?exerciseUrl=...&exerciseTitle=...`
5. En mode interactif (`o=yes`), détecte aussi le score (`<section class="score">X/Y</section>`) et l'affiche
6. En iframe (via `/play`) : envoie un `postMessage` au parent Next.js + monkey-patch de `postMessage` pour intercepter `nbBonnesReponses`
7. Le bouton disparaît quand le diaporama est relancé (tab-content redevient hidden)

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

## Catalogue d'exercices (`/exercices`)

### Architecture refactorisée (hooks partagés)

Le code modale exercice est partagé entre `/exercices` et `/dashboard/sessions/new` via :
- `hooks/useExerciseOptions.ts` : sélection options, sous-options, nb questions, durée
- `hooks/useExerciseDetail.ts` : chargement détail exercice JSON
- `components/ExerciseModal.tsx` : modale réutilisable (config + actions)

### Flux "C'est parti !" (prof teste un exercice)

1. Prof clique "C'est parti !" dans la modale du catalogue
2. `handlePlay()` navigue **directement** vers `/mathsmentales/diaporama.html?params`
3. Le diaporama charge l'exercice et affiche "Démarrer le diaporama" (comportement normal)
4. **Raison** : le diaporama ne démarre pas automatiquement dans une iframe (`window.opener === null`), donc on navigue directement

### Format URL diaporama

Le diaporama MathsMentales attend une URL au format tilde/virgule :
```
diaporama.html?a=,fs=sansSerif,i=nothing,e=nothing,o=no,s=1,so=horizontal,f=false,snd=0&p=0~t=Titre~c=0~o=true~d=normal~at=10_i=6GC5~o=0,1,2~q=0.0,1,2-1.0~p=~t=10~n=10
```

**Structure** :
- **Segment 1** (séparé par `,`) : params globaux (`a=`, `fs=`, `i=`, `e=`, `o=`, `s=`, `so=`, `f=`, `snd=`)
- **Segment 2+** (séparé par `&`, commence par `p`) : carte + activités
  - Carte : `p=0~t=Titre~c=0~o=true~d=normal~at=10` (séparé par `~`)
  - Activités : `_i=ID~o=options~q=suboptions~p=~t=tempo~n=nbQuestions` (séparé par `_i`)

**Param `q=` (sub-options)** : format `optIdx.subOpt1,subOpt2-optIdx.subOpt` (ex: `0.0,1,2-1.0-2.0,1`). **OBLIGATOIRE** — si vide, les slides sont vides (page jaune vide).

**Param `o=`** (options) : indices des options sélectionnées, séparés par `,` (ex: `0,1,2`).

### Recherche cross-niveau

Quand une recherche est active, le catalogue cherche dans le niveau sélectionné + les niveaux inférieurs :
- 5e → cherche 5e + 6e
- 4e → cherche 4e + 5e + 6e
- 3e → cherche tout

### Content.json (index des exercices)

`public/library/content.json` : 459 exercices indexés (régénéré depuis les fichiers JSON).
1 exercice non classable : 3LN1 "Équations" (pas de thème correspondant).

## Page /play — Wrapper iframe (liens partagés élèves)

`app/play/page.tsx` : page plein écran avec iframe qui charge le site MathsMentales.

- **Auth gate** : vérification Supabase avec timeout 3s (si Supabase ne répond pas, charge quand même)
- Si lien partagé et pas connecté → prompt Google login avec option "Continuer sans compte"
- Écoute les `postMessage` de type `mathsmentales-result` depuis bridge.js
- Sauvegarde les résultats dans Supabase (exercice libre ou session)
- Overlay de résultat avec score et lien de partage
- `makeShareableUrl()` : convertit l'URL iframe en URL `/play?mode=...&params`
- `getIframeUrl()` : reconstruit l'URL iframe depuis `window.location.search` brut (préserve le format tilde)

### Problème connu : page jaune vide dans l'iframe

Le diaporama dans une iframe ne démarre PAS automatiquement car `window.opener === null`. Le code du diaporama original (`lib.diaporama-2.3.176.js`) vérifie :
```js
if (t || null !== window.opener) {
    diaporama$1.start(i);  // Auto-start
} else {
    // Affiche "Démarrer le diaporama" button
}
```

**Solutions possibles (non implémentées)** :
1. Utiliser `window.open()` au lieu d'une iframe → `window.opener` serait défini
2. Patcher le JS du diaporama pour auto-start dans les iframes
3. Injecter un script qui clique automatiquement le bouton "Démarrer"

**Solution actuelle pour le prof** : navigation directe vers `/mathsmentales/diaporama.html` (pas d'iframe).
**Pour les élèves** : le lien `/play?...` charge l'iframe → l'élève doit cliquer "Démarrer". C'est un point à améliorer.

## Flux de partage (prof → élève)

1. Le prof va sur `/exercices`, configure un exercice, clique "C'est parti !"
2. Le diaporama s'ouvre directement (`/mathsmentales/diaporama.html?...`)
3. A la fin, les boutons "Partager" et "Créer une session" apparaissent (bridge.js)
4. **"Partager"** → modale avec lien `/play?mode=diaporama&...` à copier
5. **"Créer une session"** → redirige vers `/dashboard/sessions/new?exerciseUrl=...`
6. Le prof colle le lien dans Pronote, Google Classroom, ou cahier de texte
7. L'élève ouvre le lien → `/play` avec auth gate → iframe diaporama
8. L'élève se connecte Google → résultats sauvegardés dans Supabase

## Base de données (Supabase)

Tables principales (voir `supabase/setup-final.sql`) :
- `profiles` : id, email, full_name, avatar_url, role, google_access_token, google_refresh_token
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
npm run dev -- -p 3001   # Port personnalisé
npm run build            # Build production
npm run lint             # Linter

# Si port bloqué
npx kill-port 3001; rm -rf .next; npm run dev -- -p 3001

# Déploiement Oracle
ssh -i ~/.ssh/oracle-serveur.key ubuntu@89.168.61.230 "cd /home/ubuntu/mathsmentales-college && git pull && npm run build && pm2 restart mathsmentales"
```

## Problèmes connus / TODO

- [ ] **Lien partagé → page jaune** : dans l'iframe `/play`, le diaporama ne démarre pas automatiquement (voir section "Problème connu")
- [ ] **Bridge.js cache** : les fichiers statiques dans `public/mathsmentales/` sont cachés agressivement par le navigateur. Utiliser `?v=N` (cache-buster) et incrémenter à chaque modif
- [ ] **1 exercice non indexé** : 3LN1 "Équations" (pas de thème correspondant dans content.json)

## Crédits

- **MathsMentales** : Sébastien Cogez — [mathsmentales.net](https://mathsmentales.net) (Licence Apache 2.0)
- **Intégration Next.js et suivi élèves** : Mohamed Belhaj
