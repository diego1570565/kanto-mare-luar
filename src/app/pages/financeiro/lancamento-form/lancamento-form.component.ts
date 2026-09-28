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
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonToggle,
  IonIcon,
  ModalController,
  AlertController,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { trashOutline } from 'ionicons/icons';

import {
  CATEGORIAS_DESPESA,
  CATEGORIAS_RECEITA,
  FORMAS_PAGAMENTO,
  Lancamento,
  TipoLancamento,
} from '../../../models/lancamento.model';
import { LancamentoService } from '../../../services/lancamento.service';
import { formatarMoeda } from '../../../core/format.util';

@Component({
  selector: 'app-lancamento-form',
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: 'lancamento-form.component.html',
  styleUrls: ['lancamento-form.component.scss'],
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
    IonSegment,
    IonSegmentButton,
    IonLabel,
    IonToggle,
    IonIcon,
  ],
})
export class LancamentoFormComponent implements OnInit {
  @Input() lancamento?: Lancamento;
  @Input() tipoInicial: TipoLancamento = 'despesa';

  modelo!: Lancamento;
  edicao = false;
  repetirMeses = 1;
  tentouSalvar = false;

  readonly formasPagamento = FORMAS_PAGAMENTO;
  readonly opcoesRepeticao = [1, 2, 3, 4, 5, 6, 12];

  constructor(
    private modalCtrl: ModalController,
    private alertCtrl: AlertController,
    private lancamentoService: LancamentoService,
  ) {
    addIcons({ trashOutline });
  }

  ngOnInit(): void {
    this.edicao = !!this.lancamento;
    this.modelo = this.lancamento ? { ...this.lancamento } : this.lancamentoService.novoLancamento(this.tipoInicial);
  }

  get ehGasto(): boolean {
    return this.modelo.tipo === 'despesa';
  }

  get categorias(): string[] {
    return this.ehGasto ? CATEGORIAS_DESPESA : CATEGORIAS_RECEITA;
  }

  get pago(): boolean {
    return this.modelo.status === 'pago';
  }

  set pago(valor: boolean) {
    this.modelo.status = valor ? 'pago' : 'pendente';
  }

  onTipoAlterado(): void {
    if (!this.categorias.includes(this.modelo.categoria)) {
      this.modelo.categoria = '';
    }
  }

  cancelar(): void {
    this.modalCtrl.dismiss(null, 'cancel');
  }

  get problemas(): string[] {
    const lista: string[] = [];
    if (!(Number(this.modelo.valor) > 0)) lista.push('Escreva o valor.');
    if (!this.modelo.descricao.trim()) lista.push(this.ehGasto ? 'Escreva com o que gastou.' : 'Escreva de onde veio o dinheiro.');
    if (!this.modelo.categoria) lista.push('Escolha o tipo.');
    if (!this.modelo.data) lista.push('Preencha a data.');
    return lista;
  }

  async salvar(): Promise<void> {
    this.tentouSalvar = true;
    if (this.problemas.length > 0) {
      const alert = await this.alertCtrl.create({ header: 'Falta pouco!', message: this.problemas.join(' '), buttons: ['Entendi'] });
      await alert.present();
      return;
    }
    const lancamento: Lancamento = { ...this.modelo, descricao: this.modelo.descricao.trim(), valor: Number(this.modelo.valor) };
    await this.lancamentoService.salvarComRepeticao(lancamento, this.edicao ? 1 : this.repetirMeses);
    this.modalCtrl.dismiss(lancamento, 'save');
  }

  async apagar(): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: this.ehGasto ? 'Apagar este gasto?' : 'Apagar esta entrada?',
      message: `"${this.modelo.descricao}" de ${formatarMoeda(Number(this.modelo.valor))} será apagado.`,
      buttons: [
        { text: 'Não, voltar', role: 'cancel' },
        {
          text: 'Sim, apagar',
          role: 'destructive',
          handler: async () => {
            await this.lancamentoService.remove(this.modelo.id);
            this.modalCtrl.dismiss(null, 'delete');
          },
        },
      ],
    });
    await alert.present();
  }
}
