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
  IonSearchbar,
  IonList,
  IonItem,
  IonLabel,
  IonBadge,
  ModalController,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { personAddOutline, peopleOutline, callOutline } from 'ionicons/icons';

import { HospedeService } from '../../services/hospede.service';
import { ReservaService } from '../../services/reserva.service';
import { Hospede } from '../../models/hospede.model';
import { hojeISO } from '../../core/format.util';
import { abrirModal, houveMudanca } from '../../core/modal.util';
import { HospedeFormComponent } from './hospede-form/hospede-form.component';

interface HospedeLinha {
  hospede: Hospede;
  totalReservas: number;
  hospedadoAgora: boolean;
}

@Component({
  selector: 'app-hospede-list',
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: 'hospede-list.page.html',
  styleUrls: ['hospede-list.page.scss'],
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
    IonSearchbar,
    IonList,
    IonItem,
    IonLabel,
    IonBadge,
  ],
})
export class HospedeListPage {
  linhas: HospedeLinha[] = [];
  filtro = '';

  constructor(
    private hospedeService: HospedeService,
    private reservaService: ReservaService,
    private modalCtrl: ModalController,
  ) {
    addIcons({ personAddOutline, peopleOutline, callOutline });
  }

  async ionViewWillEnter(): Promise<void> {
    await this.carregar();
  }

  private async carregar(): Promise<void> {
    const [hospedes, reservas] = await Promise.all([this.hospedeService.getAll(), this.reservaService.getAll()]);
    const hoje = hojeISO();
    this.linhas = hospedes
      .sort((a, b) => a.nome.localeCompare(b.nome))
      .map((hospede) => {
        const doHospede = reservas.filter((r) => r.hospedeId === hospede.id && r.status !== 'cancelada');
        return {
          hospede,
          totalReservas: doHospede.length,
          hospedadoAgora: doHospede.some((r) => r.checkIn <= hoje && hoje < r.checkOut),
        };
      });
  }

  get linhasFiltradas(): HospedeLinha[] {
    const termo = this.filtro.trim().toLowerCase();
    if (!termo) return this.linhas;
    const digitos = termo.replace(/\D/g, '');
    return this.linhas.filter(({ hospede: h }) => {
      const telefone = (h.telefone ?? '').replace(/\D/g, '');
      return (
        h.nome.toLowerCase().includes(termo) ||
        (!!digitos && telefone.includes(digitos)) ||
        (h.cidade ?? '').toLowerCase().includes(termo)
      );
    });
  }

  async abrir(hospede?: Hospede): Promise<void> {
    const resultado = await abrirModal(this.modalCtrl, HospedeFormComponent, { hospede });
    if (houveMudanca(resultado)) await this.carregar();
  }
}
