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
  IonIcon,
  IonBadge,
  ModalController,
  AlertController,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { logoWhatsapp, calendarOutline, trashOutline } from 'ionicons/icons';

import { Hospede } from '../../../models/hospede.model';
import { Reserva, STATUS_RESERVA_COR, STATUS_RESERVA_LABEL } from '../../../models/reserva.model';
import { HospedeService } from '../../../services/hospede.service';
import { ReservaService } from '../../../services/reserva.service';
import { SuiteService } from '../../../services/suite.service';
import { PagamentoService } from '../../../services/pagamento.service';
import { formatarMoeda, formatarPeriodo } from '../../../core/format.util';
import { abrirModal, houveMudanca } from '../../../core/modal.util';
import { ReservaFormComponent } from '../../reservas/reserva-form/reserva-form.component';

interface HospedagemLinha {
  reserva: Reserva;
  suiteNome: string;
  periodo: string;
  faltaPagar: number;
}

@Component({
  selector: 'app-hospede-form',
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: 'hospede-form.component.html',
  styleUrls: ['hospede-form.component.scss'],
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
    IonIcon,
    IonBadge,
  ],
})
export class HospedeFormComponent implements OnInit {
  @Input() hospede?: Hospede;
  /** Aberto de dentro de uma reserva: só cadastra e volta. */
  @Input() apenasCadastro = false;

  modelo!: Hospede;
  edicao = false;
  hospedagens: HospedagemLinha[] = [];
  mudouAlgo = false;
  tentouSalvar = false;

  readonly formatarMoeda = formatarMoeda;
  readonly statusLabel = STATUS_RESERVA_LABEL;
  readonly statusCor = STATUS_RESERVA_COR;

  constructor(
    private modalCtrl: ModalController,
    private alertCtrl: AlertController,
    private hospedeService: HospedeService,
    private reservaService: ReservaService,
    private suiteService: SuiteService,
    private pagamentoService: PagamentoService,
  ) {
    addIcons({ logoWhatsapp, calendarOutline, trashOutline });
  }

  async ngOnInit(): Promise<void> {
    this.edicao = !!this.hospede;
    this.modelo = this.hospede ? { ...this.hospede } : this.hospedeService.novoHospede();
    if (this.edicao) await this.carregarHospedagens();
  }

  private async carregarHospedagens(): Promise<void> {
    const [reservas, suites, pagamentos] = await Promise.all([
      this.reservaService.porHospede(this.modelo.id),
      this.suiteService.getAll(),
      this.pagamentoService.getAll(),
    ]);
    const nomeSuite = new Map(suites.map((s) => [s.id, s.nome]));
    this.hospedagens = reservas
      .sort((a, b) => b.checkIn.localeCompare(a.checkIn))
      .map((reserva) => {
        const pago = this.pagamentoService.totalPago(pagamentos.filter((p) => p.reservaId === reserva.id));
        return {
          reserva,
          suiteNome: nomeSuite.get(reserva.suiteId) ?? 'Suíte apagada',
          periodo: formatarPeriodo(reserva.checkIn, reserva.checkOut),
          faltaPagar: reserva.status === 'cancelada' ? 0 : Math.max(0, reserva.valorTotal - pago),
        };
      });
  }

  get linkWhatsapp(): string | null {
    let numero = (this.modelo.telefone ?? '').replace(/\D/g, '');
    if (numero.length < 10) return null;
    if (numero.length <= 11) numero = '55' + numero;
    return `https://wa.me/${numero}`;
  }

  abrirWhatsapp(): void {
    if (this.linkWhatsapp) window.open(this.linkWhatsapp, '_blank');
  }

  async abrirHospedagem(linha: HospedagemLinha): Promise<void> {
    const resultado = await abrirModal(this.modalCtrl, ReservaFormComponent, { reserva: linha.reserva });
    if (houveMudanca(resultado)) {
      this.mudouAlgo = true;
      await this.carregarHospedagens();
    }
  }

  async novaReserva(): Promise<void> {
    // Garante que o hóspede esteja salvo antes de reservar para ele.
    if (!(await this.gravar())) return;
    this.edicao = true;
    const resultado = await abrirModal(this.modalCtrl, ReservaFormComponent, { hospedeIdInicial: this.modelo.id });
    if (houveMudanca(resultado)) {
      await this.carregarHospedagens();
    }
  }

  cancelar(): void {
    this.modalCtrl.dismiss(null, this.mudouAlgo ? 'save' : 'cancel');
  }

  get valido(): boolean {
    return this.modelo.nome.trim().length > 0;
  }

  private async gravar(): Promise<boolean> {
    this.tentouSalvar = true;
    if (!this.valido) {
      const alert = await this.alertCtrl.create({ header: 'Falta o nome', message: 'Escreva o nome do hóspede para salvar.', buttons: ['Entendi'] });
      await alert.present();
      return false;
    }
    this.modelo = { ...this.modelo, nome: this.modelo.nome.trim() };
    await this.hospedeService.save(this.modelo);
    this.mudouAlgo = true;
    return true;
  }

  async salvar(): Promise<void> {
    if (await this.gravar()) {
      this.modalCtrl.dismiss(this.modelo, 'save');
    }
  }

  async apagar(): Promise<void> {
    if (this.hospedagens.length > 0) {
      const alert = await this.alertCtrl.create({
        header: 'Não dá para apagar',
        message: `${this.modelo.nome} tem ${this.hospedagens.length} ${this.hospedagens.length === 1 ? 'reserva' : 'reservas'} anotadas. Para não perder o histórico, o cadastro fica guardado.`,
        buttons: ['Entendi'],
      });
      await alert.present();
      return;
    }
    const alert = await this.alertCtrl.create({
      header: 'Apagar este hóspede?',
      message: `O cadastro de ${this.modelo.nome} será apagado.`,
      buttons: [
        { text: 'Não, voltar', role: 'cancel' },
        {
          text: 'Sim, apagar',
          role: 'destructive',
          handler: async () => {
            await this.hospedeService.remove(this.modelo.id);
            this.modalCtrl.dismiss(null, 'delete');
          },
        },
      ],
    });
    await alert.present();
  }
}
