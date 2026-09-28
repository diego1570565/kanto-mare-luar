import { ChangeDetectionStrategy, Component, Input, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonContent,
  IonList,
  IonItem,
  IonLabel,
  IonInput,
  IonTextarea,
  IonSelect,
  IonSelectOption,
  IonToggle,
  IonIcon,
  ModalController,
  AlertController,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { calendarOutline, trashOutline } from 'ionicons/icons';

import { Suite } from '../../../models/suite.model';
import { Reserva } from '../../../models/reserva.model';
import { SuiteService } from '../../../services/suite.service';
import { ReservaService } from '../../../services/reserva.service';
import { HospedeService } from '../../../services/hospede.service';
import { formatarPeriodo, hojeISO } from '../../../core/format.util';
import { abrirModal, houveMudanca } from '../../../core/modal.util';
import { ReservaFormComponent } from '../../reservas/reserva-form/reserva-form.component';

const TIPOS_SUITE = ['Casal', 'Solteiro', 'Família', 'Standard', 'Luxo', 'Master'];

interface ReservaDaSuite {
  reserva: Reserva;
  hospedeNome: string;
  periodo: string;
}

@Component({
  selector: 'app-suite-form',
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: 'suite-form.component.html',
  styleUrls: ['suite-form.component.scss'],
  imports: [
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonContent,
    IonList,
    IonItem,
    IonLabel,
    IonInput,
    IonTextarea,
    IonSelect,
    IonSelectOption,
    IonToggle,
    IonIcon,
  ],
})
export class SuiteFormComponent implements OnInit {
  @Input() suite?: Suite;

  modelo!: Suite;
  readonly tipos = TIPOS_SUITE;
  edicao = false;
  proximas: ReservaDaSuite[] = [];
  private totalReservasAtivas = 0;
  mudouAlgo = false;
  tentouSalvar = false;

  constructor(
    private modalCtrl: ModalController,
    private alertCtrl: AlertController,
    private suiteService: SuiteService,
    private reservaService: ReservaService,
    private hospedeService: HospedeService,
  ) {
    addIcons({ calendarOutline, trashOutline });
  }

  async ngOnInit(): Promise<void> {
    this.edicao = !!this.suite;
    this.modelo = this.suite ? { ...this.suite } : this.suiteService.novaSuite();
    if (this.edicao) await this.carregarReservas();
  }

  private async carregarReservas(): Promise<void> {
    const [reservas, hospedes] = await Promise.all([this.reservaService.porSuite(this.modelo.id), this.hospedeService.getAll()]);
    const nomeHospede = new Map(hospedes.map((h) => [h.id, h.nome]));
    const ativas = reservas.filter((r) => r.status !== 'cancelada');
    this.totalReservasAtivas = ativas.length;
    const hoje = hojeISO();
    this.proximas = ativas
      .filter((r) => r.checkOut >= hoje)
      .sort((a, b) => a.checkIn.localeCompare(b.checkIn))
      .map((reserva) => ({
        reserva,
        hospedeNome: nomeHospede.get(reserva.hospedeId) ?? 'Hóspede apagado',
        periodo: formatarPeriodo(reserva.checkIn, reserva.checkOut),
      }));
  }

  get problemas(): string[] {
    const lista: string[] = [];
    if (!this.modelo.nome.trim()) lista.push('Escreva o nome da suíte.');
    if (!(Number(this.modelo.capacidade) > 0)) lista.push('Diga quantas pessoas cabem (1 ou mais).');
    if ((Number(this.modelo.valorDiaria) || 0) < 0) lista.push('O valor da diária não pode ser negativo.');
    return lista;
  }

  cancelar(): void {
    this.modalCtrl.dismiss(null, this.mudouAlgo ? 'save' : 'cancel');
  }

  private async gravar(): Promise<boolean> {
    this.tentouSalvar = true;
    if (this.problemas.length > 0) {
      const alert = await this.alertCtrl.create({ header: 'Falta pouco!', message: this.problemas.join(' '), buttons: ['Entendi'] });
      await alert.present();
      return false;
    }
    this.modelo = {
      ...this.modelo,
      nome: this.modelo.nome.trim(),
      capacidade: Number(this.modelo.capacidade),
      valorDiaria: Number(this.modelo.valorDiaria) || 0,
    };
    await this.suiteService.save(this.modelo);
    this.mudouAlgo = true;
    return true;
  }

  async salvar(): Promise<void> {
    if (await this.gravar()) this.modalCtrl.dismiss(this.modelo, 'save');
  }

  async abrirReserva(item: ReservaDaSuite): Promise<void> {
    const resultado = await abrirModal(this.modalCtrl, ReservaFormComponent, { reserva: item.reserva });
    if (houveMudanca(resultado)) await this.carregarReservas();
  }

  async novaReserva(): Promise<void> {
    if (!(await this.gravar())) return;
    this.edicao = true;
    const resultado = await abrirModal(this.modalCtrl, ReservaFormComponent, { suiteIdInicial: this.modelo.id });
    if (houveMudanca(resultado)) await this.carregarReservas();
  }

  async apagar(): Promise<void> {
    if (this.totalReservasAtivas > 0) {
      const alert = await this.alertCtrl.create({
        header: 'Essa suíte tem reservas',
        message: `Para não perder o histórico, a suíte não pode ser apagada. Você pode desativá-la: ela some da lista de novas reservas, mas as antigas continuam guardadas.`,
        buttons: [
          { text: 'Voltar', role: 'cancel' },
          {
            text: 'Desativar suíte',
            handler: async () => {
              this.modelo.ativo = false;
              await this.suiteService.save(this.modelo);
              this.modalCtrl.dismiss(this.modelo, 'save');
            },
          },
        ],
      });
      await alert.present();
      return;
    }
    const alert = await this.alertCtrl.create({
      header: 'Apagar esta suíte?',
      message: `A suíte "${this.modelo.nome}" será apagada.`,
      buttons: [
        { text: 'Não, voltar', role: 'cancel' },
        {
          text: 'Sim, apagar',
          role: 'destructive',
          handler: async () => {
            await this.suiteService.remove(this.modelo.id);
            this.modalCtrl.dismiss(null, 'delete');
          },
        },
      ],
    });
    await alert.present();
  }
}
