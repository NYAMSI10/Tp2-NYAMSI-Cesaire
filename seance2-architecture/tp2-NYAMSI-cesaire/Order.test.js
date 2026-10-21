import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Order } from './domain/Order.js';

const valide = () =>
  new Order({
    id: 'CMD-1',
    customerId: 'C-42',
    lines: [
      { sku: 'CLAVIER', qty: 2, unitPrice: 49 },
      { sku: 'SOURIS', qty: 1, unitPrice: 19 },
    ],
    createdAt: '2026-10-21T16:00:00Z',
  });

test('une commande neuve est EN_ATTENTE et calcule son total', () => {
  const order = valide();
  assert.equal(order.total, 117);
  assert.equal(order.statut, 'EN_ATTENTE');
});

test('refuse une commande vide, sans client ou avec une quantité invalide', () => {
  const ligne = qty => [{ sku: 'CLAVIER', qty, unitPrice: 49 }];
  assert.throws(() => new Order({ id: 'X', customerId: 'C-42', lines: [] }), /au moins une ligne/);
  assert.throws(() => new Order({ id: 'X', lines: ligne(1) }), /Client obligatoire/);
  assert.throws(() => new Order({ id: 'X', customerId: 'C-42', lines: ligne(0) }), /Quantité invalide/);
  assert.throws(() => new Order({ id: 'X', customerId: 'C-42', lines: ligne(1.5) }), /Quantité invalide/);
});

test("une commande ne change de statut qu'une fois", () => {
  const order = valide();
  order.marquerPayee();
  assert.equal(order.statut, 'PAYEE');
  assert.throws(() => order.marquerRefusee('trop tard'), /Commande déjà traitée/);
  assert.equal(order.statut, 'PAYEE');
});

test("les lignes ne sont pas modifiables de l'extérieur", () => {
  const order = valide();
  order.lines[0].qty = 100;
  assert.equal(order.total, 117);
});
