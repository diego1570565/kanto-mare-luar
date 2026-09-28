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
  IonSearchbar,
  ModalController,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { addOutline, calendarOutline } from 'ionicons/icons';

import { ReservaService } from '../../services/reserva.service';
import { HospedeService } from '../../services/hospede.service';
import { SuiteService } from '../../services/suite.service';
import { PagamentoService } from '../../services/pagamento.service';
import { Reserva, STATUS_RESERVA_LABEL, STATUS_RESERVA_COR } from '../../models/reserva.model';
import { formatarData, formatarMoeda } from '../../core/format.util';
import { abrirModal, houveMudanca } from '../../core/modal.util';
import { ReservaFormComponent } from './reserva-form/reserva-form.component';

interface ReservaLinha {
  reserva: Reserva;
  hospedeNome: string;
  suiteNome: string;
  faltaPagar: number;
}

type Filtro = 'ativas' | 'todas' | 'finalizadas' | 'canceladas';

@Component({
  selector: 'app-reserva-list',
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: 'reserva-list.page.html',
  styleUrls: ['reserva-list.page.scss'],
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
    IonSearchbar,
  ],
})
export class ReservaListPage {
  linhas: ReservaLinha[] = [];
  filtro: Filtro = 'ativas';
  busca = '';

  readonly formatarMoeda = formatarMoeda;
  readonly formatarData = formatarData;
  readonly statusLabel = STATUS_RESERVA_LABEL;
  readonly statusCor = STATUS_RESERVA_COR;

  constructor(
    private reservaService: ReservaService,
    private hospedeService: HospedeService,
    private suiteService: SuiteService,
    private pagamentoService: PagamentoService,
    private modalCtrl: ModalController,
  ) {
    addIcons({ addOutline, calendarOutline });
  }

  async ionViewWillEnter(): Promise<void> {
    await this.carregar();
  }

  private async carregar(): Promise<void> {
    const [reservas, hospedes, suites, pagamentos] = await Promise.all([
      this.reservaService.getAll(),
      this.hospedeService.getAll(),
      this.suiteService.getAll(),
      this.pagamentoService.getAll(),
    ]);
    const mapaHospedes = new Map(hospedes.map((h) => [h.id, h.nome]));
    const mapaSuites = new Map(suites.map((s) => [s.id, s.nome]));

    this.linhas = reservas.map((reserva) => {
      const totalPago = this.pagamentoService.totalPago(pagamentos.filter((p) => p.reservaId === reserva.id));
      return {
        reserva,
        hospedeNome: mapaHospedes.get(reserva.hospedeId) ?? 'Hóspede apagado',
        suiteNome: mapaSuites.get(reserva.suiteId) ?? 'Suíte apagada',
        faltaPagar: reserva.status === 'cancelada' ? 0 : Math.max(0, reserva.valorTotal - totalPago),
      };
    });
  }

  get linhasFiltradas(): ReservaLinha[] {
    let lista: ReservaLinha[];
    switch (this.filtro) {
      case 'ativas':
        // Atuais e próximas: da mais perto para a mais longe.
        lista = this.linhas
          .filter((l) => l.reserva.status === 'confirmada' || l.reserva.status === 'em_andamento')
          .sort((a, b) => a.reserva.checkIn.localeCompare(b.reserva.checkIn));
        break;
      case 'finalizadas':
        lista = this.linhas.filter((l) => l.reserva.status === 'finalizada');
        break;
      case 'canceladas':
        lista = this.linhas.filter((l) => l.reserva.status === 'cancelada');
        break;
      default:
        lista = [...this.linhas];
    }
    if (this.filtro !== 'ativas') {
      lista.sort((a, b) => b.reserva.checkIn.localeCompare(a.reserva.checkIn));
    }
    const termo = this.busca.trim().toLowerCase();
    return termo ? lista.filter((l) => l.hospedeNome.toLowerCase().includes(termo) || l.suiteNome.toLowerCase().includes(termo)) : lista;
  }

  async abrir(reserva?: Reserva): Promise<void> {
    const resultado = await abrirModal(this.modalCtrl, ReservaFormComponent, { reserva });
    if (houveMudanca(resultado)) await this.carregar();
  }
}
