import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonMenuButton,
  IonButton,
  IonIcon,
  IonContent,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonList,
  IonItem,
  IonBadge,
  IonChip,
  ModalController,
  ToastController,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  addOutline,
  chevronBackOutline,
  chevronForwardOutline,
  arrowUpOutline,
  arrowDownOutline,
  checkmarkDoneOutline,
  createOutline,
  trashOutline,
  alertCircleOutline,
  downloadOutline,
  walletOutline,
  trendingUpOutline,
  trendingDownOutline,
  timeOutline,
  bedOutline,
  addCircleOutline,
  removeCircleOutline,
} from 'ionicons/icons';

import {
  FinanceiroService,
  Movimento,
  Recebivel,
  ResumoMes,
  SerieMes,
  TotalCategoria,
  deslocarMes,
  mesAtualISO,
  rotuloMes,
} from '../../services/financeiro.service';
import { TipoLancamento } from '../../models/lancamento.model';
import { abrirModal, houveMudanca } from '../../core/modal.util';
import { entregarArquivo } from '../../core/arquivo.util';
import { Reserva } from '../../models/reserva.model';
import { formatarData, formatarMoeda, hojeISO } from '../../core/format.util';
import { LancamentoFormComponent } from './lancamento-form/lancamento-form.component';
import { ReservaFormComponent } from '../reservas/reserva-form/reserva-form.component';

type Aba = 'resumo' | 'lancamentos' | 'pendencias';
type FiltroMovimento = 'todos' | 'receita' | 'despesa' | 'pendente';

@Component({
  selector: 'app-financeiro',
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: 'financeiro.page.html',
  styleUrls: ['financeiro.page.scss'],
  imports: [
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonMenuButton,
    IonButton,
    IonIcon,
    IonContent,
    IonSegment,
    IonSegmentButton,
    IonLabel,
    IonList,
    IonItem,
    IonBadge,
    IonChip,
  ],
})
export class FinanceiroPage {
  aba: Aba = 'resumo';
  filtro: FiltroMovimento = 'todos';
  mes = mesAtualISO();

  private todosMovimentos: Movimento[] = [];
  movimentosDoMes: Movimento[] = [];
  resumo: ResumoMes = { receitas: 0, despesas: 0, saldo: 0, aReceber: 0, aPagar: 0 };
  despesasPorCategoria: TotalCategoria[] = [];
  receitasPorCategoria: TotalCategoria[] = [];
  serie: SerieMes[] = [];
  maiorValorSerie = 0;
  mesEmDestaque: SerieMes | null = null;
  recebiveis: Recebivel[] = [];
  totalRecebiveis = 0;
  contasAPagar: Movimento[] = [];
  vencidos: Movimento[] = [];

  readonly formatarMoeda = formatarMoeda;
  readonly formatarData = formatarData;
  readonly hoje = hojeISO();

  constructor(
    private financeiroService: FinanceiroService,
    private modalCtrl: ModalController,
    private toastCtrl: ToastController,
  ) {
    addIcons({
      addOutline,
      chevronBackOutline,
      chevronForwardOutline,
      arrowUpOutline,
      arrowDownOutline,
      checkmarkDoneOutline,
      createOutline,
      trashOutline,
      alertCircleOutline,
      downloadOutline,
      walletOutline,
      trendingUpOutline,
      trendingDownOutline,
      timeOutline,
      bedOutline,
      addCircleOutline,
      removeCircleOutline,
    });
  }

  async ionViewWillEnter(): Promise<void> {
    await this.carregar();
  }

  get rotuloMes(): string {
    return rotuloMes(this.mes);
  }

  get ehMesAtual(): boolean {
    return this.mes === mesAtualISO();
  }

  get movimentosFiltrados(): Movimento[] {
    if (this.filtro === 'todos') return this.movimentosDoMes;
    if (this.filtro === 'pendente') return this.movimentosDoMes.filter((m) => m.status === 'pendente');
    return this.movimentosDoMes.filter((m) => m.tipo === this.filtro);
  }

