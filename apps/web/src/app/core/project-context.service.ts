import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { firstValueFrom, forkJoin } from 'rxjs';
import { ProjectInput, ProjectScope, ProjectSummary } from '../models/project';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class ProjectContextService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly document = inject(DOCUMENT);
  private readonly activeList = signal<ProjectSummary[]>([]);
  private readonly archivedList = signal<ProjectSummary[]>([]);
  private readonly selected = signal<ProjectSummary | null>(null);
  private readonly contextRevision = signal(0);
  private loadPromise?: Promise<boolean>;
  private loadGeneration = 0;
  private loadedOnce = false;

  readonly projects = this.activeList.asReadonly();
  readonly archivedProjects = this.archivedList.asReadonly();
  readonly activeProject = this.selected.asReadonly();
  readonly revision = this.contextRevision.asReadonly();
  readonly loading = signal(false);
  readonly loadError = signal(false);
  readonly hasProjects = computed(() => this.activeList().length > 0);

  initialize(force = false): Promise<boolean> {
    if (this.loadPromise && !force) return this.loadPromise;
    if (!force && this.loadedOnce) return Promise.resolve(true);

    const generation = ++this.loadGeneration;
    this.loading.set(true);
    this.loadError.set(false);
    const request = firstValueFrom(
      forkJoin({
        active: this.http.get<ProjectSummary[]>('/api/projects'),
        archived: this.http.get<ProjectSummary[]>('/api/projects/archived'),
      }),
    )
      .then(({ active, archived }) => {
        if (generation !== this.loadGeneration) return false;
        this.activeList.set(active);
        this.archivedList.set(archived);
        this.reconcileSelection(active);
        this.loadedOnce = true;
        return true;
      })
      .catch(() => {
        if (generation === this.loadGeneration) {
          this.activeList.set([]);
          this.archivedList.set([]);
          this.setActive(null);
          this.loadError.set(true);
        }
        return false;
      })
      .finally(() => {
        if (generation === this.loadGeneration) this.loading.set(false);
        if (this.loadPromise === request) this.loadPromise = undefined;
      });

    this.loadPromise = request;
    return request;
  }

  selectProject(projectId: string): boolean {
    const project = this.activeList().find((item) => item.id === projectId);
    if (!project) return false;
    this.setActive(project);
    return true;
  }

  async createProject(input: ProjectInput): Promise<ProjectSummary> {
    const project = await firstValueFrom(this.http.post<ProjectSummary>('/api/projects', input));
    await this.initialize(true);
    this.selectProject(project.id);
    return project;
  }

  async updateActiveProject(input: ProjectInput): Promise<ProjectSummary> {
    const scope = this.captureScope();
    if (!scope) throw new Error('No hay un proyecto activo.');

    const project = await firstValueFrom(
      this.http.patch<ProjectSummary>(`/api/projects/${scope.projectId}`, input),
    );
    if (this.isCurrent(scope)) {
      this.activeList.update((items) =>
        items
          .map((item) => (item.id === project.id ? project : item))
          .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')),
      );
      this.selected.set(project);
    }
    return project;
  }

  async archiveProject(projectId: string): Promise<void> {
    await firstValueFrom(this.http.post<ProjectSummary>(`/api/projects/${projectId}/archive`, {}));
    await this.initialize(true);
  }

  async restoreProject(projectId: string): Promise<void> {
    await firstValueFrom(this.http.post<ProjectSummary>(`/api/projects/${projectId}/restore`, {}));
    await this.initialize(true);
  }

  captureScope(): ProjectScope | null {
    const project = this.selected();
    return project ? { projectId: project.id, revision: this.contextRevision() } : null;
  }

  isCurrent(scope: ProjectScope): boolean {
    return this.selected()?.id === scope.projectId && this.contextRevision() === scope.revision;
  }

  reset(): void {
    this.loadGeneration += 1;
    this.loadPromise = undefined;
    this.loadedOnce = false;
    this.activeList.set([]);
    this.archivedList.set([]);
    this.setActive(null);
    this.loading.set(false);
    this.loadError.set(false);
  }

  private reconcileSelection(projects: ProjectSummary[]): void {
    const currentId = this.selected()?.id;
    const storedId = this.readStoredProjectId();
    const project =
      projects.find((item) => item.id === currentId) ??
      projects.find((item) => item.id === storedId) ??
      projects[0] ??
      null;
    this.setActive(project);
  }

  private setActive(project: ProjectSummary | null): void {
    if (this.selected()?.id !== project?.id) {
      this.contextRevision.update((value) => value + 1);
    }
    this.selected.set(project);
    this.writeStoredProjectId(project?.id ?? null);
  }

  private storageKey(): string | null {
    const userId = this.auth.user()?.id;
    return userId ? `trato:last-project:${userId}` : null;
  }

  private readStoredProjectId(): string | null {
    const key = this.storageKey();
    if (!key) return null;
    try {
      return this.document.defaultView?.localStorage.getItem(key) ?? null;
    } catch {
      return null;
    }
  }

  private writeStoredProjectId(projectId: string | null): void {
    const key = this.storageKey();
    if (!key) return;
    try {
      if (projectId) this.document.defaultView?.localStorage.setItem(key, projectId);
      else this.document.defaultView?.localStorage.removeItem(key);
    } catch {
      // La aplicación sigue funcionando si el navegador bloquea el almacenamiento.
    }
  }
}
