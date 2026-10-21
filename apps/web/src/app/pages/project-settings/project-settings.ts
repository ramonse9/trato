import { HttpErrorResponse } from '@angular/common/http';
import { Component, effect, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Router } from '@angular/router';
import { ProjectContextService } from '../../core/project-context.service';

@Component({
  selector: 'app-project-settings',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  templateUrl: './project-settings.html',
  styleUrl: './project-settings.scss',
})
export class ProjectSettings {
  private readonly router = inject(Router);
  readonly context = inject(ProjectContextService);
  readonly saving = signal(false);
  readonly archiving = signal(false);
  readonly confirmArchive = signal(false);
  readonly message = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly form = new FormGroup({
    nombre: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(160)],
    }),
    descripcion: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(2000)],
    }),
  });

  constructor() {
    effect(() => {
      const project = this.context.activeProject();
      this.context.revision();
      this.form.reset({
        nombre: project?.nombre ?? '',
        descripcion: project?.descripcion ?? '',
      });
      this.message.set(null);
      this.errorMessage.set(null);
      this.confirmArchive.set(false);
      this.saving.set(false);
      this.archiving.set(false);
    });
  }

  async save(): Promise<void> {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }

    const scope = this.context.captureScope();
    if (!scope) return;
    this.saving.set(true);
    this.message.set(null);
    this.errorMessage.set(null);
    try {
      await this.context.updateActiveProject({
        nombre: this.form.controls.nombre.value,
        descripcion: this.form.controls.descripcion.value || null,
      });
      if (this.context.isCurrent(scope)) {
        this.message.set('Cambios guardados.');
      }
    } catch (error) {
      if (this.context.isCurrent(scope)) {
        this.errorMessage.set(this.messageFor(error));
      }
    } finally {
      if (this.context.isCurrent(scope)) this.saving.set(false);
    }
  }

  async archive(): Promise<void> {
    const scope = this.context.captureScope();
    if (!scope || this.archiving()) return;
    this.archiving.set(true);
    this.errorMessage.set(null);
    try {
      await this.context.archiveProject(scope.projectId);
      const next = this.context.activeProject();
      await this.router.navigate(next ? ['/p', next.id, 'today'] : ['/projects']);
    } catch {
      if (this.context.isCurrent(scope)) {
        this.errorMessage.set('No fue posible archivar el proyecto.');
        this.archiving.set(false);
      }
    }
  }

  private messageFor(error: unknown): string {
    return error instanceof HttpErrorResponse && error.status === 409
      ? 'Ya existe un proyecto con ese nombre.'
      : 'No fue posible guardar los cambios.';
  }
}
