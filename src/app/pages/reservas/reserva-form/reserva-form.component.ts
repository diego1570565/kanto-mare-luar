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
  IonInput,
  IonTextarea,
  IonSelect,
  IonSelectOption,
  IonIcon,
  IonToggle,
  ModalController,
  AlertController,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { addOutline, trashOutline, warningOutline, personAddOutline, cashOutline, checkmarkCircleOutline } from 'ionicons/icons';

import { Reserva, StatusReserva, STATUS_RESERVA_LABEL } from '../../../models/reserva.model';
import { Pagamento } from '../../../models/pagamento.model';
import { Hospede } from '../../../models/hospede.model';
import { Suite } from '../../../models/suite.model';
import { FORMAS_PAGAMENTO } from '../../../models/lancamento.model';
import { ReservaService } from '../../../services/reserva.service';
import { HospedeService } from '../../../services/hospede.service';
import { SuiteService } from '../../../services/suite.service';
import { PagamentoService } from '../../../services/pagamento.service';
import { formatarMoeda, diasEntre, formatarData, hojeISO } from '../../../core/format.util';
import { abrirModal } from '../../../core/modal.util';
import { HospedeFormComponent } from '../../hospedes/hospede-form/hospede-form.component';

@Component({
  selector: 'app-reserva-form',
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: 'reserva-form.component.html',
  styleUrls: ['reserva-form.component.scss'],
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
    IonInput,
    IonTextarea,
    IonSelect,
    IonSelectOption,
    IonIcon,
    IonToggle,
  ],
})
export class ReservaFormComponent implements OnInit {
  @Input() reserva?: Reserva;
  /** Valores para já vir preenchido quando a reserva é aberta a partir de outra tela. */
  @Input() hospedeIdInicial?: string;
  @Input() suiteIdInicial?: string;
  @Input() checkInInicial?: string;
  @Input() checkOutInicial?: string;

  modelo!: Reserva;
  edicao = false;
  hospedes: Hospede[] = [];
  suites: Suite[] = [];
  pagamentos: Pagamento[] = [];
  conflitos: Reserva[] = [];
  tentouSalvar = false;

  readonly statusOpcoes = Object.entries(STATUS_RESERVA_LABEL) as [StatusReserva, string][];
  readonly formasPagamento = FORMAS_PAGAMENTO;
  readonly formatarMoeda = formatarMoeda;
  readonly formatarData = formatarData;

  constructor(
    private modalCtrl: ModalController,
    private alertCtrl: AlertController,
    private reservaService: ReservaService,
    private hospedeService: HospedeService,
    private suiteService: SuiteService,
    private pagamentoService: PagamentoService,
  ) {
    addIcons({ addOutline, trashOutline, warningOutline, personAddOutline, cashOutline, checkmarkCircleOutline });
  }

  async ngOnInit(): Promise<void> {
    this.edicao = !!this.reserva;
    if (this.reserva) {
      this.modelo = { ...this.reserva };
    } else {
      this.modelo = this.reservaService.novaReserva();
      if (this.hospedeIdInicial) this.modelo.hospedeId = this.hospedeIdInicial;
      if (this.checkInInicial) this.modelo.checkIn = this.checkInInicial;
      if (this.checkOutInicial) this.modelo.checkOut = this.checkOutInicial;
    }
    await this.carregarListas();
    if (!this.edicao && this.suiteIdInicial) {
      this.modelo.suiteId = this.suiteIdInicial;
      this.onSuiteAlterada();
    }
    this.atualizarStatusAutomatico();
    this.pagamentos = this.edicao ? await this.pagamentoService.listarPorReserva(this.modelo.id) : [];
    await this.verificarConflitos();
  }

  private async carregarListas(): Promise<void> {
    const [hospedes, suites] = await Promise.all([this.hospedeService.getAll(), this.suiteService.getAll()]);
    this.hospedes = hospedes.sort((a, b) => a.nome.localeCompare(b.nome));
    // Suítes desativadas só aparecem se já forem a suíte desta reserva.
    this.suites = suites.filter((s) => s.ativo || s.id === this.modelo.suiteId).sort((a, b) => a.nome.localeCompare(b.nome));
  }

  get numeroDiarias(): number {
    if (!this.modelo.checkIn || !this.modelo.checkOut || this.modelo.checkIn >= this.modelo.checkOut) return 0;
    return diasEntre(this.modelo.checkIn, this.modelo.checkOut);
  }

  get totalPago(): number {
    return this.pagamentoService.totalPago(this.pagamentos);
  }

  get faltaPagar(): number {
    return Math.max(0, (Number(this.modelo.valorTotal) || 0) - this.totalPago);
  }

  get nomeHospede(): string {
    return this.hospedes.find((h) => h.id === this.modelo.hospedeId)?.nome ?? '';
  }

  onSuiteAlterada(): void {
    const suite = this.suites.find((s) => s.id === this.modelo.suiteId);
    if (suite) {
      this.modelo.valorDiaria = suite.valorDiaria;
    }
    this.recalcularTotal();
    void this.verificarConflitos();
  }

  onPeriodoAlterado(): void {
    this.recalcularTotal();
    this.atualizarStatusAutomatico();
    void this.verificarConflitos();
  }

