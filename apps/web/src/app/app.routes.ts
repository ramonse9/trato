import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';
import { projectGuard, workspaceEntryGuard } from './core/project.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login').then((module) => module.Login),
    title: 'Iniciar sesión | Trato',
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/shell/shell').then((module) => module.Shell),
    children: [
      {
        path: '',
        pathMatch: 'full',
        canActivate: [workspaceEntryGuard],
        loadComponent: () =>
          import('./pages/project-entry/project-entry').then((module) => module.ProjectEntry),
      },
      {
        path: 'projects',
        loadComponent: () => import('./pages/projects/projects').then((module) => module.Projects),
        title: 'Proyectos | Trato',
      },
      {
        path: 'p/:projectId',
        canActivate: [projectGuard],
        children: [
          { path: '', pathMatch: 'full', redirectTo: 'today' },
          {
            path: 'today',
            loadComponent: () =>
              import('./pages/project-section/project-section').then(
                (module) => module.ProjectSection,
              ),
            data: {
              eyebrow: 'Resumen del proyecto',
              title: 'Hoy',
              emptyTitle: 'Todo listo para organizar el día',
              emptyDescription:
                'Los pendientes y el semáforo aparecerán aquí en una etapa posterior.',
            },
            title: 'Hoy | Trato',
          },
          {
            path: 'records/new',
            loadComponent: () =>
              import('./pages/record-create/record-create').then((module) => module.RecordCreate),
            title: 'Nuevo prospecto | Trato',
          },
          {
            path: 'records/:recordId',
            loadComponent: () =>
              import('./pages/record-detail/record-detail').then((module) => module.RecordDetail),
            title: 'Ficha comercial | Trato',
          },
          {
            path: 'records',
            loadComponent: () => import('./pages/records/records').then((module) => module.Records),
            title: 'Prospectos y clientes | Trato',
          },
          {
            path: 'follow-ups',
            loadComponent: () =>
              import('./pages/project-section/project-section').then(
                (module) => module.ProjectSection,
              ),
            data: {
              eyebrow: 'Actividad del proyecto',
              title: 'Seguimientos',
              emptyTitle: 'Historial y próximas acciones',
              emptyDescription:
                'Las llamadas, visitas y tareas se mostrarán aquí sin mezclar otros proyectos.',
            },
            title: 'Seguimientos | Trato',
          },
          {
            path: 'settings',
            loadComponent: () =>
              import('./pages/project-settings/project-settings').then(
                (module) => module.ProjectSettings,
              ),
            title: 'Configuración del proyecto | Trato',
          },
        ],
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
