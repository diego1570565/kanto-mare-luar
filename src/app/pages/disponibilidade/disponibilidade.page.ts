import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonMenuButton,
  IonContent,
  IonList,
  IonItem,
  IonLabel,
  IonInput,
  IonSelect,
  IonSelectOption,
  IonButton,
  IonIcon,
  IonSearchbar,
  ModalController,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { searchOutline, checkmarkCircle, closeCircle, personOutline, calendarOutline } from 'ionicons/icons';

import { SuiteService } from '../../services/suite.service';
import { ReservaService } from '../../services/reserva.service';
import { HospedeService } from '../../services/hospede.service';
import { Suite } from '../../models/suite.model';
import { Reserva, STATUS_RESERVA_LABEL } from '../../models/reserva.model';
import { Hospede } from '../../models/hospede.model';
import { dataISO, diasEntre, formatarData, formatarMoeda, formatarPeriodo, hojeISO } from '../../core/format.util';
import { abrirModal, houveMudanca } from '../../core/modal.util';
import { ReservaFormComponent } from '../reservas/reserva-form/reserva-form.component';

interface Ocupacao {
  reserva: Reserva;
  hospedeNome: string;
  periodo: string;
}

interface ResultadoSuite {
  suite: Suite;
  livre: boolean;
  ocupacoes: Ocupacao[];
}

interface ReservaHistorico {
  reserva: Reserva;
  hospedeNome: string;
  suiteNome: string;
  periodo: string;
}

@Component({
  selector: 'app-disponibilidade',
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: 'disponibilidade.page.html',
  styleUrls: ['disponibilidade.page.scss'],
  imports: [
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonMenuButton,
    IonContent,
    IonList,
    IonItem,
    IonLabel,
    IonInput,
    IonSelect,
    IonSelectOption,
    IonButton,
    IonIcon,
    IonSearchbar,
  ],
})
export class DisponibilidadePage {
  suites: Suite[] = [];
  suiteIdSelecionada = 'todas';
  dataInicio = hojeISO();
  dataFim = '';

  resultados: ResultadoSuite[] = [];
  erroDatas = '';
  buscaRealizada = false;

  termoHospede = '';
  private hospedes: Hospede[] = [];
  private reservasTodas: Reserva[] = [];
  historicoHospede: ReservaHistorico[] = [];

  readonly formatarMoeda = formatarMoeda;
  readonly formatarData = formatarData;
  readonly statusLabel = STATUS_RESERVA_LABEL;

  constructor(
    private suiteService: SuiteService,
    private reservaService: ReservaService,
    private hospedeService: HospedeService,
    private modalCtrl: ModalController,
  ) {
    addIcons({ searchOutline, checkmarkCircle, closeCircle, personOutline, calendarOutline });
    const amanha = new Date();
    amanha.setDate(amanha.getDate() + 1);
    this.dataFim = dataISO(amanha);
  }

  async ionViewWillEnter(): Promise<void> {
    await this.carregar();
    await this.verificarDisponibilidade();
  }

  private async carregar(): Promise<void> {
    const [suites, hospedes, reservas] = await Promise.all([
      this.suiteService.ativas(),
      this.hospedeService.getAll(),
      this.reservaService.getAll(),
    ]);
    this.suites = suites.sort((a, b) => a.nome.localeCompare(b.nome));
    this.hospedes = hospedes;
    this.reservasTodas = reservas;
    this.buscarHospede();
  }

  get diarias(): number {
    return this.dataInicio && this.dataFim && this.dataInicio < this.dataFim ? diasEntre(this.dataInicio, this.dataFim) : 0;
  }

  get totalLivres(): number {
    return this.resultados.filter((r) => r.livre).length;
  }

  async verificarDisponibilidade(): Promise<void> {
    this.buscaRealizada = true;
    if (!this.dataInicio || !this.dataFim) {
      this.erroDatas = 'Preencha o dia da chegada e o dia da saída.';
      this.resultados = [];
      return;
    }
    if (this.dataInicio >= this.dataFim) {
      this.erroDatas = 'O dia da saída precisa ser depois do dia da chegada.';
      this.resultados = [];
      return;
    }
    this.erroDatas = '';

    const alvo = this.suiteIdSelecionada === 'todas' ? this.suites : this.suites.filter((s) => s.id === this.suiteIdSelecionada);
    const nomeHospede = new Map(this.hospedes.map((h) => [h.id, h.nome]));

    this.resultados = await Promise.all(
      alvo.map(async (suite) => {
        const conflitos = await this.reservaService.conflitos(suite.id, this.dataInicio, this.dataFim);
        return {
          suite,
          livre: conflitos.length === 0,
          ocupacoes: conflitos.map((reserva) => ({
            reserva,
            hospedeNome: nomeHospede.get(reserva.hospedeId) ?? 'Hóspede apagado',
            periodo: formatarPeriodo(reserva.checkIn, reserva.checkOut),
          })),
        };
      }),
    );
    // Livres primeiro.
    this.resultados.sort((a, b) => Number(b.livre) - Number(a.livre) || a.suite.nome.localeCompare(b.suite.nome));
  }

  async reservar(suite: Suite): Promise<void> {
    const resultado = await abrirModal(this.modalCtrl, ReservaFormComponent, {
      suiteIdInicial: suite.id,
      checkInInicial: this.dataInicio,
      checkOutInicial: this.dataFim,
    });
    if (houveMudanca(resultado)) await this.recarregarTudo();
  }

  async abrirReserva(reserva: Reserva): Promise<void> {
    const resultado = await abrirModal(this.modalCtrl, ReservaFormComponent, { reserva });
    if (houveMudanca(resultado)) await this.recarregarTudo();
  }

  private async recarregarTudo(): Promise<void> {
    await this.carregar();
    await this.verificarDisponibilidade();
  }

  buscarHospede(): void {
    const termo = this.termoHospede.trim().toLowerCase();
    if (!termo) {
      this.historicoHospede = [];
      return;
    }
    const encontrados = new Map(this.hospedes.filter((h) => h.nome.toLowerCase().includes(termo)).map((h) => [h.id, h.nome]));
    const nomeSuite = new Map(this.suites.map((s) => [s.id, s.nome]));

    this.historicoHospede = this.reservasTodas
      .filter((r) => encontrados.has(r.hospedeId))
      .sort((a, b) => b.checkIn.localeCompare(a.checkIn))
      .map((reserva) => ({
        reserva,
        hospedeNome: encontrados.get(reserva.hospedeId) ?? '',
        suiteNome: nomeSuite.get(reserva.suiteId) ?? 'Suíte desativada ou apagada',
        periodo: formatarPeriodo(reserva.checkIn, reserva.checkOut),
      }));
  }
}
