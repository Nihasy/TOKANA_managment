# 🚀 Guide de Déploiement - Tokana Delivery Management

## 📋 Prérequis

- Node.js 18+ installé
- Base de données PostgreSQL configurée
- Git installé

---

## 🔧 Configuration des Variables d'Environnement

### Développement Local

Créez un fichier `.env.local` à la racine du projet :

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/tokana_delivery"

# NextAuth Configuration
NEXTAUTH_SECRET="your-super-secret-key-change-this"
NEXTAUTH_URL="http://localhost:3000"
```

### Production

Configurez ces variables sur votre plateforme de déploiement (Vercel, Railway, etc.) :

```env
# Database (exemple avec une DB cloud)
DATABASE_URL="postgresql://user:password@db-host.com:5432/tokana_delivery?sslmode=require"

# NextAuth (IMPORTANT: Générer un nouveau secret)
NEXTAUTH_SECRET="production-secret-generated-with-openssl-rand-base64-32"
NEXTAUTH_URL="https://votre-domaine.com"
```

**⚠️ IMPORTANT:** Générez un nouveau secret sécurisé :
```bash
openssl rand -base64 32
```

---

## 📦 Installation

### 1. Cloner le Repository
```bash
git clone https://github.com/votre-username/tokana-delivery-management-app.git
cd tokana-delivery-management-app
```

### 2. Installer les Dépendances
```bash
npm install
```

### 3. Configurer la Base de Données
```bash
# Pousser le schéma vers la DB
npx prisma db push

# (Optionnel) Ajouter des données de test
npm run prisma:seed
```

### 4. Lancer en Développement
```bash
npm run dev
```

L'application sera accessible sur `http://localhost:3000`

---

## 🌐 Déploiement sur Vercel (Recommandé)

### 1. Préparer le Repository
```bash
git add .
git commit -m "feat: ready for deployment"
git push origin main
```

