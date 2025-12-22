# Guide de configuration complet

## 📋 Prérequis

- Compte Google (Gmail ou G Suite)
- Compte Supabase (gratuit)
- Compte Vercel (gratuit)
- Compte Google Cloud Platform (gratuit)
- Node.js 18+ installé localement

## 🔧 Configuration étape par étape

### Étape 1 : Configuration Supabase

#### 1.1 Créer le projet Supabase

1. Allez sur https://supabase.com et connectez-vous
2. Cliquez sur "New Project"
3. Remplissez les informations :
   - **Name** : mathsmentales-college
   - **Database Password** : Choisissez un mot de passe fort (notez-le)
   - **Region** : Europe West (london) ou Europe Central (Frankfurt)
4. Cliquez sur "Create new project"
5. Attendez 1-2 minutes que le projet soit créé

#### 1.2 Récupérer les clés API

1. Dans votre projet, allez dans **Settings** → **API**
2. Notez les informations suivantes :
   - **Project URL** : `https://xxxxx.supabase.co`
   - **anon public** key : `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
   - **service_role** key : `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

#### 1.3 Exécuter le schéma SQL

1. Allez dans **SQL Editor** (icône dans le menu de gauche)
2. Cliquez sur "+ New query"
3. Copiez TOUT le contenu du fichier `supabase/schema.sql`
4. Collez-le dans l'éditeur
5. Cliquez sur "Run" (ou Ctrl+Enter)
6. Vérifiez qu'il n'y a pas d'erreur (vous devriez voir "Success. No rows returned")

#### 1.4 Vérifier les tables créées

1. Allez dans **Table Editor**
2. Vous devriez voir les tables :
   - profiles
   - classes
   - class_students
   - exercise_sessions
   - student_results

---

### Étape 2 : Configuration Google Cloud Platform

#### 2.1 Créer un projet GCP

1. Allez sur https://console.cloud.google.com
2. Cliquez sur le menu déroulant de projet (en haut) → "New Project"
3. Nom du projet : "MathsMentales College"
4. Cliquez sur "Create"
5. Attendez que le projet soit créé et sélectionnez-le

#### 2.2 Activer Google Classroom API

1. Dans le menu, allez dans **APIs & Services** → **Library**
2. Dans la barre de recherche, tapez "Google Classroom API"
3. Cliquez sur "Google Classroom API"
4. Cliquez sur le bouton **Enable**
5. Attendez quelques secondes

#### 2.3 Configurer l'écran de consentement OAuth

1. Allez dans **APIs & Services** → **OAuth consent screen**
2. Sélectionnez "External" (sauf si vous avez un compte G Suite, dans ce cas choisissez "Internal")
3. Cliquez sur "Create"
4. Remplissez le formulaire :
   - **App name** : MathsMentales Collège
   - **User support email** : votre email
   - **Developer contact information** : votre email
5. Cliquez sur "Save and Continue"
6. Sur la page "Scopes" :
   - Cliquez sur "Add or Remove Scopes"
   - Cochez les scopes suivants :
     - `.../auth/userinfo.email`
     - `.../auth/userinfo.profile`
     - `openid`
   - Dans "Manually add scopes", ajoutez :
     - `https://www.googleapis.com/auth/classroom.courses.readonly`
     - `https://www.googleapis.com/auth/classroom.rosters.readonly`
   - Cliquez sur "Update" puis "Save and Continue"
7. Sur la page "Test users" (si External), ajoutez votre email
8. Cliquez sur "Save and Continue"
9. Vérifiez le résumé et cliquez sur "Back to Dashboard"

#### 2.4 Créer les identifiants OAuth

1. Allez dans **APIs & Services** → **Credentials**
2. Cliquez sur "+ Create Credentials" → "OAuth client ID"
3. Sélectionnez "Web application"
4. Nom : "MathsMentales Web Client"
5. Dans **Authorized JavaScript origins**, ajoutez :
   ```
   http://localhost:3000
   ```
6. Dans **Authorized redirect URIs**, ajoutez :
   ```
   http://localhost:3000/auth/callback
   https://VOTRE_PROJET.supabase.co/auth/v1/callback
   ```
   (Remplacez VOTRE_PROJET par votre URL Supabase)
7. Cliquez sur "Create"
8. **IMPORTANT** : Notez le **Client ID** et **Client Secret** qui s'affichent

---

### Étape 3 : Configurer l'authentification Google dans Supabase

1. Retournez sur Supabase Dashboard
2. Allez dans **Authentication** → **Providers**
3. Trouvez "Google" dans la liste et cliquez dessus
4. Activez le toggle "Enable Sign in with Google"
5. Collez vos identifiants :
   - **Client ID** : celui de Google Cloud
   - **Client Secret** : celui de Google Cloud
6. Cliquez sur "Save"

---

### Étape 4 : Configuration locale du projet

#### 4.1 Créer le fichier .env.local

Dans le dossier `mathsmentales-college`, créez un fichier `.env.local` :

