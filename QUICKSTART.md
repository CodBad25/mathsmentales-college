# 🚀 Démarrage rapide - MathsMentales Collège

Guide ultra-rapide pour lancer votre plateforme en 15 minutes.

## ⚡ En bref

Cette plateforme vous permet de :
- Créer des classes et gérer vos élèves
- Créer des sessions d'exercices personnalisées (6ème à 3ème)
- Les élèves se connectent avec Google Classroom
- Suivre les progrès et historiques de chaque élève
- **100% gratuit** avec Vercel + Supabase

---

## 📦 Ce qui a été créé

Voici la structure de votre projet :

```
mathsmentales-college/
├── app/                      # Pages Next.js
│   ├── page.tsx             # Page d'accueil
│   ├── auth/                # Authentification Google
│   └── dashboard/           # Dashboard prof/élève
├── lib/
│   ├── supabase.ts          # Client Supabase
│   └── exercises.ts         # Générateur d'exercices
├── supabase/
│   └── schema.sql           # Base de données
├── types/                   # Types TypeScript
├── README.md                # Documentation complète
├── CONFIGURATION.md         # Guide de config détaillé
└── package.json
```

---

## 🏁 Étapes pour démarrer

### 1️⃣ Installer les dépendances (1 min)

```bash
cd mathsmentales-college
npm install
```

### 2️⃣ Configurer Supabase (5 min)

#### a) Créer le projet
1. Allez sur [supabase.com](https://supabase.com) → New Project
2. Notez votre **URL** et **anon key** (Settings → API)

#### b) Créer la base de données
1. Dans Supabase → SQL Editor
2. Copiez TOUT le contenu de `supabase/schema.sql`
3. Exécutez (Run)

### 3️⃣ Configurer Google OAuth (5 min)

#### a) Créer les identifiants
1. [Google Cloud Console](https://console.cloud.google.com) → New Project
2. APIs & Services → Credentials → Create OAuth Client ID
3. Type : Web Application
4. Redirect URI : `https://VOTRE_PROJET.supabase.co/auth/v1/callback`
5. Notez **Client ID** et **Client Secret**

#### b) Activer dans Supabase
1. Supabase → Authentication → Providers → Google
2. Collez Client ID et Secret
3. Save

### 4️⃣ Configurer les variables d'environnement (2 min)

```bash
cp .env.local.example .env.local
```

Éditez `.env.local` :

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...

GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxx
NEXT_PUBLIC_GOOGLE_REDIRECT_URI=http://localhost:3000/auth/callback

NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 5️⃣ Lancer l'application (30 sec)

```bash
npm run dev
```

Ouvrez [http://localhost:3000](http://localhost:3000)

---

## 🎯 Premier test

### Connexion
1. Cliquez sur "Se connecter"
2. Connectez-vous avec Google
3. Vous arrivez sur le dashboard (en tant qu'élève)

### Passer en professeur
Dans Supabase SQL Editor :

```sql
UPDATE profiles
SET role = 'teacher'
WHERE email = 'votre.email@gmail.com';
```

Déconnectez-vous et reconnectez-vous → Vous êtes prof !

---

## 🚀 Déployer sur Vercel (5 min)

### Push sur GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/VOTRE_USERNAME/mathsmentales-college.git
git push -u origin main
```

### Déployer

1. [vercel.com](https://vercel.com) → New Project
2. Importez votre repo GitHub
3. Ajoutez TOUTES les variables d'environnement
4. Deploy !

### Mise à jour OAuth

Après déploiement, ajoutez votre URL Vercel :

**Google Console :**
- Redirect URI : `https://votre-app.vercel.app/auth/callback`

**Supabase :**
- Redirect URL : `https://votre-app.vercel.app/auth/callback`

---

## ✅ Checklist de vérification

- [ ] Projet Supabase créé
- [ ] Schéma SQL exécuté (tables visibles dans Table Editor)
- [ ] Google OAuth configuré
- [ ] Variables `.env.local` remplies
- [ ] `npm install` exécuté
- [ ] `npm run dev` fonctionne
- [ ] Connexion Google fonctionne
- [ ] Profil visible dans Supabase

---

## 🎓 Utilisation rapide

### Créer une classe (prof)
1. Dashboard → Créer une classe
2. Nom : "6ème A"
3. Notez le **code de classe** (ex: ABC123)

### Rejoindre une classe (élève)
1. Dashboard → Rejoindre une classe
2. Entrez le code ABC123

### Créer un exercice (prof)
1. Dashboard → Ma classe → Nouvelle session
2. Choisissez :
   - Niveau : 6ème
   - Thème : Multiplication
   - 10 questions
   - 30 secondes par question
3. Créer

### Faire un exercice (élève)
1. Dashboard → Sessions disponibles
2. Cliquez sur la session
3. Répondez aux questions
4. Voir votre score

---

## 📚 Prochaines étapes

Une fois que ça fonctionne :

1. **Personnaliser** : Modifiez les couleurs dans `tailwind.config.ts`
2. **Ajouter des exercices** : Éditez `lib/exercises.ts`
3. **Intégration Classroom** : Voir `CONFIGURATION.md`
4. **Interface professeur** : Créez les pages de stats détaillées

---

## 🐛 Problèmes courants

### "redirect_uri_mismatch"
→ L'URL de redirection dans Google Console ne correspond pas
→ Vérifiez : `https://PROJET.supabase.co/auth/v1/callback` (sans slash final)

### "Invalid JWT"
→ Mauvaise clé Supabase dans `.env.local`
→ Re-copiez depuis Supabase Dashboard

### Les tables n'existent pas
→ Réexécutez `supabase/schema.sql` dans SQL Editor

### Cannot read property 'user'
→ Problème d'authentification
→ Vérifiez que Google OAuth est activé dans Supabase

---

## 📞 Aide

- **Documentation complète** : Voir `README.md`
- **Configuration détaillée** : Voir `CONFIGURATION.md`
- **Code original** : [MathsMentales.net](https://mathsmentales.net)

---

## 🎉 C'est prêt !

Vous avez maintenant une plateforme complète pour vos élèves de collège !

**Fonctionnalités disponibles :**
- ✅ Authentification Google
- ✅ Création de classes
- ✅ Exercices de calcul mental (6ème → 3ème)
- ✅ Suivi des élèves
- ✅ Historiques personnalisés
- ✅ Déploiement gratuit

**À venir :**
- Google Classroom API (import automatique)
- Plus d'exercices (géométrie, équations, etc.)
- Statistiques avancées
- Mode compétition

Bon enseignement ! 🧮📚
