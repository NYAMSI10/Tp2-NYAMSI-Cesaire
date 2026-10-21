// DOMAINE : aucun import
export class Order {
  #lines;
  #statut = 'EN_ATTENTE';
  #motif = null;

  constructor({ id, customerId, lines, createdAt }) {
    if (!customerId) throw new Error('Client obligatoire');
    if (!lines?.length) throw new Error('Une commande doit contenir au moins une ligne');
    for (const l of lines)
      if (!Number.isInteger(l.qty) || l.qty <= 0)
        throw new Error(`Quantité invalide pour ${l.sku}`);
    this.id = id;
    this.customerId = customerId;
    this.#lines = lines.map(l => ({ ...l }));
    this.createdAt = createdAt;
  }

  get lines() {
    return this.#lines.map(l => ({ ...l }));
  }

  get statut() {
    return this.#statut;
  }

  get motif() {
    return this.#motif;
  }

  get total() {
    return this.#lines.reduce((s, l) => s + l.qty * l.unitPrice, 0);
  }

  marquerPayee() {
    this.#verifierEnAttente();
    this.#statut = 'PAYEE';
  }

  marquerRefusee(motif) {
    this.#verifierEnAttente();
    this.#statut = 'REFUSEE';
    this.#motif = motif;
  }

  #verifierEnAttente() {
    if (this.#statut !== 'EN_ATTENTE') throw new Error('Commande déjà traitée');
  }

  toJSON() {
    return {
      id: this.id,
      customerId: this.customerId,
      lines: this.lines,
      total: this.total,
      statut: this.statut,
      motif: this.motif ?? undefined,
      createdAt: this.createdAt,
    };
  }
}