```bash
cp .env.local.example .env.local
```

#### 4.2 Remplir les variables d'environnement

Éditez `.env.local` et remplissez :

```env
# Supabase (depuis Supabase Dashboard → Settings → API)
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

#### 4.3 Installer les dépendances

```bash
npm install
```

#### 4.4 Lancer le projet

```bash
npm run dev
```

Ouvrez http://localhost:3000 dans votre navigateur.

---

### Étape 5 : Test de connexion

1. Sur la page d'accueil, cliquez sur "Se connecter"
2. Cliquez sur "Se connecter avec Google"
3. Vous serez redirigé vers Google
4. Connectez-vous avec votre compte Google
5. Acceptez les permissions demandées
6. Vous devriez être redirigé vers le dashboard

#### Vérification dans Supabase

1. Allez dans **Authentication** → **Users**
2. Vous devriez voir votre utilisateur créé
3. Allez dans **Table Editor** → **profiles**
4. Vous devriez voir votre profil avec role = 'student'

---

### Étape 6 : Passer en mode professeur

Pour tester les fonctionnalités professeur :

1. Dans Supabase, allez dans **SQL Editor**
2. Exécutez cette requête (remplacez par votre email) :

```sql
UPDATE profiles
SET role = 'teacher'
WHERE email = 'votre.email@gmail.com';
```

3. Déconnectez-vous et reconnectez-vous
4. Vous devriez maintenant voir l'interface professeur

---

### Étape 7 : Déploiement sur Vercel

#### 7.1 Préparer le repository Git

```bash
git init
git add .
git commit -m "Initial commit - MathsMentales Collège"
```

#### 7.2 Créer un repository GitHub

1. Allez sur https://github.com
2. Cliquez sur "+" → "New repository"
3. Nom : mathsmentales-college
4. Laissez "Public" ou choisissez "Private"
5. Ne cochez RIEN (pas de README, pas de .gitignore)
6. Cliquez sur "Create repository"
7. Suivez les instructions pour "push an existing repository" :

```bash
git remote add origin https://github.com/VOTRE_USERNAME/mathsmentales-college.git
git branch -M main
git push -u origin main
```

#### 7.3 Déployer sur Vercel

1. Allez sur https://vercel.com
2. Connectez-vous avec GitHub
3. Cliquez sur "Add New..." → "Project"
4. Sélectionnez votre repository "mathsmentales-college"
5. Configurez les variables d'environnement :
   - Cliquez sur "Environment Variables"
   - Ajoutez TOUTES les variables de votre `.env.local`
   - **Important** : Ne mettez PAS `NEXT_PUBLIC_APP_URL` à localhost, mettez une URL temporaire ou laissez vide
6. Cliquez sur "Deploy"
7. Attendez 1-2 minutes

#### 7.4 Récupérer l'URL de production

Une fois déployé :
1. Notez votre URL Vercel (ex: `https://mathsmentales-college.vercel.app`)
2. Retournez dans les Settings du projet Vercel
3. Éditez la variable `NEXT_PUBLIC_APP_URL` et mettez votre URL Vercel

#### 7.5 Mettre à jour les redirections OAuth

##### Dans Google Cloud Console

1. **APIs & Services** → **Credentials**
2. Cliquez sur votre "OAuth 2.0 Client ID"
3. Dans **Authorized redirect URIs**, ajoutez :
   ```
   https://mathsmentales-college.vercel.app/auth/callback
   ```
4. Cliquez sur "Save"

##### Dans Supabase

1. **Authentication** → **URL Configuration**
2. Dans **Redirect URLs**, ajoutez :
   ```
   https://mathsmentales-college.vercel.app/auth/callback
   ```
3. Cliquez sur "Save"

---

## ✅ Vérification finale

Testez votre application en production :

1. Allez sur votre URL Vercel
2. Cliquez sur "Se connecter"
3. Connectez-vous avec Google
4. Vérifiez que vous arrivez sur le dashboard

---

## 🐛 Dépannage

### Erreur "redirect_uri_mismatch"

- Vérifiez que l'URL de redirection dans Google Cloud Console correspond EXACTEMENT à celle utilisée
- Format : `https://PROJET.supabase.co/auth/v1/callback` (sans slash final)

### Erreur "Invalid JWT"

- Vérifiez que les clés Supabase sont correctes dans `.env.local`
- Assurez-vous d'avoir bien copié les clés en entier (elles sont longues)

### L'utilisateur ne se crée pas dans la base

- Vérifiez que le schéma SQL a bien été exécuté
- Regardez les erreurs dans Supabase Dashboard → **Logs** → **Postgres Logs**

### Les tables n'existent pas

- Réexécutez le script `supabase/schema.sql`
- Vérifiez qu'il n'y a pas d'erreur dans l'exécution

---

## 📞 Besoin d'aide ?

Si vous êtes bloqué, notez :
1. L'étape où vous êtes bloqué
2. Le message d'erreur exact
3. Ce que vous avez essayé

Et ouvrez une issue sur GitHub !
