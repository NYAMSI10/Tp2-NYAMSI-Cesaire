// Le plafond de 500 € est une règle du prestataire, pas du métier
export class FakePayment {
  async charge({ amount }) {
    if (amount > 500)
      return { ok: false, reason: 'Paiement refusé : montant supérieur à 500 €' };
    return { ok: true };
  }
}
