import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login').then((module) => module.Login),
    title: 'Iniciar sesión | Trato',
  },
  {
    path: '',
    loadComponent: () => import('./pages/home/home').then((module) => module.Home),
    canActivate: [authGuard],
    title: 'Proyectos | Trato',
  },
  { path: '**', redirectTo: '' },
];
