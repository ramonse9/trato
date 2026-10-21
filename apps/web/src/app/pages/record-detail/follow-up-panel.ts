import { Component, computed, inject, input, output, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { firstValueFrom } from 'rxjs';
import { ProjectContextService } from '../../core/project-context.service';
import { RecordsService } from '../../core/records.service';
import {
  ActivityType,
  activityTypeLabel,
  CommercialRecordDetail,
  FollowUpTask,
  TaskInput,
  TaskType,
  taskTypeLabel,
} from '../../models/commercial-record';
import {
  addCalendarDays,
  addCalendarMonth,
  calendarToday,
  dateTimeNow,
  mazatlanDateTimeToIso,
} from './date-shortcuts';

interface NextActionPreset {
  value: string;
  label: string;
  description: string;
  type: TaskType;
}

@Component({
  selector: 'app-follow-up-panel',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
  ],
  templateUrl: './follow-up-panel.html',
  styleUrl: './follow-up-panel.scss',
})
export class FollowUpPanel {
  private readonly api = inject(RecordsService);
  private readonly context = inject(ProjectContextService);

  readonly record = input.required<CommercialRecordDetail>();
  readonly changed = output<string>();
  readonly busy = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly showActivityForm = signal(false);
  readonly showTaskForm = signal(false);
  readonly editingTaskId = signal<string | null>(null);
  readonly completingTaskId = signal<string | null>(null);

  readonly activityTypes: ReadonlyArray<{ value: ActivityType; label: string }> = [
    { value: 'LLAMADA', label: 'Llamada' },
    { value: 'WHATSAPP', label: 'WhatsApp' },
    { value: 'VISITA', label: 'Visita' },
    { value: 'DEMO', label: 'Demo' },
    { value: 'NOTA', label: 'Nota' },
  ];
  readonly taskTypes: ReadonlyArray<{ value: TaskType; label: string }> = [
    { value: 'LLAMADA', label: 'Llamada' },
    { value: 'WHATSAPP', label: 'WhatsApp' },
    { value: 'VISITA', label: 'Visita' },
    { value: 'DEMO', label: 'Demo' },
    { value: 'ENVIAR_PROPUESTA', label: 'Enviar propuesta' },
    { value: 'OTRO', label: 'Otra acción' },
  ];
  readonly presets: ReadonlyArray<NextActionPreset> = [
    {
      value: 'PEDIR_RESPUESTA',
      label: 'Pedir respuesta',
      description: 'Pedir respuesta',
      type: 'WHATSAPP',
    },
    {
      value: 'CONTACTAR_ENCARGADO',
      label: 'Contactar al encargado',
      description: 'Contactar al encargado',
      type: 'LLAMADA',
    },
    {
      value: 'DEMO',
      label: 'Agendar o realizar demo',
      description: 'Agendar o realizar demo',
      type: 'DEMO',
    },
    {
      value: 'PROPUESTA',
      label: 'Enviar propuesta',
      description: 'Enviar propuesta',
      type: 'ENVIAR_PROPUESTA',
    },
    {
      value: 'VISITAR',
      label: 'Volver a visitar',
      description: 'Volver a visitar',
      type: 'VISITA',
    },
    { value: 'OTRA', label: 'Otra acción', description: '', type: 'OTRO' },
  ];

  readonly pendingTasks = computed(() =>
    this.record().tareasSeguimiento.filter((task) => task.estado === 'PENDIENTE'),
  );
  readonly completedTasks = computed(() =>
    this.record().tareasSeguimiento.filter((task) => task.estado === 'COMPLETADA'),
  );
  readonly showMissingFollowUp = computed(() => {
    const current = this.record();
    return (
      !current.archivadoEn &&
      current.etapa !== 'CLIENTE' &&
      current.etapa !== 'DESCARTADO' &&
      this.pendingTasks().length === 0
    );
  });

