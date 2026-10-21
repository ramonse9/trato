import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ProjectSummary } from '../models/project';
import { AuthService } from './auth.service';
import { ProjectContextService } from './project-context.service';

const user = signal({ id: 'user-1', nombre: 'Prueba', correo: 'prueba@local.test' });

function project(id: string, nombre: string): ProjectSummary {
  return {
    id,
    nombre,
    descripcion: null,
    archivadoEn: null,
    creadoEn: '2026-10-21T00:00:00.000Z',
    actualizadoEn: '2026-10-21T00:00:00.000Z',
    _count: { registros: 0 },
  };
}

describe('ProjectContextService', () => {
  let service: ProjectContextService;
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { user: user.asReadonly() } },
      ],
    });
    service = TestBed.inject(ProjectContextService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('recupera el último proyecto solo si continúa disponible', async () => {
    localStorage.setItem('trato:last-project:user-1', 'project-b');
    const initialization = service.initialize();
    http
      .expectOne('/api/projects')
      .flush([project('project-a', 'Proyecto A'), project('project-b', 'Proyecto B')]);
    http.expectOne('/api/projects/archived').flush([]);
    await initialization;

    expect(service.activeProject()?.id).toBe('project-b');

    service.reset();
    localStorage.setItem('trato:last-project:user-1', 'project-inexistente');
    const reload = service.initialize();
    http.expectOne('/api/projects').flush([project('project-a', 'Proyecto A')]);
    http.expectOne('/api/projects/archived').flush([]);
    await reload;

    expect(service.activeProject()?.id).toBe('project-a');
    expect(localStorage.getItem('trato:last-project:user-1')).toBe('project-a');
  });

  it('ignora una respuesta tardía del proyecto anterior', async () => {
    const initialization = service.initialize();
    http
      .expectOne('/api/projects')
      .flush([project('project-a', 'Proyecto A'), project('project-b', 'Proyecto B')]);
    http.expectOne('/api/projects/archived').flush([]);
    await initialization;

    service.selectProject('project-a');
    const update = service.updateActiveProject({
      nombre: 'Proyecto A editado',
      descripcion: null,
    });
    service.selectProject('project-b');
    http.expectOne('/api/projects/project-a').flush(project('project-a', 'Proyecto A editado'));
    await update;

    expect(service.activeProject()?.id).toBe('project-b');
    expect(service.activeProject()?.nombre).toBe('Proyecto B');
  });
});
