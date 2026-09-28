import { Injectable } from '@angular/core';
import { addMonths } from 'date-fns';
import { LancamentoService } from './lancamento.service';
import { PagamentoService } from './pagamento.service';
import { ReservaService } from './reserva.service';
import { HospedeService } from './hospede.service';
import { SuiteService } from './suite.service';
import { CATEGORIA_HOSPEDAGEM, Lancamento, StatusLancamento, TipoLancamento } from '../models/lancamento.model';
import { Pagamento } from '../models/pagamento.model';
import { Reserva } from '../models/reserva.model';
import { dataISO, formatarPeriodo, hojeISO } from '../core/format.util';

/** Linha unificada do caixa: pagamento de reserva ou lançamento avulso. */
export interface Movimento {
  id: string;
  origem: 'reserva' | 'lancamento';
  tipo: TipoLancamento;
  categoria: string;
  descricao: string;
  valor: number;
  data: string;
  status: StatusLancamento;
  formaPagamento?: string;
  lancamento?: Lancamento;
  pagamento?: Pagamento;
  reserva?: Reserva;
}

export interface ResumoMes {
  receitas: number;
  despesas: number;
  saldo: number;
  aReceber: number;
  aPagar: number;
}

export interface TotalCategoria {
  categoria: string;
  valor: number;
  percentual: number;
}

export interface SerieMes {
  mes: string;
  rotulo: string;
  receitas: number;
  despesas: number;
}

export interface Recebivel {
  reserva: Reserva;
  hospedeNome: string;
  suiteNome: string;
  periodo: string;
  saldo: number;
}

export interface DadosFinanceiros {
  movimentos: Movimento[];
  recebiveis: Recebivel[];
}

/** 'yyyy-MM' do mês atual. */
export function mesAtualISO(): string {
  return hojeISO().slice(0, 7);
}

export function deslocarMes(mes: string, delta: number): string {
  return dataISO(addMonths(new Date(mes + '-01T00:00:00'), delta)).slice(0, 7);
}