  readonly activityForm = new FormGroup({
    tipo: new FormControl<ActivityType>('LLAMADA', { nonNullable: true }),
    ocurridaEn: new FormControl(dateTimeNow(), {
      nonNullable: true,
      validators: [Validators.required],
    }),
    resumen: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(4000)],
    }),
    resultado: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(4000)],
    }),
    incluirProxima: new FormControl(false, { nonNullable: true }),
  });
  readonly activityNextForm = this.taskForm();
  readonly newTaskForm = this.taskForm();
  readonly editTaskForm = this.taskForm();
  readonly completeForm = new FormGroup({
    resultado: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(4000)],
    }),
    programarOtra: new FormControl(false, { nonNullable: true }),
  });
  readonly completionNextForm = this.taskForm();

  private activityRequestId = crypto.randomUUID();
  private taskRequestId = crypto.randomUUID();
  private editRequestId = crypto.randomUUID();
  private completeRequestId = crypto.randomUUID();

  async createActivity(): Promise<void> {
    const current = this.record();
    if (this.busy() || current.archivadoEn || this.activityForm.invalid) {
      this.activityForm.markAllAsTouched();
      return;
    }
    if (this.activityForm.controls.incluirProxima.value && this.activityNextForm.invalid) {
      this.activityNextForm.markAllAsTouched();
      return;
    }
    const scope = this.context.captureScope();
    if (!scope || scope.projectId !== current.proyectoId) return;
    this.busy.set(true);
    this.errorMessage.set(null);
    const values = this.activityForm.getRawValue();
    try {
      await firstValueFrom(
        this.api.createActivity(scope.projectId, current.id, {
          solicitudId: this.activityRequestId,
          tipo: values.tipo,
          ocurridaEn: mazatlanDateTimeToIso(values.ocurridaEn),
          resumen: values.resumen,
          resultado: values.resultado || null,
          proximaAccion: values.incluirProxima ? this.taskValue(this.activityNextForm) : undefined,
        }),
      );
      if (!this.isCurrent(scope.projectId, current.id, scope.revision)) return;
      this.activityRequestId = crypto.randomUUID();
      this.resetActivityForm();
      this.changed.emit('Contacto y seguimiento guardados.');
    } catch {
      if (this.isCurrent(scope.projectId, current.id, scope.revision)) {
        this.errorMessage.set('No fue posible guardar el contacto. Puedes reintentarlo.');
        this.busy.set(false);
      }
    }
  }

  async createTask(): Promise<void> {
    const current = this.record();
    if (this.busy() || current.archivadoEn || this.newTaskForm.invalid) {
      this.newTaskForm.markAllAsTouched();
      return;
    }
    const scope = this.context.captureScope();
    if (!scope || scope.projectId !== current.proyectoId) return;
    this.busy.set(true);
    this.errorMessage.set(null);
    try {
      await firstValueFrom(
        this.api.createTask(scope.projectId, current.id, {
          solicitudId: this.taskRequestId,
          ...this.taskValue(this.newTaskForm),
        }),
      );
      if (!this.isCurrent(scope.projectId, current.id, scope.revision)) return;
      this.taskRequestId = crypto.randomUUID();
      this.newTaskForm.reset(this.emptyTask());
      this.showTaskForm.set(false);
      this.changed.emit('Seguimiento creado.');
    } catch {
      if (this.isCurrent(scope.projectId, current.id, scope.revision)) {
        this.errorMessage.set('No fue posible crear el seguimiento. Puedes reintentarlo.');
        this.busy.set(false);
      }
    }
  }

  startEdit(task: FollowUpTask): void {
    this.errorMessage.set(null);
    this.completingTaskId.set(null);
    this.editingTaskId.set(task.id);
    this.editRequestId = crypto.randomUUID();
    this.editTaskForm.reset({
      preset: 'OTRA',
      descripcion: task.descripcion,
      tipo: task.tipo as TaskType,
      fechaVencimiento: task.fechaVencimiento,
    });
  }

  async updateTask(): Promise<void> {
    const current = this.record();
    const taskId = this.editingTaskId();
    if (!taskId || this.busy() || current.archivadoEn || this.editTaskForm.invalid) {
      this.editTaskForm.markAllAsTouched();
      return;
    }
    const scope = this.context.captureScope();
    if (!scope || scope.projectId !== current.proyectoId) return;
    this.busy.set(true);
    this.errorMessage.set(null);
    try {
      await firstValueFrom(
        this.api.updateTask(scope.projectId, current.id, taskId, {
          solicitudId: this.editRequestId,
          ...this.taskValue(this.editTaskForm),
        }),
      );
      if (!this.isCurrent(scope.projectId, current.id, scope.revision)) return;
      this.editingTaskId.set(null);
      this.editRequestId = crypto.randomUUID();
      this.changed.emit('Seguimiento actualizado.');
    } catch {
      if (this.isCurrent(scope.projectId, current.id, scope.revision)) {
        this.errorMessage.set('No fue posible actualizar el seguimiento. Puedes reintentarlo.');
        this.busy.set(false);
      }
    }
  }

  startComplete(task: FollowUpTask): void {
    this.errorMessage.set(null);
    this.editingTaskId.set(null);
    this.completingTaskId.set(task.id);
    this.completeRequestId = crypto.randomUUID();
    this.completeForm.reset({ resultado: '', programarOtra: false });
    this.completionNextForm.reset(this.emptyTask());
  }

  async completeTask(): Promise<void> {
    const current = this.record();
    const taskId = this.completingTaskId();
    if (!taskId || this.busy() || current.archivadoEn || this.completeForm.invalid) return;
    if (this.completeForm.controls.programarOtra.value && this.completionNextForm.invalid) {
      this.completionNextForm.markAllAsTouched();
      return;
    }
    const scope = this.context.captureScope();
    if (!scope || scope.projectId !== current.proyectoId) return;
    this.busy.set(true);
    this.errorMessage.set(null);
    try {
      await firstValueFrom(
        this.api.completeTask(scope.projectId, current.id, taskId, {
          solicitudId: this.completeRequestId,
          resultado: this.completeForm.controls.resultado.value || null,
          siguienteTarea: this.completeForm.controls.programarOtra.value
            ? this.taskValue(this.completionNextForm)
            : undefined,
        }),
      );
      if (!this.isCurrent(scope.projectId, current.id, scope.revision)) return;
      this.completingTaskId.set(null);
      this.completeRequestId = crypto.randomUUID();
      this.changed.emit('Seguimiento completado.');
    } catch {
      if (this.isCurrent(scope.projectId, current.id, scope.revision)) {
        this.errorMessage.set('No fue posible completar el seguimiento. Puedes reintentarlo.');
        this.busy.set(false);
      }
    }
  }

  applyPreset(form: ReturnType<FollowUpPanel['taskForm']>): void {
    const preset = this.presets.find((item) => item.value === form.controls.preset.value);
    if (!preset) return;
    form.patchValue({ descripcion: preset.description, tipo: preset.type });
  }

  applyDate(form: ReturnType<FollowUpPanel['taskForm']>, shortcut: 'tomorrow' | 'week' | 'month') {
    const today = calendarToday();
    form.controls.fechaVencimiento.setValue(
      shortcut === 'tomorrow'
        ? addCalendarDays(today, 1)
        : shortcut === 'week'
          ? addCalendarDays(today, 7)
          : addCalendarMonth(today),
    );
  }

  activityLabel(type: ActivityType): string {
    return activityTypeLabel(type);
  }

  taskLabel(type: string): string {
    return taskTypeLabel(type as TaskType);
  }

  timestamp(value: string): string {
    return new Intl.DateTimeFormat('es-MX', {
      timeZone: 'America/Mazatlan',
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  }

  calendarDate(value: string): string {
    return new Intl.DateTimeFormat('es-MX', {
      timeZone: 'UTC',
      dateStyle: 'medium',
    }).format(new Date(`${value}T00:00:00Z`));
  }

  private taskForm() {
    return new FormGroup({
      preset: new FormControl('PEDIR_RESPUESTA', { nonNullable: true }),
      descripcion: new FormControl('Pedir respuesta', {
        nonNullable: true,
        validators: [Validators.required, Validators.maxLength(240)],
      }),
      tipo: new FormControl<TaskType>('WHATSAPP', { nonNullable: true }),
      fechaVencimiento: new FormControl(addCalendarDays(calendarToday(), 1), {
        nonNullable: true,
        validators: [Validators.required],
      }),
    });
  }

  private taskValue(form: ReturnType<FollowUpPanel['taskForm']>): TaskInput {
    const value = form.getRawValue();
    return {
      descripcion: value.descripcion,
      tipo: value.tipo,
      fechaVencimiento: value.fechaVencimiento,
    };
  }

  private emptyTask() {
    return {
      preset: 'PEDIR_RESPUESTA',
      descripcion: 'Pedir respuesta',
      tipo: 'WHATSAPP' as TaskType,
      fechaVencimiento: addCalendarDays(calendarToday(), 1),
    };
  }

  private resetActivityForm(): void {
    this.activityForm.reset({
      tipo: 'LLAMADA',
      ocurridaEn: dateTimeNow(),
      resumen: '',
      resultado: '',
      incluirProxima: false,
    });
    this.activityNextForm.reset(this.emptyTask());
    this.showActivityForm.set(false);
  }

  private isCurrent(projectId: string, recordId: string, revision: number): boolean {
    return (
      this.context.activeProject()?.id === projectId &&
      this.context.revision() === revision &&
      this.record().id === recordId
    );
  }
}