  get totalVencidos(): number {
    return this.vencidos.reduce((soma, m) => soma + m.valor, 0);
  }

  private async carregar(): Promise<void> {
    const { movimentos, recebiveis } = await this.financeiroService.carregar();
    this.todosMovimentos = movimentos;
    this.recebiveis = recebiveis;
    this.totalRecebiveis = recebiveis.reduce((soma, r) => soma + r.saldo, 0);
    this.vencidos = this.financeiroService.vencidos(movimentos);
    this.contasAPagar = movimentos
      .filter((m) => m.tipo === 'despesa' && m.status === 'pendente')
      .sort((a, b) => a.data.localeCompare(b.data));
    this.atualizarMes();
  }

  private atualizarMes(): void {
    this.movimentosDoMes = this.financeiroService.doMes(this.todosMovimentos, this.mes);
    this.resumo = this.financeiroService.resumo(this.movimentosDoMes);
    this.despesasPorCategoria = this.financeiroService.porCategoria(this.movimentosDoMes, 'despesa');
    this.receitasPorCategoria = this.financeiroService.porCategoria(this.movimentosDoMes, 'receita');
    this.serie = this.financeiroService.serieMensal(this.todosMovimentos, this.mes);
    this.maiorValorSerie = Math.max(0, ...this.serie.flatMap((s) => [s.receitas, s.despesas]));
    this.mesEmDestaque = null;
  }

  mudarMes(delta: number): void {
    this.mes = deslocarMes(this.mes, delta);
    this.atualizarMes();
  }

  irParaMesAtual(): void {
    this.mes = mesAtualISO();
    this.atualizarMes();
  }

  selecionarMes(item: SerieMes): void {
    this.mes = item.mes;
    this.atualizarMes();
  }

  alturaBarra(valor: number): number {
    if (!this.maiorValorSerie || !valor) return 0;
    return Math.max(2, (valor / this.maiorValorSerie) * 100);
  }

  estaVencido(m: Movimento): boolean {
    return m.status === 'pendente' && m.data < this.hoje;
  }

  async novoLancamento(tipo: TipoLancamento): Promise<void> {
    const resultado = await abrirModal(this.modalCtrl, LancamentoFormComponent, { tipoInicial: tipo });
    if (houveMudanca(resultado)) await this.carregar();
  }

  async abrirMovimento(m: Movimento): Promise<void> {
    if (m.lancamento) {
      const resultado = await abrirModal(this.modalCtrl, LancamentoFormComponent, { lancamento: m.lancamento });
      if (houveMudanca(resultado)) await this.carregar();
    } else if (m.reserva) {
      await this.abrirReserva(m.reserva);
    } else {
      await this.mostrarToast('A reserva deste pagamento foi apagada.', 'medium');
    }
  }

  async abrirReserva(reserva: Reserva): Promise<void> {
    const resultado = await abrirModal(this.modalCtrl, ReservaFormComponent, { reserva });
    if (houveMudanca(resultado)) await this.carregar();
  }

  async marcarComoPago(m: Movimento): Promise<void> {
    await this.financeiroService.marcarComoPago(m);
    await this.mostrarToast(m.tipo === 'receita' ? 'Pronto! Anotado como recebido.' : 'Pronto! Anotado como pago.');
    await this.carregar();
  }

  async exportarCsv(): Promise<void> {
    const csv = this.financeiroService.gerarCsv(this.movimentosDoMes);
    const entregue = await entregarArquivo(
      `financeiro-kanto-mare-luar-${this.mes}.csv`,
      csv,
      'text/csv;charset=utf-8',
      `Caixa de ${this.rotuloMes}`,
    );
    if (entregue) await this.mostrarToast('Planilha do mês pronta. Ela abre no Excel.');
  }

  private async mostrarToast(mensagem: string, cor = 'success'): Promise<void> {
    const toast = await this.toastCtrl.create({ message: mensagem, duration: 2200, color: cor, position: 'bottom' });
    await toast.present();
  }
}
