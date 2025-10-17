# Delivery Management App

Application de gestion de livraison avec authentification par rôles (ADMIN/COURIER).

## Comptes de test

### Admin
- Email: `admin@demo.local`
- Mot de passe: `admin123`

### Livreurs
- Email: `livreur1@demo.local` / Mot de passe: `tokana123`
- Email: `livreur2@demo.local` / Mot de passe: `tokana123`

## Installation

1. Cloner le projet
2. Copier `.env.example` vers `.env` et configurer la base de données
3. Installer les dépendances: `npm install`
4. Générer le client Prisma: `npm run prisma:gen`
5. Pousser le schéma: `npm run prisma:push`
6. Seed la base de données: `npm run prisma:seed`
7. Lancer le serveur: `npm run dev`

## Flux d'utilisation

### Admin
1. Se connecter avec le compte admin
2. Créer des clients (nom, téléphone, adresse de récupération)
3. Créer des livreurs (email, nom, mot de passe)
4. Créer des livraisons J-1 avec calcul automatique du prix
5. Assigner les livraisons aux livreurs
6. Consulter le règlement du soir pour calculer les sommes à remettre

### Livreur
1. Se connecter avec un compte livreur
2. Voir la liste des livraisons du jour assignées
3. Mettre à jour les statuts (PICKED_UP → DELIVERED → PAID)
4. Reporter une livraison si nécessaire

## Statuts de livraison

- **CREATED**: Livraison créée
- **PICKED_UP**: Colis récupéré
- **DELIVERED**: Colis livré
- **PAID**: Paiement effectué
- **POSTPONED**: Reporté à une date ultérieure
- **CANCELED**: Annulé

## Pricing

Le prix est calculé automatiquement selon:
- **Zone**: TANA, PERI, SUPER
- **Poids**: ≤2kg, 2-5kg, >5kg
- **Express**: Supplément selon la zone

L'admin peut override le prix calculé automatiquement.
