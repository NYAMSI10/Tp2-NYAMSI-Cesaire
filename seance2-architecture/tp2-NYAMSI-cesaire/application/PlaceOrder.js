// Ports sortants :
//   orderRepository { save(order), findById(id) }
//   catalog         { priceOf(sku) }               -> prix ou undefined
//   payment         { charge({ orderId, amount }) } -> { ok: true } | { ok: false, reason }
//   notifier        { orderPlaced(order) }
//   clock { now() } · ids { next() }
import { Order } from '../domain/Order.js';

export class PlaceOrder {
  constructor({ orderRepository, catalog, payment, notifier, clock, ids }) {
    Object.assign(this, { orderRepository, catalog, payment, notifier, clock, ids });
  }

  async handle({ customerId, items }) {
    const lines = (items ?? []).map(({ sku, qty }) => {
      const unitPrice = this.catalog.priceOf(sku);
      if (unitPrice === undefined) throw new Error(`Produit inconnu : ${sku}`);
      return { sku, qty, unitPrice };
    });

    const order = new Order({
      id: this.ids.next(),
      customerId,
      lines,
      createdAt: this.clock.now(),
    });

    const result = await this.payment.charge({ orderId: order.id, amount: order.total });
    if (result.ok) order.marquerPayee();
    else order.marquerRefusee(result.reason);

    await this.orderRepository.save(order);
    if (order.statut === 'PAYEE') await this.notifier.orderPlaced(order);
    return order;
  }
}