### 2. Créer un Projet Vercel
1. Aller sur [vercel.com](https://vercel.com)
2. Cliquer sur "New Project"
3. Importer votre repository GitHub
4. Configurer les variables d'environnement :
   - `DATABASE_URL`
   - `NEXTAUTH_SECRET`
   - `NEXTAUTH_URL`

### 3. Déployer
Vercel déploiera automatiquement à chaque push sur `main`

---

## 🐘 Déploiement de la Base de Données

### Option 1: Supabase (Recommandé)
1. Créer un compte sur [supabase.com](https://supabase.com)
2. Créer un nouveau projet
3. Copier la connection string PostgreSQL
4. Utiliser cette URL pour `DATABASE_URL`

### Option 2: Railway
1. Créer un compte sur [railway.app](https://railway.app)
2. Créer un service PostgreSQL
3. Copier la connection string
4. Utiliser cette URL pour `DATABASE_URL`

### Option 3: Neon
1. Créer un compte sur [neon.tech](https://neon.tech)
2. Créer une base de données
3. Copier la connection string
4. Utiliser cette URL pour `DATABASE_URL`

---

## 👥 Comptes de Test

Après avoir exécuté `npm run prisma:seed`, ces comptes seront disponibles :

### Administrateur
- **Email:** `admin@tokana.mg`
- **Mot de passe:** `admin123`
- **Accès:** Dashboard admin complet

### Livreur
- **Email:** `livreur1@tokana.mg`
- **Mot de passe:** `livreur123`
- **Accès:** Interface livreur

### Client (pour tests API)
- **Nom:** `Restaurant La Terrasse`
- **Téléphone:** `+261 34 12 345 67`

---

## 🔐 Sécurité en Production

### 1. Générer un Nouveau NEXTAUTH_SECRET
```bash
openssl rand -base64 32
```
Copiez le résultat et utilisez-le comme `NEXTAUTH_SECRET`

### 2. Activer HTTPS
- Vercel active HTTPS automatiquement
- Pour d'autres plateformes, configurez un certificat SSL

### 3. Sécuriser la Base de Données
- Utilisez des connexions SSL/TLS
- Configurez un firewall pour n'autoriser que votre serveur
- Utilisez des credentials complexes

### 4. Changer les Mots de Passe par Défaut
```bash
# Connectez-vous à l'admin avec admin@tokana.mg / admin123
# Puis changez immédiatement le mot de passe dans l'interface
```

---

## 📊 Vérifications Post-Déploiement

### 1. Test de Connexion
- [ ] Se connecter en tant qu'admin
- [ ] Se connecter en tant que livreur
- [ ] Vérifier la redirection automatique basée sur le rôle

### 2. Test CRUD
- [ ] Créer un client
- [ ] Créer un livreur
- [ ] Créer une livraison
- [ ] Modifier une livraison
- [ ] Supprimer une livraison

### 3. Test Workflow Livreur
- [ ] Marquer livraison comme récupérée
- [ ] Marquer comme livrée
- [ ] Marquer comme payée
- [ ] Reporter une livraison
- [ ] Ajouter des remarques

### 4. Test Rapports
- [ ] Générer un compte rendu client (PDF + CSV)
- [ ] Générer un rapport de règlement J+1
- [ ] Effectuer un règlement du soir

---

## 🛠️ Commandes Utiles

### Développement
```bash
npm run dev              # Lancer en mode développement
npm run build            # Build pour production
npm run start            # Lancer en mode production
npm run lint             # Vérifier le code avec ESLint
```

### Base de Données
```bash
npx prisma studio        # Interface graphique pour la DB
npx prisma db push       # Synchroniser le schéma
npx prisma validate      # Valider le schéma
npm run prisma:seed      # Ajouter données de test
npm run prisma:reset     # Nettoyer toutes les données
```

### Debug
```bash
npx prisma studio        # Explorer la DB
npm run dev -- --turbo   # Mode turbo (plus rapide)
```

---

## 🐛 Dépannage

### Erreur: "Invalid `prisma.xxx.findMany()` invocation"
**Cause:** Base de données non synchronisée  
**Solution:**
```bash
npx prisma db push
npx prisma generate
```

### Erreur: "NEXTAUTH_SECRET must be provided"
**Cause:** Variable d'environnement manquante  
**Solution:** Vérifier que `.env.local` contient `NEXTAUTH_SECRET`

### Erreur: "Cannot connect to database"
**Cause:** `DATABASE_URL` invalide  
**Solution:** Vérifier la connection string PostgreSQL

### Build échoue sur Vercel
**Cause:** Variables d'environnement manquantes  
**Solution:** 
1. Aller dans Settings > Environment Variables
2. Ajouter `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`
3. Re-déployer

---

## 📈 Monitoring (Optionnel)

### Ajouter Sentry pour Error Tracking
```bash
npm install @sentry/nextjs
npx @sentry/wizard -i nextjs
```

### Ajouter Google Analytics
1. Créer un compte Google Analytics
2. Ajouter le script dans `app/layout.tsx`

### Logs en Production
- Vercel fournit des logs automatiquement dans l'onglet "Logs"
- Pour d'autres plateformes, configurer un service de logging

---

## 📞 Support

En cas de problème :
1. Vérifier le fichier `PRE-PUSH-CHECKLIST.md`
2. Consulter `BUGS_FIXES.md` pour les bugs connus
3. Vérifier les logs de la plateforme de déploiement
4. Ouvrir une issue sur GitHub

---

## 🎉 Félicitations !

Votre application Tokana Delivery Management est maintenant déployée !

**Prochaines étapes suggérées :**
- [ ] Configurer un nom de domaine personnalisé
- [ ] Activer les backups automatiques de la DB
- [ ] Ajouter un système de notifications (email/SMS)
- [ ] Implémenter l'export de rapports automatique
- [ ] Configurer un système de monitoring

---

*Mise à jour: 21 octobre 2025*

