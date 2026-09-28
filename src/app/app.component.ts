import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import {
  IonApp,
  IonSplitPane,
  IonMenu,
  IonHeader,
  IonToolbar,
  IonContent,
  IonList,
  IonMenuToggle,
  IonItem,
  IonIcon,
  IonLabel,
  IonRouterOutlet,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  homeOutline,
  homeSharp,
  bedOutline,
  bedSharp,
  peopleOutline,
  peopleSharp,
  calendarOutline,
  calendarSharp,
  walletOutline,
  walletSharp,
  searchOutline,
  searchSharp,
  settingsOutline,
  settingsSharp,
  logOutOutline,
} from 'ionicons/icons';

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  imports: [
    RouterLink,
    RouterLinkActive,
    IonApp,
    IonSplitPane,
    IonMenu,
    IonHeader,
    IonToolbar,
    IonContent,
    IonList,
    IonMenuToggle,
    IonItem,
    IonIcon,
    IonLabel,
    IonRouterOutlet,
  ],
})
export class AppComponent {
  protected readonly appPages = [
    { title: 'Início', url: '/dashboard', icon: 'home' },
    { title: 'Reservas', url: '/reservas', icon: 'calendar' },
    { title: 'Consultar vagas', url: '/disponibilidade', icon: 'search' },
    { title: 'Hóspedes', url: '/hospedes', icon: 'people' },
    { title: 'Suítes', url: '/suites', icon: 'bed' },
    { title: 'Caixa', url: '/financeiro', icon: 'wallet' },
    { title: 'Ajustes', url: '/configuracoes', icon: 'settings' },
  ];

  constructor() {
    addIcons({
      homeOutline,
      homeSharp,
      bedOutline,
      bedSharp,
      peopleOutline,
      peopleSharp,
      calendarOutline,
      calendarSharp,
      walletOutline,
      walletSharp,
      searchOutline,
      searchSharp,
      settingsOutline,
      settingsSharp,
      logOutOutline,
    });
  }
}
