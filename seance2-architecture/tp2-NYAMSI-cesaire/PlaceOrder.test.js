import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PlaceOrder } from './application/PlaceOrder.js';
import { InMemoryOrderRepository } from './adapters/secondary/InMemoryOrderRepository.js';
import { StaticCatalog } from './adapters/secondary/StaticCatalog.js';
import { FakePayment } from './adapters/secondary/FakePayment.js';

function build() {
  const envoyes = [];
  const orderRepository = new InMemoryOrderRepository();
  const placeOrder = new PlaceOrder({
    orderRepository,
    catalog: new StaticCatalog(),
    payment: new FakePayment(),
    notifier: { orderPlaced: async o => envoyes.push(o.id) },
    clock: { now: () => '2026-10-21T16:00:00Z' },
    ids: { next: () => 'CMD-1' },
  });
  return { placeOrder, orderRepository, envoyes };
}

test('commande de 117 € : payée, enregistrée, notifiée', async () => {
  const { placeOrder, orderRepository, envoyes } = build();
  const order = await placeOrder.handle({
    customerId: 'C-42',
    items: [
      { sku: 'CLAVIER', qty: 2 },
      { sku: 'SOURIS', qty: 1 },
    ],
  });
  assert.equal(order.total, 117);
  assert.equal(order.statut, 'PAYEE');
  assert.equal((await orderRepository.findById('CMD-1')).statut, 'PAYEE');
  assert.deepEqual(envoyes, ['CMD-1']);
});

test('commande de 598 € : refusée, enregistrée, pas de notification', async () => {
  const { placeOrder, orderRepository, envoyes } = build();
  const order = await placeOrder.handle({
    customerId: 'C-42',
    items: [{ sku: 'ECRAN', qty: 2 }],
  });
  assert.equal(order.total, 598);
  assert.equal(order.statut, 'REFUSEE');
  assert.match(order.motif, /500/);
  assert.equal((await orderRepository.findById('CMD-1')).statut, 'REFUSEE');
  assert.equal(envoyes.length, 0);
});

test("produit inconnu : erreur, rien n'est enregistré", async () => {
  const { placeOrder, orderRepository, envoyes } = build();
  await assert.rejects(
    placeOrder.handle({ customerId: 'C-42', items: [{ sku: 'TELE', qty: 1 }] }),
    /Produit inconnu : TELE/,
  );
  assert.equal(await orderRepository.findById('CMD-1'), null);
  assert.equal(envoyes.length, 0);
});
