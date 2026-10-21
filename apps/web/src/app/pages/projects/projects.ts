import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Router } from '@angular/router';
import { ProjectContextService } from '../../core/project-context.service';

@Component({
  selector: 'app-projects',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  templateUrl: './projects.html',
  styleUrl: './projects.scss',
})
export class Projects implements OnInit {
  private readonly router = inject(Router);
  readonly context = inject(ProjectContextService);
  readonly saving = signal(false);
  readonly restoringId = signal<string | null>(null);
  readonly formError = signal<string | null>(null);
  readonly actionError = signal<string | null>(null);
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

  ngOnInit(): void {
    void this.context.initialize();
  }

  async createProject(): Promise<void> {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.formError.set(null);
    try {
      const project = await this.context.createProject({
        nombre: this.form.controls.nombre.value,
        descripcion: this.form.controls.descripcion.value || null,
      });
      this.form.reset({ nombre: '', descripcion: '' });
      await this.router.navigate(['/p', project.id, 'settings']);
    } catch (error) {
      this.formError.set(this.messageFor(error));
    } finally {
      this.saving.set(false);
    }
  }

  async openProject(projectId: string, section = 'today'): Promise<void> {
    if (!this.context.selectProject(projectId)) return;
    await this.router.navigate(['/p', projectId, section]);
  }

  async restoreProject(projectId: string): Promise<void> {
    if (this.restoringId()) return;
    this.restoringId.set(projectId);
    this.actionError.set(null);
    try {
      await this.context.restoreProject(projectId);
    } catch {
      this.actionError.set('No fue posible restaurar el proyecto. Intenta de nuevo.');
    } finally {
      this.restoringId.set(null);
    }
  }

  retry(): void {
    void this.context.initialize(true);
  }

  private messageFor(error: unknown): string {
    if (error instanceof HttpErrorResponse && error.status === 409) {
      return 'Ya existe un proyecto con ese nombre.';
    }
    return 'No fue posible guardar el proyecto. Intenta de nuevo.';
  }
}
