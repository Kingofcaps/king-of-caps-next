# King Of Caps

Boutique Next.js avec catalogue local, administration, commandes Supabase et paiement hébergé PayDunya.

## Démarrage

```bash
npm install
npm run dev
```

La boutique est disponible sur `http://localhost:3000` et l’administration sur `/admin`.

## Variables d’environnement

Copiez `.env.local.example` vers `.env.local`, puis remplissez les valeurs nécessaires. Ne préfixez jamais une clé secrète par `NEXT_PUBLIC_` : ces valeurs ne doivent pas atteindre le navigateur.

```bash
cp .env.local.example .env.local
```

## Supabase

1. Créez un projet Supabase.
2. Exécutez les migrations dans cet ordre dans le SQL Editor :
   - [création de la table orders](supabase/migrations/20260713_create_orders.sql)
   - [numéros de commande séquentiels](supabase/migrations/20260713_add_order_number_function.sql)
   - [permission de numérotation pour Supabase](supabase/migrations/20260713_grant_order_number_function.sql), si la migration précédente a déjà été exécutée
3. Renseignez `NEXT_PUBLIC_SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY` dans `.env.local`.

La clé `SUPABASE_SERVICE_ROLE_KEY` est exclusivement utilisée dans les routes serveur pour créer et administrer les commandes. Ne la publiez jamais dans le client ou dans Git.

## PayDunya

Ajoutez les clés de votre application PayDunya et choisissez l’environnement `test` ou `production` :

```env
PAYDUNYA_MODE=test
PAYDUNYA_MASTER_KEY=...
PAYDUNYA_PRIVATE_KEY=...
PAYDUNYA_PUBLIC_KEY=...
PAYDUNYA_TOKEN=...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

La facture Checkout Invoice configure automatiquement l’IPN vers :

```text
https://votre-domaine.com/api/payments/paydunya/ipn
```

L’IPN et la route de retour vérifient le token directement auprès de PayDunya avant de confirmer la commande. Le stock et les notifications ne sont traités qu’après un statut `completed` vérifié. Exécutez d’abord la migration `20260722_replace_fedapay_with_paydunya.sql`, puis `20260723_add_cart_order_items.sql` avant d’activer le paiement et le panier multi-produits.

## Notifications

Les nouvelles commandes déclenchent une notification Resend côté serveur après leur insertion dans Supabase. Utilisez les mêmes variables `RESEND_API_KEY` et `ORDER_NOTIFICATION_EMAIL` dans `.env.local` et dans Vercel. Tous les e-mails sont envoyés depuis `KING OF CAPS <command@kingofcaps.bj>`. Si Resend est indisponible, la commande reste enregistrée et l’erreur est journalisée uniquement côté serveur.

## Vérifications

```bash
npm run lint
npm run build
```
