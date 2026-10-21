import { HttpErrorResponse } from '@angular/common/http';
import { Component, effect, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ProjectContextService } from '../../core/project-context.service';
import { RecordsService } from '../../core/records.service';

@Component({
  selector: 'app-record-create',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    RouterLink,
  ],
  templateUrl: './record-create.html',
  styleUrl: './record-create.scss',
})
export class RecordCreate {
  private readonly api = inject(RecordsService);
  private readonly router = inject(Router);
  readonly context = inject(ProjectContextService);
  readonly saving = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly form = new FormGroup({
    nombreNegocio: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(180)],
    }),
  });

  constructor() {
    effect(() => {
      this.context.revision();
      this.form.reset({ nombreNegocio: '' });
      this.saving.set(false);
      this.errorMessage.set(null);
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
    this.errorMessage.set(null);
    try {
      const record = await firstValueFrom(
        this.api.create(scope.projectId, this.form.controls.nombreNegocio.value),
      );
      if (this.context.isCurrent(scope)) {
        await this.router.navigate(['/p', scope.projectId, 'records', record.id]);
      }
    } catch (error) {
      if (this.context.isCurrent(scope)) {
        this.errorMessage.set(
          error instanceof HttpErrorResponse && error.status === 400
            ? 'Revisa el nombre del negocio.'
            : 'No fue posible crear el prospecto.',
        );
        this.saving.set(false);
      }
    }
  }
}
