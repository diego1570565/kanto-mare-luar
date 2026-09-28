import { ChangeDetectionStrategy, Component } from '@angular/core';
import { IonContent, IonButton, IonIcon, MenuController, NavController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { arrowForwardOutline } from 'ionicons/icons';

import { PousadaService } from '../../services/pousada.service';

/** Tela de boas-vindas: sem usuário e senha, só o botão de entrar. */
@Component({
  selector: 'app-entrar',
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: 'entrar.page.html',
  styleUrls: ['entrar.page.scss'],
  imports: [IonContent, IonButton, IonIcon],
})
export class EntrarPage {
  nomePousada = 'Kanto Maré & Luar';
  saudacao = '';

  constructor(
    private menuCtrl: MenuController,
    private navCtrl: NavController,
    private pousadaService: PousadaService,
  ) {
    addIcons({ arrowForwardOutline });
  }

  async ionViewWillEnter(): Promise<void> {
    await this.menuCtrl.enable(false);
    const hora = new Date().getHours();
    this.saudacao = hora < 12 ? 'Bom dia!' : hora < 18 ? 'Boa tarde!' : 'Boa noite!';
    this.nomePousada = (await this.pousadaService.getConfig()).nome || this.nomePousada;
  }

  async ionViewWillLeave(): Promise<void> {
    await this.menuCtrl.enable(true);
  }

  entrar(): void {
    this.navCtrl.navigateRoot('/dashboard', { animationDirection: 'forward' });
  }
}
