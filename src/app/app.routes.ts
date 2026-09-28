import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'entrar',
    pathMatch: 'full',
  },
  {
    path: 'entrar',
    loadComponent: () => import('./pages/entrar/entrar.page').then((m) => m.EntrarPage),
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./pages/dashboard/dashboard.page').then((m) => m.DashboardPage),
  },
  {
    path: 'reservas',
    loadComponent: () => import('./pages/reservas/reserva-list.page').then((m) => m.ReservaListPage),
  },
  {
    path: 'disponibilidade',
    loadComponent: () => import('./pages/disponibilidade/disponibilidade.page').then((m) => m.DisponibilidadePage),
  },
  {
    path: 'hospedes',
    loadComponent: () => import('./pages/hospedes/hospede-list.page').then((m) => m.HospedeListPage),
  },
  {
    path: 'suites',
    loadComponent: () => import('./pages/suites/suite-list.page').then((m) => m.SuiteListPage),
  },
  {
    path: 'financeiro',
    loadComponent: () => import('./pages/financeiro/financeiro.page').then((m) => m.FinanceiroPage),
  },
  {
    path: 'configuracoes',
    loadComponent: () => import('./pages/configuracoes/configuracoes.page').then((m) => m.ConfiguracoesPage),
  },
  {
    path: '**',
    redirectTo: 'entrar',
  },
];
