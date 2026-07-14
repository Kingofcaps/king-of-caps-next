# King Of Caps

Boutique Next.js avec catalogue local, administration, commandes Supabase et paiement hébergé FedaPay.

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

## FedaPay

Ajoutez votre clé secrète et choisissez l’environnement `sandbox` ou `live` :

```env
FEDAPAY_SECRET_KEY=...
FEDAPAY_ENVIRONMENT=sandbox
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Configurez ensuite le webhook FedaPay vers :

```text
https://votre-domaine.com/api/payments/fedapay/webhook
```

Le webhook vérifie l’état de la transaction directement auprès de FedaPay avant de définir une commande comme payée. La page de retour de paiement ne modifie jamais ce statut.

## Notifications

Les nouvelles commandes déclenchent une notification Resend côté serveur après leur insertion dans Supabase. Ajoutez `RESEND_API_KEY`, `RESEND_FROM_EMAIL` (une adresse ou un domaine vérifié dans Resend) et `ORDER_NOTIFICATION_EMAIL` dans `.env.local`. Si Resend est indisponible, la commande reste enregistrée et l’erreur est journalisée uniquement côté serveur.

## Vérifications

```bash
npm run lint
npm run build
```
