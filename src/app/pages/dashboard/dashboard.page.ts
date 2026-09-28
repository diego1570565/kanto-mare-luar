import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonMenuButton,
  IonContent,
  IonIcon,
  IonList,
  IonItem,
  IonLabel,
  IonBadge,
  ModalController,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  bedOutline,
  cashOutline,
  logInOutline,
  logOutOutline,
  calendarClearOutline,
  addCircleOutline,
  searchOutline,
  removeCircleOutline,
  peopleOutline,
  cloudDownloadOutline,
} from 'ionicons/icons';

import { SuiteService } from '../../services/suite.service';
import { HospedeService } from '../../services/hospede.service';
import { ReservaService } from '../../services/reserva.service';
import { PagamentoService } from '../../services/pagamento.service';
import { PousadaService } from '../../services/pousada.service';
import { FinanceiroService } from '../../services/financeiro.service';
import { Reserva } from '../../models/reserva.model';
import { formatarData, formatarMoeda, formatarPeriodo, hojeISO } from '../../core/format.util';
import { abrirModal, houveMudanca } from '../../core/modal.util';
import { ReservaFormComponent } from '../reservas/reserva-form/reserva-form.component';
import { LancamentoFormComponent } from '../financeiro/lancamento-form/lancamento-form.component';

interface ReservaResumo {
  reserva: Reserva;
  hospedeNome: string;
  suiteNome: string;
  periodo: string;
  faltaPagar: number;
}

@Component({
  selector: 'app-dashboard',
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: 'dashboard.page.html',
  styleUrls: ['dashboard.page.scss'],
  imports: [RouterLink, IonHeader, IonToolbar, IonTitle, IonButtons, IonMenuButton, IonContent, IonIcon, IonList, IonItem, IonLabel, IonBadge],
})
export class DashboardPage {
  nomePousada = 'Kanto Maré & Luar';
  saudacao = '';
  dataHojeExtenso = '';
  totalSuites = 0;
  suitesOcupadas = 0;
  totalAReceber = 0;
  chegamHoje: ReservaResumo[] = [];
  saemHoje: ReservaResumo[] = [];
  proximas: ReservaResumo[] = [];
  lembreteBackup = '';

  readonly formatarMoeda = formatarMoeda;
  readonly formatarData = formatarData;

  constructor(
    private suiteService: SuiteService,
    private hospedeService: HospedeService,
    private reservaService: ReservaService,
    private pagamentoService: PagamentoService,
    private pousadaService: PousadaService,
    private financeiroService: FinanceiroService,
    private modalCtrl: ModalController,
  ) {
    addIcons({
      bedOutline,
      cashOutline,
      logInOutline,
      logOutOutline,
      calendarClearOutline,
      addCircleOutline,
      searchOutline,
      removeCircleOutline,
      peopleOutline,
      cloudDownloadOutline,
    });
  }

  async ionViewWillEnter(): Promise<void> {
    await this.carregar();
  }

  private async carregar(): Promise<void> {
    const agora = new Date();
    const hora = agora.getHours();
    this.saudacao = hora < 12 ? 'Bom dia!' : hora < 18 ? 'Boa tarde!' : 'Boa noite!';
    const extenso = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).format(agora);
    this.dataHojeExtenso = extenso.charAt(0).toUpperCase() + extenso.slice(1);

    const [config, suites, hospedes, reservas, pagamentos, financeiro, ultimoBackup] = await Promise.all([
      this.pousadaService.getConfig(),
      this.suiteService.getAll(),
      this.hospedeService.getAll(),
      this.reservaService.getAll(),
      this.pagamentoService.getAll(),
      this.financeiroService.carregar(),
      this.pousadaService.ultimoBackup(),
    ]);

    this.nomePousada = config.nome || 'Kanto Maré & Luar';
    this.totalSuites = suites.filter((s) => s.ativo).length;
    this.totalAReceber = financeiro.recebiveis.reduce((soma, r) => soma + r.saldo, 0);

    const hoje = hojeISO();
    const ativas = reservas.filter((r) => r.status !== 'cancelada');
    this.suitesOcupadas = new Set(ativas.filter((r) => r.checkIn <= hoje && hoje < r.checkOut).map((r) => r.suiteId)).size;

    const nomeSuite = new Map(suites.map((s) => [s.id, s.nome]));
    const nomeHospede = new Map(hospedes.map((h) => [h.id, h.nome]));
    const resumir = (reserva: Reserva): ReservaResumo => {
      const pago = this.pagamentoService.totalPago(pagamentos.filter((p) => p.reservaId === reserva.id));
      return {
        reserva,
        hospedeNome: nomeHospede.get(reserva.hospedeId) ?? 'Hóspede apagado',
        suiteNome: nomeSuite.get(reserva.suiteId) ?? 'Suíte apagada',
        periodo: formatarPeriodo(reserva.checkIn, reserva.checkOut),
        faltaPagar: Math.max(0, reserva.valorTotal - pago),
      };
    };

    this.chegamHoje = ativas.filter((r) => r.checkIn === hoje).map(resumir);
    this.saemHoje = ativas.filter((r) => r.checkOut === hoje).map(resumir);
    this.proximas = ativas
      .filter((r) => r.checkIn > hoje)
      .sort((a, b) => a.checkIn.localeCompare(b.checkIn))
      .slice(0, 5)
      .map(resumir);

    this.lembreteBackup = this.calcularLembreteBackup(ultimoBackup, reservas.length + hospedes.length);
  }

  private calcularLembreteBackup(ultimo: string | null, totalCadastros: number): string {
    if (totalCadastros === 0) return '';
    if (!ultimo) return 'Você ainda não salvou nenhuma cópia dos dados. Toque aqui para salvar.';
    const dias = Math.floor((Date.now() - new Date(ultimo).getTime()) / 86_400_000);
    return dias >= 7 ? `Faz ${dias} dias que você não salva uma cópia dos dados. Toque aqui para salvar.` : '';
  }

  async novaReserva(): Promise<void> {
    const resultado = await abrirModal(this.modalCtrl, ReservaFormComponent);
    if (houveMudanca(resultado)) await this.carregar();
  }

  async anotarGasto(): Promise<void> {
    const resultado = await abrirModal(this.modalCtrl, LancamentoFormComponent, { tipoInicial: 'despesa' });
    if (houveMudanca(resultado)) await this.carregar();
  }

  async abrirReserva(item: ReservaResumo): Promise<void> {
    const resultado = await abrirModal(this.modalCtrl, ReservaFormComponent, { reserva: item.reserva });
    if (houveMudanca(resultado)) await this.carregar();
  }
}