  /** Numa reserva nova, a situação acompanha as datas (quem já está na pousada fica "Hospedado agora"). */
  private atualizarStatusAutomatico(): void {
    if (this.edicao) return;
    const hoje = hojeISO();
    this.modelo.status = this.modelo.checkIn <= hoje && hoje < this.modelo.checkOut ? 'em_andamento' : 'confirmada';
  }

  recalcularTotal(): void {
    const diarias = this.numeroDiarias;
    const diaria = Number(this.modelo.valorDiaria) || 0;
    if (diarias > 0) {
      this.modelo.valorTotal = Number((diarias * diaria).toFixed(2));
    }
  }

  private async verificarConflitos(): Promise<void> {
    if (!this.modelo.suiteId || !this.modelo.checkIn || !this.modelo.checkOut || this.modelo.checkIn >= this.modelo.checkOut) {
      this.conflitos = [];
      return;
    }
    this.conflitos = await this.reservaService.conflitos(this.modelo.suiteId, this.modelo.checkIn, this.modelo.checkOut, this.modelo.id);
  }

  nomeHospedeConflito(reserva: Reserva): string {
    return this.hospedes.find((h) => h.id === reserva.hospedeId)?.nome ?? 'outro hóspede';
  }

  async cadastrarHospedeNovo(): Promise<void> {
    const { data, role } = await abrirModal<Hospede>(this.modalCtrl, HospedeFormComponent, { apenasCadastro: true });
    if (role === 'save' && data) {
      await this.carregarListas();
      this.modelo.hospedeId = data.id;
    }
  }

  anotarPagamento(): void {
    const novo = this.pagamentoService.novoPagamento(this.modelo.id);
    novo.valor = this.faltaPagar;
    novo.status = 'pago';
    this.pagamentos = [...this.pagamentos, novo];
  }

  receberRestante(): void {
    if (this.faltaPagar <= 0) return;
    const novo = this.pagamentoService.novoPagamento(this.modelo.id);
    novo.valor = this.faltaPagar;
    novo.status = 'pago';
    this.pagamentos = [...this.pagamentos, novo];
  }

  pagamentoFoiFeito(pagamento: Pagamento): boolean {
    return pagamento.status === 'pago';
  }

  marcarPagamento(pagamento: Pagamento, pago: boolean): void {
    pagamento.status = pago ? 'pago' : 'pendente';
  }

  removerPagamento(pagamento: Pagamento): void {
    this.pagamentos = this.pagamentos.filter((p) => p.id !== pagamento.id);
  }

  cancelar(): void {
    this.modalCtrl.dismiss(null, 'cancel');
  }

  /** O que ainda falta para poder salvar, em linguagem simples. */
  get problemas(): string[] {
    const lista: string[] = [];
    if (!this.modelo.hospedeId) lista.push('Escolha quem vai se hospedar.');
    if (!this.modelo.suiteId) lista.push('Escolha a suíte.');
    if (!this.modelo.checkIn || !this.modelo.checkOut) {
      lista.push('Preencha o dia da chegada e o dia da saída.');
    } else if (this.modelo.checkIn >= this.modelo.checkOut) {
      lista.push('O dia da saída precisa ser depois do dia da chegada.');
    }
    if ((Number(this.modelo.valorTotal) || 0) < 0) lista.push('O valor total não pode ser negativo.');
    if (this.conflitos.length > 0 && this.modelo.status !== 'cancelada') {
      lista.push('Essa suíte já está ocupada nessas datas. Escolha outra suíte ou outras datas.');
    }
    return lista;
  }

  async salvar(): Promise<void> {
    this.tentouSalvar = true;
    await this.verificarConflitos();
    if (this.problemas.length > 0) {
      const alert = await this.alertCtrl.create({
        header: 'Falta pouco!',
        message: this.problemas.join(' '),
        buttons: ['Entendi'],
      });
      await alert.present();
      return;
    }
    const reserva: Reserva = {
      ...this.modelo,
      valorDiaria: Number(this.modelo.valorDiaria) || 0,
      valorTotal: Number(this.modelo.valorTotal) || 0,
    };
    const salvo = await this.reservaService.save(reserva);
    const pagamentosValidos = this.pagamentos
      .filter((p) => (Number(p.valor) || 0) > 0)
      .map((p) => ({ ...p, valor: Number(p.valor) }));
    await this.pagamentoService.sincronizarDaReserva(salvo.id, pagamentosValidos);
    this.modalCtrl.dismiss(salvo, 'save');
  }

  async apagar(): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Apagar esta reserva?',
      message: `A reserva de ${this.nomeHospede || 'este hóspede'} e os pagamentos anotados nela serão apagados. Se o hóspede só desistiu, prefira mudar a situação para "Cancelada".`,
      buttons: [
        { text: 'Não, voltar', role: 'cancel' },
        {
          text: 'Sim, apagar',
          role: 'destructive',
          handler: async () => {
            await this.pagamentoService.removerPorReserva(this.modelo.id);
            await this.reservaService.remove(this.modelo.id);
            this.modalCtrl.dismiss(null, 'delete');
          },
        },
      ],
    });
    await alert.present();
  }
}
