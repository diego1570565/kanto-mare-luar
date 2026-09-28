import { Injectable } from '@angular/core';
import { EntityStore, gerarId } from '../core/entity-store';
import { StorageService } from '../core/storage.service';
import { Pagamento } from '../models/pagamento.model';
import { hojeISO } from '../core/format.util';

@Injectable({ providedIn: 'root' })
export class PagamentoService extends EntityStore<Pagamento> {
  constructor(storage: StorageService) {
    super(storage, 'pagamentos');
  }

  novoPagamento(reservaId: string): Pagamento {
    return {
      id: gerarId(),
      reservaId,
      valor: 0,
      data: hojeISO(),
      status: 'pendente',
      formaPagamento: '',
      observacoes: '',
    };
  }

  async listarPorReserva(reservaId: string): Promise<Pagamento[]> {
    return (await this.getAll()).filter((p) => p.reservaId === reservaId);
  }

  async removerPorReserva(reservaId: string): Promise<void> {
    const todos = await this.getAll();
    for (const p of todos.filter((p) => p.reservaId === reservaId)) {
      await this.remove(p.id);
    }
  }

  /** Substitui todos os pagamentos de uma reserva pela lista informada. */
  async sincronizarDaReserva(reservaId: string, pagamentos: Pagamento[]): Promise<void> {
    const existentes = await this.listarPorReserva(reservaId);
    const idsAtuais = new Set(pagamentos.map((p) => p.id));
    for (const antigo of existentes) {
      if (!idsAtuais.has(antigo.id)) {
        await this.remove(antigo.id);
      }
    }
    for (const p of pagamentos) {
      await this.save({ ...p, reservaId });
    }
  }

  totalPago(pagamentos: Pagamento[]): number {
    return pagamentos.filter((p) => p.status === 'pago').reduce((soma, p) => soma + (p.valor || 0), 0);
  }

  totalPendente(pagamentos: Pagamento[]): number {
    return pagamentos.filter((p) => p.status === 'pendente').reduce((soma, p) => soma + (p.valor || 0), 0);
  }
}
