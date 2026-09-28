import { ChangeDetectionStrategy, Component, ElementRef, ViewChild } from '@angular/core';
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
  IonInput,
  IonButton,
  IonIcon,
  ToastController,
  AlertController,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { downloadOutline, cloudUploadOutline, trashOutline, saveOutline } from 'ionicons/icons';

import { PousadaService } from '../../services/pousada.service';
import { PousadaConfig } from '../../models/pousada-config.model';
import { hojeISO } from '../../core/format.util';
import { entregarArquivo } from '../../core/arquivo.util';
import { Capacitor } from '@capacitor/core';

@Component({
  selector: 'app-configuracoes',
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: 'configuracoes.page.html',
  styleUrls: ['configuracoes.page.scss'],
  imports: [FormsModule, IonHeader, IonToolbar, IonTitle, IonButtons, IonMenuButton, IonContent, IonList, IonItem, IonInput, IonButton, IonIcon],
})
export class ConfiguracoesPage {
  @ViewChild('inputArquivo') inputArquivo?: ElementRef<HTMLInputElement>;

  config: PousadaConfig = { nome: '', endereco: '', telefone: '' };

  constructor(
    private pousadaService: PousadaService,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController,
  ) {
    addIcons({ downloadOutline, cloudUploadOutline, trashOutline, saveOutline });
  }

  ultimoBackup = '';

  async ionViewWillEnter(): Promise<void> {
    this.config = await this.pousadaService.getConfig();
    await this.carregarUltimoBackup();
  }

  private async carregarUltimoBackup(): Promise<void> {
    const iso = await this.pousadaService.ultimoBackup();
    this.ultimoBackup = iso ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' }).format(new Date(iso)) : '';
  }

  async salvarConfig(): Promise<void> {
    await this.pousadaService.salvarConfig(this.config);
    await this.mostrarToast('Pronto! Dados da pousada salvos.');
  }

  async exportarBackup(): Promise<void> {
    const dados = await this.pousadaService.exportarBackup();
    const conteudo = JSON.stringify(dados, null, 2);
    const entregue = await entregarArquivo(
      `copia-kanto-mare-luar-${hojeISO()}.json`,
      conteudo,
      'application/json',
      'Cópia dos dados da pousada',
    );
    if (!entregue) {
      await this.mostrarToast('A cópia não foi guardada. Tente de novo e escolha onde guardar.', 'warning');
      return;
    }
    await this.pousadaService.registrarBackupFeito();
    await this.carregarUltimoBackup();
    await this.mostrarToast(Capacitor.isNativePlatform() ? 'Pronto! Cópia enviada.' : 'Pronto! Cópia salva na pasta de downloads.');
  }

  abrirSeletorArquivo(): void {
    this.inputArquivo?.nativeElement.click();
  }

  async onArquivoSelecionado(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const arquivo = input.files?.[0];
    if (!arquivo) return;

    try {
      const texto = await arquivo.text();
      const dados: unknown = JSON.parse(texto);
      if (!this.pousadaService.ehBackupValido(dados)) {
        throw new Error('arquivo inválido');
      }
      const alert = await this.alertCtrl.create({
        header: 'Recuperar dados?',
        message: 'Tudo o que está no app agora será trocado pelo que está na cópia. Quer continuar?',
        buttons: [
          { text: 'Não, voltar', role: 'cancel' },
          {
            text: 'Sim, recuperar',
            role: 'destructive',
            handler: async () => {
              await this.pousadaService.importarBackup(dados);
              this.config = await this.pousadaService.getConfig();
              await this.mostrarToast('Pronto! Dados recuperados.');
            },
          },
        ],
      });
      await alert.present();
    } catch {
      await this.mostrarToast('Esse arquivo não é uma cópia do app. Escolha o arquivo que começa com "copia-kanto".', 'danger');
    } finally {
      input.value = '';
    }
  }

  async limparTudo(): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Apagar TUDO?',
      message: 'Todas as suítes, hóspedes, reservas e contas serão apagadas deste aparelho para sempre. Só faça isso se tiver uma cópia salva.',
      buttons: [
        { text: 'Não, voltar', role: 'cancel' },
        {
          text: 'Sim, apagar tudo',
          role: 'destructive',
          handler: async () => {
            await this.pousadaService.limparTudo();
            this.config = await this.pousadaService.getConfig();
            await this.carregarUltimoBackup();
            await this.mostrarToast('Todos os dados foram apagados.');
          },
        },
      ],
    });
    await alert.present();
  }

  private async mostrarToast(mensagem: string, cor: string = 'success'): Promise<void> {
    const toast = await this.toastCtrl.create({ message: mensagem, duration: 2500, color: cor, position: 'bottom' });
    await toast.present();
  }
}