export function rotuloMes(mes: string, formato: 'long' | 'short' = 'long'): string {
  const data = new Date(mes + '-15T00:00:00');
  const texto =
    formato === 'long'
      ? new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(data)
      : new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(data).replace('.', '');
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function somar(movimentos: Movimento[], tipo: TipoLancamento, status: StatusLancamento): number {
  return movimentos.filter((m) => m.tipo === tipo && m.status === status).reduce((soma, m) => soma + (m.valor || 0), 0);
}

@Injectable({ providedIn: 'root' })
export class FinanceiroService {
  constructor(
    private lancamentoService: LancamentoService,
    private pagamentoService: PagamentoService,
    private reservaService: ReservaService,
    private hospedeService: HospedeService,
    private suiteService: SuiteService,
  ) {}

  async carregar(): Promise<DadosFinanceiros> {
    const [lancamentos, pagamentos, reservas, hospedes, suites] = await Promise.all([
      this.lancamentoService.getAll(),
      this.pagamentoService.getAll(),
      this.reservaService.getAll(),
      this.hospedeService.getAll(),
      this.suiteService.getAll(),
    ]);
    const nomeHospede = new Map(hospedes.map((h) => [h.id, h.nome]));
    const nomeSuite = new Map(suites.map((s) => [s.id, s.nome]));
    const mapaReservas = new Map(reservas.map((r) => [r.id, r]));

    const movimentos: Movimento[] = [];

    for (const p of pagamentos) {
      const reserva = mapaReservas.get(p.reservaId);
      // Valores pendentes de reservas canceladas não vão mais entrar no caixa.
      if (p.status === 'pendente' && (!reserva || reserva.status === 'cancelada')) continue;
      const hospede = reserva ? (nomeHospede.get(reserva.hospedeId) ?? 'Hóspede removido') : 'Reserva removida';
      const suite = reserva ? (nomeSuite.get(reserva.suiteId) ?? '') : '';
      movimentos.push({
        id: `pag-${p.id}`,
        origem: 'reserva',
        tipo: 'receita',
        categoria: CATEGORIA_HOSPEDAGEM,
        descricao: suite ? `${hospede} · ${suite}` : hospede,
        valor: p.valor,
        data: p.data,
        status: p.status,
        formaPagamento: p.formaPagamento,
        pagamento: p,
        reserva,
      });
    }

    for (const l of lancamentos) {
      movimentos.push({
        id: `lan-${l.id}`,
        origem: 'lancamento',
        tipo: l.tipo,
        categoria: l.categoria || (l.tipo === 'receita' ? 'Outras receitas' : 'Outras despesas'),
        descricao: l.descricao,
        valor: l.valor,
        data: l.data,
        status: l.status,
        formaPagamento: l.formaPagamento,
        lancamento: l,
      });
    }

    movimentos.sort((a, b) => b.data.localeCompare(a.data));

    const recebiveis: Recebivel[] = reservas
      .filter((r) => r.status !== 'cancelada')
      .map((reserva) => {
        const pago = this.pagamentoService.totalPago(pagamentos.filter((p) => p.reservaId === reserva.id));
        return {
          reserva,
          hospedeNome: nomeHospede.get(reserva.hospedeId) ?? 'Hóspede removido',
          suiteNome: nomeSuite.get(reserva.suiteId) ?? 'Suíte removida',
          periodo: formatarPeriodo(reserva.checkIn, reserva.checkOut),
          saldo: Math.max(0, (reserva.valorTotal || 0) - pago),
        };
      })
      .filter((r) => r.saldo > 0.009)
      .sort((a, b) => a.reserva.checkIn.localeCompare(b.reserva.checkIn));

    return { movimentos, recebiveis };
  }

  doMes(movimentos: Movimento[], mes: string): Movimento[] {
    return movimentos.filter((m) => m.data.startsWith(mes));
  }

  resumo(movimentosDoMes: Movimento[]): ResumoMes {
    const receitas = somar(movimentosDoMes, 'receita', 'pago');
    const despesas = somar(movimentosDoMes, 'despesa', 'pago');
    return {
      receitas,
      despesas,
      saldo: receitas - despesas,
      aReceber: somar(movimentosDoMes, 'receita', 'pendente'),
      aPagar: somar(movimentosDoMes, 'despesa', 'pendente'),
    };
  }

  /** Totais realizados (pagos) por categoria, do maior para o menor. */
  porCategoria(movimentosDoMes: Movimento[], tipo: TipoLancamento): TotalCategoria[] {
    const totais = new Map<string, number>();
    for (const m of movimentosDoMes) {
      if (m.tipo !== tipo || m.status !== 'pago') continue;
      totais.set(m.categoria, (totais.get(m.categoria) ?? 0) + (m.valor || 0));
    }
    const total = [...totais.values()].reduce((a, b) => a + b, 0);
    return [...totais.entries()]
      .map(([categoria, valor]) => ({ categoria, valor, percentual: total ? (valor / total) * 100 : 0 }))
      .sort((a, b) => b.valor - a.valor);
  }

  /** Receitas x despesas realizadas nos últimos `quantidade` meses, terminando em `mesFinal`. */
  serieMensal(movimentos: Movimento[], mesFinal: string, quantidade = 6): SerieMes[] {
    const serie: SerieMes[] = [];
    for (let i = quantidade - 1; i >= 0; i--) {
      const mes = deslocarMes(mesFinal, -i);
      const doMes = this.doMes(movimentos, mes);
      serie.push({
        mes,
        rotulo: rotuloMes(mes, 'short'),
        receitas: somar(doMes, 'receita', 'pago'),
        despesas: somar(doMes, 'despesa', 'pago'),
      });
    }
    return serie;
  }

  /** Contas pendentes com data anterior a hoje. */
  vencidos(movimentos: Movimento[]): Movimento[] {
    const hoje = hojeISO();
    return movimentos.filter((m) => m.status === 'pendente' && m.data < hoje);
  }

  async marcarComoPago(movimento: Movimento): Promise<void> {
    if (movimento.lancamento) {
      await this.lancamentoService.save({ ...movimento.lancamento, status: 'pago' });
    } else if (movimento.pagamento) {
      await this.pagamentoService.save({ ...movimento.pagamento, status: 'pago' });
    }
  }

  gerarCsv(movimentos: Movimento[]): string {
    const escapar = (texto: string) => `"${(texto ?? '').replace(/"/g, '""')}"`;
    const linhas = [['Data', 'Tipo', 'Categoria', 'Descrição', 'Forma de pagamento', 'Situação', 'Valor'].join(';')];
    for (const m of [...movimentos].sort((a, b) => a.data.localeCompare(b.data))) {
      const [ano, mes, dia] = m.data.split('-');
      linhas.push(
        [
          `${dia}/${mes}/${ano}`,
          m.tipo === 'receita' ? 'Receita' : 'Despesa',
          escapar(m.categoria),
          escapar(m.descricao),
          escapar(m.formaPagamento ?? ''),
          m.status === 'pago' ? 'Pago' : 'Pendente',
          ((m.tipo === 'despesa' ? -1 : 1) * (m.valor || 0)).toFixed(2).replace('.', ','),
        ].join(';'),
      );
    }
    return '﻿' + linhas.join('\r\n');
  }
}
