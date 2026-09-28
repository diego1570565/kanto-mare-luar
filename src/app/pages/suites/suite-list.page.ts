import { ChangeDetectionStrategy, Component } from '@angular/core';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonMenuButton,
  IonButton,
  IonIcon,
  IonContent,
  IonList,
  IonItem,
  IonLabel,
  IonBadge,
  ModalController,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { addOutline, bedOutline } from 'ionicons/icons';

import { SuiteService } from '../../services/suite.service';
import { ReservaService } from '../../services/reserva.service';
import { HospedeService } from '../../services/hospede.service';
import { Suite } from '../../models/suite.model';
import { formatarData, formatarMoeda, hojeISO } from '../../core/format.util';
import { abrirModal, houveMudanca } from '../../core/modal.util';
import { SuiteFormComponent } from './suite-form/suite-form.component';

interface SuiteLinha {
  suite: Suite;
  ocupadaPor?: string;
  saidaEm?: string;
}

@Component({
  selector: 'app-suite-list',
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: 'suite-list.page.html',
  styleUrls: ['suite-list.page.scss'],
  imports: [IonHeader, IonToolbar, IonTitle, IonButtons, IonMenuButton, IonButton, IonIcon, IonContent, IonList, IonItem, IonLabel, IonBadge],
})
export class SuiteListPage {
  linhas: SuiteLinha[] = [];
  readonly formatarMoeda = formatarMoeda;

  constructor(
    private suiteService: SuiteService,
    private reservaService: ReservaService,
    private hospedeService: HospedeService,
    private modalCtrl: ModalController,
  ) {
    addIcons({ addOutline, bedOutline });
  }

  async ionViewWillEnter(): Promise<void> {
    await this.carregar();
  }

  private async carregar(): Promise<void> {
    const hoje = hojeISO();
    const [suites, ocupacao, hospedes] = await Promise.all([
      this.suiteService.getAll(),
      this.reservaService.ocupacaoEm(hoje),
      this.hospedeService.getAll(),
    ]);
    const nomeHospede = new Map(hospedes.map((h) => [h.id, h.nome]));
    this.linhas = suites
      .sort((a, b) => Number(b.ativo) - Number(a.ativo) || a.nome.localeCompare(b.nome))
      .map((suite) => {
        const reserva = ocupacao.find((r) => r.suiteId === suite.id);
        return {
          suite,
          ocupadaPor: reserva ? (nomeHospede.get(reserva.hospedeId) ?? 'hóspede') : undefined,
          saidaEm: reserva ? formatarData(reserva.checkOut) : undefined,
        };
      });
  }

  async abrir(suite?: Suite): Promise<void> {
    const resultado = await abrirModal(this.modalCtrl, SuiteFormComponent, { suite });
    if (houveMudanca(resultado)) await this.carregar();
  }
}
