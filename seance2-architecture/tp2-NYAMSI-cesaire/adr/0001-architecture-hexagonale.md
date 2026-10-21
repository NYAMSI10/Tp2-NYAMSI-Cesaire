# ADR-0001 : Architecture hexagonale pour le module Commande de ShopLite

- Date : 2026-10-21
- Statut : Accepté
- Décideurs : NYAMSI, Césaire

## Contexte

Le module Commande doit encaisser un paiement avant de confirmer une commande.
Aujourd'hui le paiement est simulé (`FakePayment`, plafond de 500 €) et les commandes
sont stockées en mémoire. Demain, on branchera un vrai prestataire de paiement
(Stripe, PayPal…) et une base PostgreSQL. Ces deux briques techniques vont changer,
alors que les règles métier (client obligatoire, au moins une ligne, quantité entière
positive, un seul changement de statut EN_ATTENTE → PAYEE / REFUSEE) doivent rester stables.
On veut aussi tester ces règles et le déroulé de la commande en quelques millisecondes,
sans serveur, sans base et sans prestataire réel.

## Décision

Le module Commande suit l'architecture hexagonale : le domaine (`Order`) et le cas
d'utilisation (`PlaceOrder`) ne dépendent que de ports (`OrderRepository`, `Catalog`,
`Payment`, `Notifier`, `Clock`, `Ids`), implémentés par des adaptateurs câblés uniquement
dans `main.js`. La règle « aucun fichier `domain/` n'importe l'extérieur » est vérifiée
par `npm run lint:archi`.

## Conséquences

- (+) Changer de prestataire de paiement ou passer à PostgreSQL revient à écrire un nouvel
  adaptateur et à modifier une ligne de `main.js`, sans toucher au domaine ni au cas d'utilisation.
- (+) Les règles propres au prestataire (plafond de 500 €) restent dans l'adaptateur
  `FakePayment` et ne polluent pas le métier.
- (+) Les tests de `Order` et `PlaceOrder` tournent sans serveur ni base (7 tests, < 100 ms).
- (+) `lint:archi` rend la règle de dépendance vérifiable : ajouter
  `import { FakePayment } … ` dans `domain/Order.js` fait échouer le contrôle. Cette règle
  protège le métier contre toute dépendance à une technologie qui pourrait changer.
- (-) Plus de fichiers et d'indirections (6 adaptateurs, des ports implicites) pour un
  module encore petit : un nouvel arrivant doit comprendre le câblage avant de suivre le flux.
- (-) En JavaScript, les ports ne sont que des contrats décrits en commentaire : rien
  n'empêche à la compilation un adaptateur de ne pas respecter `charge({ orderId, amount })`.
- (-) Avec PostgreSQL, il faudra maintenir une traduction objet `Order` ↔ tables
  (`orders`, `order_lines`) dans l'adaptateur, y compris pour reconstruire le statut et le motif.

## Alternatives considérées

- Architecture en couches classique (contrôleur → service → DAO) : rejetée parce que le
  service dépendrait directement du DAO et du SDK de paiement ; changer de prestataire
  ou de base obligerait à modifier la couche métier, et les tests nécessiteraient des mocks
  de bibliothèques techniques.
- Tout dans le contrôleur HTTP : rejeté parce que la logique ne serait pas réutilisable
  par la ligne de commande ni testable sans lancer le serveur.
