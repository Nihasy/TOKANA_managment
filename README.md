# 📦 Tokana Delivery Management

Application moderne de gestion de livraisons avec authentification par rôles (ADMIN/COURIER).

![Next.js](https://img.shields.io/badge/Next.js-15.5.6-black?style=flat-square&logo=next.js)
![React](https://img.shields.io/badge/React-19.2.0-61dafb?style=flat-square&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9.3-blue?style=flat-square&logo=typescript)
![Prisma](https://img.shields.io/badge/Prisma-6.17.1-2D3748?style=flat-square&logo=prisma)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.1.14-38bdf8?style=flat-square&logo=tailwind-css)

---

## ✨ Fonctionnalités

### 🔐 Authentification Sécurisée
- NextAuth.js avec JWT
- Rôles : ADMIN et COURIER
- Protection des routes avec middleware

### 👨‍💼 Interface Administrateur
- **Dashboard interactif** avec statistiques en temps réel
- **Gestion des clients** (CRUD complet)
- **Gestion des livreurs** (CRUD complet)
- **Gestion des livraisons** avec filtres avancés
- **Calcul automatique des tarifs** selon zone/poids/type
- **Rapports détaillés** (Compte rendu client, Règlements J+1)
- **Export PDF et CSV** des rapports
- **Sidebar collapsible** pour optimisation de l'espace

### 🚚 Interface Livreur
- **Vue quotidienne** des livraisons assignées
- **Groupement par expéditeur** pour optimisation des récupérations
- **Filtrage par statut** (À récupérer, En cours, Livrées, Terminées)
- **Actions rapides** : Récupérer, Livrer, Payer, Reporter, Transférer
- **Ajout de remarques** sur chaque livraison
- **Calcul automatique** du total des montants perçus

### 📊 Système de Règlements
- **Règlement du soir** (Livreur → Admin)
- **Règlement J+1** (Admin → Client)
- **Calculs automatiques** selon prépaiement et frais
- **Génération de factures PDF** détaillées

### 📱 Responsive Design
- **Mobile-first** : Interface optimisée pour smartphones
- **Tablette** : Layout adaptatif
- **Desktop** : Expérience complète

---

## 🚀 Installation

### Prérequis
- Node.js 18 ou supérieur
- PostgreSQL 14 ou supérieur
- Git

### Étapes d'Installation

1. **Cloner le repository**
   ```bash
   git clone https://github.com/votre-username/tokana-delivery-management-app.git
   cd tokana-delivery-management-app
   ```

2. **Installer les dépendances**
   ```bash
   npm install
   ```

3. **Configurer les variables d'environnement**
   
   Créez un fichier `.env.local` à la racine :
   ```env
   # Database
   DATABASE_URL="postgresql://user:password@localhost:5432/tokana_delivery"

   # NextAuth
   NEXTAUTH_SECRET="your-super-secret-key"
   NEXTAUTH_URL="http://localhost:3000"
   ```

   > 💡 **Générer un secret sécurisé :**
   > ```bash
   > openssl rand -base64 32
   > ```

4. **Initialiser la base de données**
   ```bash
   # Générer le client Prisma
   npm run prisma:gen

   # Créer les tables
   npx prisma db push

   # Créer le compte administrateur
   npm run prisma:seed
   ```

5. **Lancer l'application**
   ```bash
   npm run dev
   ```

   L'application sera accessible sur **http://localhost:3000**

---

## 👤 Compte Administrateur

Après avoir exécuté `npm run prisma:seed`, utilisez ces identifiants :

| Rôle | Email | Mot de passe |
|------|-------|--------------|
| **ADMIN** | `admin@tokana.mg` | `admin123` |

> ⚠️ **IMPORTANT :** Changez le mot de passe dès la première connexion !

---

## 📖 Guide d'Utilisation

### Pour l'Administrateur

1. **Connectez-vous** avec `admin@tokana.mg`
2. **Créez des clients** (Menu Clients → Nouveau)
   - Nom, téléphone, adresse de récupération
3. **Créez des livreurs** (Menu Livreurs → Nouveau)
   - Email, nom, téléphone, mot de passe
4. **Créez des livraisons** (Menu Livraisons → Nouvelle)
   - Sélectionnez le client
   - Renseignez les infos du destinataire
   - Le tarif se calcule automatiquement
   - Assignez à un livreur (optionnel)
5. **Suivez les livraisons** dans le Dashboard
6. **Générez des rapports** (Menu Rapports)
   - Compte rendu client (PDF/CSV)
   - Règlement J+1

### Pour le Livreur

1. **Connectez-vous** avec vos identifiants
2. **Consultez vos livraisons** du jour
3. **Marquez les statuts** :
   - 📦 **Récupérer** → Colis récupéré chez le client
   - 🚚 **Livrer** → Colis livré au destinataire
   - 💰 **Payer** → Paiement reçu
   - 🔄 **Reporter** → Livraison reportée à une autre date
4. **Ajoutez des remarques** si nécessaire
5. **Consultez le total perçu** en fin de journée

---

## 💰 Grille Tarifaire

### Standard (J+1)

| Zone | ≤ 2 kg | 2–5 kg | Récupération |
|------|--------|--------|--------------|
| **TANA-VILLE** | 3 000 Ar | 6 000 Ar | Gratuite |
| **PÉRIPHÉRIE** | 3 000 Ar | 7 000 Ar | Gratuite (≥3 colis), sinon 2 000 Ar |
| **SUPER-PÉRIPHÉRIE** | 4 000 Ar | 8 000 Ar | 5 000 Ar |

### Express (Même jour)

| Zone | ≤ 2 kg | 2–5 kg | Récupération |
|------|--------|--------|--------------|
| **TANA-VILLE** | 5 000 Ar | 8 000 Ar | Gratuite |
| **PÉRIPHÉRIE** | 7 000 Ar | 10 000 Ar | Gratuite (≥3 colis), sinon 2 000 Ar |
| **SUPER-PÉRIPHÉRIE** | 10 000 Ar | 13 000 Ar | 5 000 Ar |

> **Note :** Pour les poids > 5 kg, un supplément de 1 000 Ar/kg est appliqué.

---

## 🔄 Statuts de Livraison

| Statut | Badge | Description |
|--------|-------|-------------|
| **CREATED** | 🔵 Créée | Livraison créée, en attente d'assignation |
| **PICKED_UP** | 🟡 Récupérée | Colis récupéré chez le client |
| **DELIVERED** | 🟢 Livrée | Colis livré au destinataire |
| **PAID** | ✅ Payée | Paiement effectué |
| **POSTPONED** | 🟣 Reportée | Livraison reportée à une date ultérieure |
| **CANCELED** | 🔴 Annulée | Livraison annulée |

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
npx prisma validate      # Valider le schéma Prisma
npm run prisma:seed      # Créer le compte admin
npm run prisma:gen       # Générer le client Prisma
```

### Utilitaires
```bash
npm run prisma:reset     # Nettoyer toutes les données (ancien script)
```

---

## 📁 Structure du Projet

```
tokana-delivery-management-app/
├── app/                    # Pages Next.js (App Router)
│   ├── admin/             # Interface administrateur
│   │   ├── page.tsx       # Dashboard
│   │   ├── clients/       # Gestion clients
│   │   ├── couriers/      # Gestion livreurs
│   │   ├── deliveries/    # Gestion livraisons
│   │   ├── reports/       # Rapports
│   │   └── settlements/   # Règlements
│   ├── api/               # API Routes
│   ├── courier/           # Interface livreur
│   │   └── today/         # Livraisons du jour
│   └── login/             # Page de connexion
├── components/            # Composants réutilisables
│   ├── ui/                # Composants UI (shadcn/ui)
│   └── admin-sidebar.tsx  # Sidebar admin
├── lib/                   # Utilitaires
│   ├── auth.ts            # Configuration NextAuth
│   ├── pricing.ts         # Logique de tarification
│   └── validations/       # Schémas Zod
├── prisma/
│   ├── schema.prisma      # Schéma de base de données
│   └── seed.ts            # Script de seed
└── public/                # Assets statiques
```

---

## 🔐 Sécurité

- ✅ **Mots de passe hashés** avec bcryptjs (10 rounds)
- ✅ **Sessions JWT** sécurisées avec NextAuth
- ✅ **Protection des routes** avec middleware
- ✅ **Validation des données** avec Zod
- ✅ **Variables d'environnement** pour secrets

> ⚠️ **En production :**
> - Changez `NEXTAUTH_SECRET`
> - Utilisez HTTPS
> - Activez SSL pour PostgreSQL
> - Changez le mot de passe admin par défaut

---

## 🚀 Déploiement

### Vercel (Recommandé)

1. Pushez votre code sur GitHub
2. Importez le projet sur [Vercel](https://vercel.com)
3. Configurez les variables d'environnement
4. Déployez !

**Consultez `DEPLOYMENT_GUIDE.md` pour les instructions détaillées.**

### Autres Plateformes
- Railway
- Render
- DigitalOcean App Platform

---

## 📚 Documentation

- [Guide de Déploiement](./DEPLOYMENT_GUIDE.md)
- [Pre-Push Checklist](./PRE-PUSH-CHECKLIST.md)
- [Documentation Complète](./DOCUMENTATION_COMPLETE.md)
- [Bugs et Corrections](./BUGS_FIXES.md)

---

## 🛠️ Technologies Utilisées

### Frontend
- **Next.js 15.5.6** - Framework React avec App Router
- **React 19.2.0** - Bibliothèque UI
- **TypeScript 5.9.3** - Typage statique
- **Tailwind CSS 4.1.14** - Framework CSS utility-first
- **Radix UI** - Composants accessibles
- **Lucide React** - Icônes modernes
- **TanStack Query** - Gestion de l'état serveur

### Backend
- **Next.js API Routes** - API RESTful
- **Prisma 6.17.1** - ORM pour PostgreSQL
- **NextAuth.js 4.24** - Authentification
- **bcryptjs** - Hashing des mots de passe
- **Zod** - Validation des schémas

### Outils
- **jsPDF** - Génération de PDF
- **jspdf-autotable** - Tables dans les PDF

---

## 📈 Performance

- ✅ **Build optimisé** : 102 kB de JS partagé
- ✅ **Requêtes DB optimisées** : -81% de requêtes sur le dashboard
- ✅ **Images non-optimisées** (configuré pour flexibilité)
- ✅ **Middleware léger** : 54.7 kB

---

## 🐛 Signaler un Bug

Si vous rencontrez un problème :
1. Vérifiez `BUGS_FIXES.md` pour les bugs connus
2. Consultez les logs (`npm run dev`)
3. Ouvrez une issue sur GitHub avec :
   - Description du problème
   - Étapes pour reproduire
   - Logs d'erreur
   - Environnement (OS, Node version, etc.)

---

## 📝 Licence

Ce projet est sous licence privée. Tous droits réservés.

---

## 👥 Auteurs

Développé pour **Tokana Delivery** - Solution de gestion de livraisons à Madagascar

---

## 🙏 Remerciements

- [Next.js](https://nextjs.org/) - Framework incroyable
- [Prisma](https://www.prisma.io/) - ORM moderne
- [shadcn/ui](https://ui.shadcn.com/) - Composants UI élégants
- [Vercel](https://vercel.com/) - Plateforme de déploiement

---

**Version:** 0.1.0  
**Dernière mise à jour:** 21 octobre 2025

🚀 **Prêt pour la production !**
