# MathsMentales Collège

Plateforme d'exercices de calcul mental pour collégiens (6ème à 3ème) avec intégration Google Classroom.

## 🎯 Fonctionnalités

### Pour les professeurs
- ✅ Création de classes et gestion des élèves
- ✅ Sessions d'exercices personnalisées par niveau
- ✅ Suivi détaillé des progrès de chaque élève
- ✅ Statistiques et historiques
- ✅ Intégration Google Classroom (import de classes)

### Pour les élèves
- ✅ Connexion simplifiée avec Google
- ✅ Exercices adaptés au niveau (6ème à 3ème)
- ✅ Historique personnel
- ✅ Visualisation des progrès

## 🚀 Installation

### 1. Configuration Supabase

#### a) Créer un projet Supabase
1. Allez sur [supabase.com](https://supabase.com)
2. Créez un nouveau projet
3. Notez votre URL et vos clés API

#### b) Configurer l'authentification Google
1. Dans Supabase Dashboard → Authentication → Providers
2. Activez "Google"
3. Configurez les OAuth credentials (voir section Google Console ci-dessous)

#### c) Exécuter le schéma SQL
1. Dans Supabase Dashboard → SQL Editor
2. Copiez le contenu de `supabase/schema.sql`
3. Exécutez le script

### 2. Configuration Google Cloud Console

#### Créer un projet OAuth
1. Allez sur [console.cloud.google.com](https://console.cloud.google.com)
2. Créez un nouveau projet
3. Activez l'API Google Classroom :
   - APIs & Services → Library
   - Cherchez "Google Classroom API"
   - Cliquez sur "Enable"

#### Configurer OAuth 2.0
1. APIs & Services → Credentials
2. Create Credentials → OAuth 2.0 Client ID
3. Application type : Web application
4. Authorized redirect URIs :
   ```
   https://VOTRE_PROJET.supabase.co/auth/v1/callback
   http://localhost:3000/auth/callback
   ```
5. Copiez le Client ID et Client Secret

#### Écran de consentement OAuth
1. OAuth consent screen → User Type: Internal (si G Suite) ou External
2. Ajoutez les scopes :
   - `openid`
   - `profile`
   - `email`
   - `https://www.googleapis.com/auth/classroom.courses.readonly`
   - `https://www.googleapis.com/auth/classroom.rosters.readonly`

### 3. Installation du projet

```bash
# Cloner le repository
cd mathsmentales-college

# Installer les dépendances
npm install

# Copier le fichier d'environnement
cp .env.local.example .env.local

# Éditer .env.local avec vos clés
nano .env.local
```

### 4. Configuration des variables d'environnement

Éditez `.env.local` :

```env
# Supabase (depuis votre dashboard Supabase)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Google OAuth (depuis Google Cloud Console)
GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxx
NEXT_PUBLIC_GOOGLE_REDIRECT_URI=http://localhost:3000/auth/callback

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 5. Lancer en développement

```bash
npm run dev
```

Ouvrez [http://localhost:3000](http://localhost:3000)

## 📦 Déploiement sur Vercel

### 1. Push sur GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/VOTRE_USERNAME/mathsmentales-college.git
git push -u origin main
```

### 2. Déployer sur Vercel

1. Allez sur [vercel.com](https://vercel.com)
2. Cliquez sur "New Project"
3. Importez votre repository GitHub
4. Configurez les variables d'environnement (copiez depuis `.env.local`)
5. Cliquez sur "Deploy"

### 3. Mettre à jour Google OAuth

Une fois déployé, ajoutez l'URL Vercel dans :
1. Google Cloud Console → Credentials → Authorized redirect URIs :
   ```
   https://votre-app.vercel.app/auth/callback
   ```
2. Supabase Dashboard → Authentication → Redirect URLs :
   ```
   https://votre-app.vercel.app/auth/callback
   ```

## 🎓 Utilisation

### Pour les professeurs

1. **Première connexion**
   - Connectez-vous avec Google
   - Votre compte sera créé automatiquement en tant qu'élève
   - Contactez l'administrateur pour passer en mode "professeur"

2. **Créer une classe**
   - Dashboard → Mes classes → Créer une classe
   - Partagez le code de classe avec vos élèves

3. **Importer depuis Google Classroom** (à venir)
   - Dashboard → Importer une classe
   - Sélectionnez votre classe Google Classroom

4. **Créer une session d'exercices**
   - Sélectionnez une classe
   - Cliquez sur "Nouvelle session"
   - Choisissez le niveau, type d'exercice, nombre de questions

5. **Voir les résultats**
   - Dashboard → Ma classe → Résultats
   - Exportez les statistiques

### Pour les élèves

1. **Rejoindre une classe**
   - Connectez-vous avec Google
   - Entrez le code de classe fourni par votre professeur

2. **Faire un exercice**
   - Dashboard → Sessions disponibles
   - Cliquez sur une session
   - Répondez aux questions

3. **Voir ses résultats**
   - Dashboard → Mon historique

## 🛠️ Stack technique

- **Frontend** : Next.js 14 (App Router), React, TypeScript, Tailwind CSS
- **Backend** : Next.js API Routes (Serverless)
- **Base de données** : Supabase (PostgreSQL)
- **Authentification** : Supabase Auth + Google OAuth 2.0
- **Hébergement** : Vercel (gratuit)
- **Maths rendering** : KaTeX
- **Charts** : Chart.js

## 📝 Structure du projet

```
mathsmentales-college/
├── app/
│   ├── api/              # API routes
│   ├── auth/             # Pages d'authentification
│   ├── dashboard/        # Dashboard (prof/élève)
│   ├── exercices/        # Pages d'exercices
│   ├── globals.css       # Styles globaux
│   ├── layout.tsx        # Layout principal
│   └── page.tsx          # Page d'accueil
├── components/           # Composants React réutilisables
├── lib/                  # Utilitaires et clients (Supabase)
├── public/               # Assets statiques
│   ├── css/
│   ├── js/
│   └── img/
├── supabase/
│   └── schema.sql        # Schéma de base de données
├── types/                # Types TypeScript
└── middleware.ts         # Middleware Next.js (auth)
```

## 🔧 Configuration avancée

### Changer un élève en professeur

Dans Supabase SQL Editor :

```sql
UPDATE profiles
SET role = 'teacher'
WHERE email = 'prof@example.com';
```

### Désactiver une session

```sql
UPDATE exercise_sessions
SET is_active = false
WHERE id = 'session_id';
```

## 📚 Prochaines étapes

- [ ] Intégration complète Google Classroom API
- [ ] Plus de types d'exercices adaptés au collège
- [ ] Mode hors ligne (PWA)
- [ ] Export Excel/CSV des résultats
- [ ] Notifications par email
- [ ] Mode compétition entre classes

## 🤝 Contribution

Basé sur [MathsMentales.net](https://mathsmentales.net) (Licence Apache 2.0)

## 📄 Licence

Apache 2.0 - Open source et gratuit pour l'éducation

## 💬 Support

Pour toute question, ouvrez une issue sur GitHub.
