import { Injectable } from '@angular/core';
import { addMonths } from 'date-fns';
import { EntityStore, gerarId } from '../core/entity-store';
import { StorageService } from '../core/storage.service';
import { Lancamento, TipoLancamento } from '../models/lancamento.model';
import { dataISO, hojeISO } from '../core/format.util';

@Injectable({ providedIn: 'root' })
export class LancamentoService extends EntityStore<Lancamento> {
  constructor(storage: StorageService) {
    super(storage, 'lancamentos');
  }

  novoLancamento(tipo: TipoLancamento = 'despesa'): Lancamento {
    return {
      id: gerarId(),
      tipo,
      categoria: '',
      descricao: '',
      valor: 0,
      data: hojeISO(),
      status: 'pago',
      formaPagamento: '',
      observacoes: '',
      criadoEm: new Date().toISOString(),
    };
  }

  /** Salva o lançamento e, se pedido, cria cópias pendentes nos meses seguintes (contas fixas). */
  async salvarComRepeticao(lancamento: Lancamento, totalMeses: number): Promise<void> {
    await this.save(lancamento);
    const base = new Date(lancamento.data + 'T00:00:00');
    for (let i = 1; i < totalMeses; i++) {
      await this.save({
        ...lancamento,
        id: gerarId(),
        data: dataISO(addMonths(base, i)),
        status: 'pendente',
        criadoEm: new Date().toISOString(),
      });
    }
  }
}
