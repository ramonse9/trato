import { HttpErrorResponse } from '@angular/common/http';
import { Component, effect, inject, signal, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom, map, Subscription } from 'rxjs';
import { FollowUpStatusBadge } from '../../components/follow-up-status/follow-up-status';
import { ProjectContextService } from '../../core/project-context.service';
import { RecordsService } from '../../core/records.service';
import {
  COMMERCIAL_STAGES,
  CommercialRecordDetail,
  CommercialStage,
  INTEREST_LEVELS,
  InterestLevel,
  stageLabel,
} from '../../models/commercial-record';
import { FollowUpPanel } from './follow-up-panel';

@Component({
  selector: 'app-record-detail',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    FollowUpPanel,
    FollowUpStatusBadge,
    RouterLink,
  ],
  templateUrl: './record-detail.html',
  styleUrl: './record-detail.scss',
})
export class RecordDetail {
  private readonly api = inject(RecordsService);
  private readonly route = inject(ActivatedRoute);
  readonly context = inject(ProjectContextService);
  private readonly recordId = toSignal(
    this.route.paramMap.pipe(map((params) => params.get('recordId'))),
    { initialValue: this.route.snapshot.paramMap.get('recordId') },
  );
  private request?: Subscription;
  private loadGeneration = 0;

  readonly stages = COMMERCIAL_STAGES;
  readonly interests = INTEREST_LEVELS;
  readonly record = signal<CommercialRecordDetail | null>(null);
  readonly loading = signal(true);
  readonly loadError = signal(false);
  readonly saving = signal(false);
  readonly actionBusy = signal(false);
  readonly confirmArchive = signal(false);
  readonly message = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly form = new FormGroup({
    nombreNegocio: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(180)],
    }),
    nombreEncargado: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(160)],
    }),
    telefono: new FormControl('', {
      nonNullable: true,
      validators: [Validators.pattern(/^\+[1-9]\d{7,14}$/), Validators.maxLength(16)],
    }),
    correo: new FormControl('', {
      nonNullable: true,
      validators: [Validators.email, Validators.maxLength(254)],
    }),
    direccion: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(1000)],
    }),
    etapa: new FormControl<CommercialStage>('POR_CONTACTAR', { nonNullable: true }),
    nivelInteres: new FormControl<InterestLevel>('SIN_EVALUAR', { nonNullable: true }),
    notasGenerales: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(10000)],
    }),
    motivoDescarte: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(2000)],
    }),
  });

  constructor() {
    effect((onCleanup) => {
      this.context.revision();
      const id = this.recordId();
      untracked(() => {
        this.resetState();
        if (id) this.load(id);
      });
      onCleanup(() => this.cancelRequest());
    });
  }

  async save(): Promise<void> {
    const current = this.record();
    const scope = this.context.captureScope();
    if (!current || !scope || current.archivadoEn || this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.message.set(null);
    this.errorMessage.set(null);
    const values = this.form.getRawValue();
    try {
      await firstValueFrom(
        this.api.update(scope.projectId, current.id, {
          nombreNegocio: values.nombreNegocio,
          nombreEncargado: values.nombreEncargado || null,
          telefono: values.telefono || null,
          correo: values.correo || null,
          direccion: values.direccion || null,
          etapa: values.etapa,
          nivelInteres: values.nivelInteres,
          notasGenerales: values.notasGenerales || null,
          motivoDescarte: values.etapa === 'DESCARTADO' ? values.motivoDescarte || null : null,
        }),
      );
      if (this.isCurrent(scope.projectId, current.id, scope.revision)) {
        this.message.set('Ficha actualizada.');
        this.saving.set(false);
        this.load(current.id, true);
      }
    } catch (error) {
      if (this.isCurrent(scope.projectId, current.id, scope.revision)) {
        this.errorMessage.set(this.saveError(error));
        this.saving.set(false);
      }
    }
  }

  async archive(): Promise<void> {
    const current = this.record();
    const scope = this.context.captureScope();
    if (!current || !scope || this.actionBusy()) return;
    this.actionBusy.set(true);
    this.errorMessage.set(null);
    try {
      await firstValueFrom(this.api.archive(scope.projectId, current.id));
      if (this.isCurrent(scope.projectId, current.id, scope.revision)) {
        this.confirmArchive.set(false);
        this.load(current.id, true);
      }
    } catch {
      if (this.isCurrent(scope.projectId, current.id, scope.revision)) {
        this.errorMessage.set('No fue posible archivar el registro.');
        this.actionBusy.set(false);
      }
    }
  }

  async restore(): Promise<void> {
    const current = this.record();
    const scope = this.context.captureScope();
    if (!current || !scope || this.actionBusy()) return;
    this.actionBusy.set(true);
    this.errorMessage.set(null);
    try {
      await firstValueFrom(this.api.restore(scope.projectId, current.id));
      if (this.isCurrent(scope.projectId, current.id, scope.revision)) {
        this.message.set('Registro restaurado.');
        this.load(current.id, true);
      }
    } catch {
      if (this.isCurrent(scope.projectId, current.id, scope.revision)) {
        this.errorMessage.set('No fue posible restaurar el registro.');
        this.actionBusy.set(false);
      }
    }
  }

  retry(): void {
    const id = this.recordId();
    if (id) this.load(id);
  }

  reloadAfterFollowUp(message: string): void {
    const id = this.recordId();
    if (!id) return;
    this.message.set(message);
    this.load(id, true);
  }

  stage(value: CommercialStage): string {
    return stageLabel(value);
  }

  private load(recordId: string, preserveMessage = false): void {
    const scope = this.context.captureScope();
    if (!scope) return;
    const generation = ++this.loadGeneration;
    this.cancelRequest();
    this.loading.set(true);
    this.loadError.set(false);
    this.errorMessage.set(null);
    if (!preserveMessage) this.message.set(null);

    this.request = this.api.get(scope.projectId, recordId).subscribe({
      next: (record) => {
        if (!this.isCurrent(scope.projectId, recordId, scope.revision)) return;
        if (generation !== this.loadGeneration) return;
        this.record.set(record);
        this.populateForm(record);
        this.loading.set(false);
        this.saving.set(false);
        this.actionBusy.set(false);
      },
      error: () => {
        if (!this.isCurrent(scope.projectId, recordId, scope.revision)) return;
        if (generation !== this.loadGeneration) return;
        this.record.set(null);
        this.loadError.set(true);
        this.loading.set(false);
        this.saving.set(false);
        this.actionBusy.set(false);
      },
    });
  }

  private populateForm(record: CommercialRecordDetail): void {
    this.form.reset({
      nombreNegocio: record.nombreNegocio,
      nombreEncargado: record.nombreEncargado ?? '',
      telefono: record.telefono ?? '',
      correo: record.correo ?? '',
      direccion: record.direccion ?? '',
      etapa: record.etapa,
      nivelInteres: record.nivelInteres,
      notasGenerales: record.notasGenerales ?? '',
      motivoDescarte: record.motivoDescarte ?? '',
    });
    if (record.archivadoEn) this.form.disable({ emitEvent: false });
    else this.form.enable({ emitEvent: false });
  }

  private resetState(): void {
    this.cancelRequest();
    this.loadGeneration += 1;
    this.record.set(null);
    this.form.reset({
      nombreNegocio: '',
      nombreEncargado: '',
      telefono: '',
      correo: '',
      direccion: '',
      etapa: 'POR_CONTACTAR',
      nivelInteres: 'SIN_EVALUAR',
      notasGenerales: '',
      motivoDescarte: '',
    });
    this.form.enable({ emitEvent: false });
    this.loading.set(true);
    this.loadError.set(false);
    this.saving.set(false);
    this.actionBusy.set(false);
    this.confirmArchive.set(false);
    this.message.set(null);
    this.errorMessage.set(null);
  }

  private isCurrent(projectId: string, recordId: string, revision: number): boolean {
    return (
      this.context.activeProject()?.id === projectId &&
      this.context.revision() === revision &&
      this.recordId() === recordId
    );
  }

  private saveError(error: unknown): string {
    return error instanceof HttpErrorResponse && error.status === 400
      ? 'Revisa los datos de la ficha. El teléfono debe incluir código de país, por ejemplo +526691234567.'
      : 'No fue posible guardar los cambios.';
  }

  private cancelRequest(): void {
    this.request?.unsubscribe();
    this.request = undefined;
  }
}
