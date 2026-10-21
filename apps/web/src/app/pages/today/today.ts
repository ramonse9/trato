import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { RouterLink } from '@angular/router';
import { firstValueFrom, Subscription } from 'rxjs';
import { FollowUpStatusBadge } from '../../components/follow-up-status/follow-up-status';
import { ProjectContextService } from '../../core/project-context.service';
import { RecordsService } from '../../core/records.service';
import { TodayService } from '../../core/today.service';
import { taskTypeLabel } from '../../models/commercial-record';
import { TodayDashboard, TodayTask } from '../../models/today-dashboard';

@Component({
  selector: 'app-today',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    RouterLink,
    FollowUpStatusBadge,
  ],
  templateUrl: './today.html',
  styleUrl: './today.scss',
})
export class Today {
  private readonly todayApi = inject(TodayService);
  private readonly recordsApi = inject(RecordsService);
  readonly context = inject(ProjectContextService);
  private request?: Subscription;
  private requestGeneration = 0;
  private actionRequestId = crypto.randomUUID();

  readonly dashboard = signal<TodayDashboard | null>(null);
  readonly loading = signal(true);
  readonly loadError = signal(false);
  readonly busy = signal(false);
  readonly actionTask = signal<TodayTask | null>(null);
  readonly actionMode = signal<'complete' | 'reschedule' | null>(null);
  readonly message = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly sections = computed(() => {
    const dashboard = this.dashboard();
    if (!dashboard) return [];
    return [
      {
        key: 'overdue',
        title: 'Tareas vencidas',
        description: 'Requieren atención inmediata.',
        empty: 'No hay tareas vencidas.',
        tasks: dashboard.vencidas,
      },
      {
        key: 'today',
        title: 'Tareas de hoy',
        description: 'Acciones con vencimiento en la fecha local del proyecto.',
        empty: 'No hay tareas para hoy.',
        tasks: dashboard.hoy,
      },
      {
        key: 'upcoming',
        title: 'Próximos tres días',
        description: 'Desde mañana hasta el tercer día de calendario.',
        empty: 'No hay tareas en los próximos tres días.',
        tasks: dashboard.proximosTresDias,
      },
    ];
  });
  readonly completeForm = new FormGroup({
    resultado: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(4000)],
    }),
  });
  readonly rescheduleForm = new FormGroup({
    fechaVencimiento: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });

  constructor() {
    effect((onCleanup) => {
      this.context.activeProject();
      this.context.revision();
      untracked(() => {
        this.resetState();
        this.load();
      });
      onCleanup(() => this.cancelRequest());
    });
  }

  startComplete(task: TodayTask): void {
    this.actionRequestId = crypto.randomUUID();
    this.actionTask.set(task);
    this.actionMode.set('complete');
    this.completeForm.reset({ resultado: '' });
    this.errorMessage.set(null);
  }

  startReschedule(task: TodayTask): void {
    this.actionRequestId = crypto.randomUUID();
    this.actionTask.set(task);
    this.actionMode.set('reschedule');
    this.rescheduleForm.reset({ fechaVencimiento: task.fechaVencimiento });
    this.errorMessage.set(null);
  }

  cancelAction(): void {
    if (this.busy()) return;
    this.actionTask.set(null);
    this.actionMode.set(null);
    this.errorMessage.set(null);
  }

  async complete(): Promise<void> {
    const task = this.actionTask();
    const scope = this.context.captureScope();
    if (!task || !scope || this.busy() || this.completeForm.invalid) return;
    this.busy.set(true);
    this.errorMessage.set(null);
    try {
      await firstValueFrom(
        this.recordsApi.completeTask(scope.projectId, task.registro.id, task.id, {
          solicitudId: this.actionRequestId,
          resultado: this.completeForm.controls.resultado.value || null,
        }),
      );
      if (!this.context.isCurrent(scope)) return;
      this.actionTask.set(null);
      this.actionMode.set(null);
      this.message.set('Seguimiento completado.');
      this.load(true);
    } catch {
      if (this.context.isCurrent(scope)) {
        this.errorMessage.set('No fue posible completar la tarea. Puedes reintentarlo.');
        this.busy.set(false);
      }
    }
  }

  async reschedule(): Promise<void> {
    const task = this.actionTask();
    const scope = this.context.captureScope();
    if (!task || !scope || this.busy() || this.rescheduleForm.invalid) {
      this.rescheduleForm.markAllAsTouched();
      return;
    }
    this.busy.set(true);
    this.errorMessage.set(null);
    try {
      await firstValueFrom(
        this.recordsApi.updateTask(scope.projectId, task.registro.id, task.id, {
          solicitudId: this.actionRequestId,
          fechaVencimiento: this.rescheduleForm.controls.fechaVencimiento.value,
        }),
      );
      if (!this.context.isCurrent(scope)) return;
      this.actionTask.set(null);
      this.actionMode.set(null);
      this.message.set('Seguimiento reprogramado.');
      this.load(true);
    } catch {
      if (this.context.isCurrent(scope)) {
        this.errorMessage.set('No fue posible reprogramar la tarea. Puedes reintentarlo.');
        this.busy.set(false);
      }
    }
  }

  retry(): void {
    this.load();
  }

  taskType(type: TodayTask['tipo']): string {
    return taskTypeLabel(type);
  }

  calendarDate(value: string): string {
    return new Intl.DateTimeFormat('es-MX', {
      timeZone: 'UTC',
      dateStyle: 'medium',
    }).format(new Date(`${value}T00:00:00Z`));
  }

  private load(preserveMessage = false): void {
    const scope = this.context.captureScope();
    if (!scope) return;
    const generation = ++this.requestGeneration;
    this.cancelRequest();
    this.loading.set(true);
    this.loadError.set(false);
    this.errorMessage.set(null);
    if (!preserveMessage) this.message.set(null);
    this.request = this.todayApi.get(scope.projectId).subscribe({
      next: (dashboard) => {
        if (!this.context.isCurrent(scope) || generation !== this.requestGeneration) return;
        this.dashboard.set(dashboard);
        this.loading.set(false);
        this.busy.set(false);
      },
      error: () => {
        if (!this.context.isCurrent(scope) || generation !== this.requestGeneration) return;
        this.dashboard.set(null);
        this.loadError.set(true);
        this.loading.set(false);
        this.busy.set(false);
      },
    });
  }

  private resetState(): void {
    this.cancelRequest();
    this.requestGeneration += 1;
    this.dashboard.set(null);
    this.loading.set(true);
    this.loadError.set(false);
    this.busy.set(false);
    this.actionTask.set(null);
    this.actionMode.set(null);
    this.message.set(null);
    this.errorMessage.set(null);
  }

  private cancelRequest(): void {
    this.request?.unsubscribe();
    this.request = undefined;
  }
}
