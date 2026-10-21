import { Component, effect, inject, signal, untracked } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { FollowUpStatusBadge } from '../../components/follow-up-status/follow-up-status';
import { FollowUpsService } from '../../core/follow-ups.service';
import { ProjectContextService } from '../../core/project-context.service';
import { taskTypeLabel } from '../../models/commercial-record';
import { FollowUpListItem, FollowUpTaskStatus } from '../../models/follow-up-list';

@Component({
  selector: 'app-follow-ups',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    RouterLink,
    FollowUpStatusBadge,
  ],
  templateUrl: './follow-ups.html',
  styleUrl: './follow-ups.scss',
})
export class FollowUps {
  private readonly api = inject(FollowUpsService);
  readonly context = inject(ProjectContextService);
  private request?: Subscription;
  private requestGeneration = 0;

  readonly items = signal<FollowUpListItem[]>([]);
  readonly loading = signal(true);
  readonly loadError = signal(false);
  readonly filterError = signal<string | null>(null);
  readonly filters = new FormGroup({
    estado: new FormControl<FollowUpTaskStatus | ''>('PENDIENTE', { nonNullable: true }),
    desde: new FormControl('', { nonNullable: true }),
    hasta: new FormControl('', { nonNullable: true }),
  });

  constructor() {
    effect((onCleanup) => {
      this.context.activeProject();
      this.context.revision();
      untracked(() => {
        this.cancelRequest();
        this.filters.reset({ estado: 'PENDIENTE', desde: '', hasta: '' });
        this.items.set([]);
        this.filterError.set(null);
        this.load();
      });
      onCleanup(() => this.cancelRequest());
    });
  }

  applyFilters(): void {
    const values = this.filters.getRawValue();
    if (values.desde && values.hasta && values.desde > values.hasta) {
      this.filterError.set('La fecha inicial no puede ser posterior a la fecha final.');
      return;
    }
    this.filterError.set(null);
    this.load();
  }

  clearFilters(): void {
    this.filters.reset({ estado: 'PENDIENTE', desde: '', hasta: '' });
    this.filterError.set(null);
    this.load();
  }

  retry(): void {
    this.load();
  }

  taskType(item: FollowUpListItem): string {
    return taskTypeLabel(item.tipo);
  }

  calendarDate(value: string): string {
    return new Intl.DateTimeFormat('es-MX', {
      timeZone: 'UTC',
      dateStyle: 'medium',
    }).format(new Date(`${value}T00:00:00Z`));
  }

  completionDate(value: string): string {
    return new Intl.DateTimeFormat('es-MX', {
      timeZone: 'America/Mazatlan',
      dateStyle: 'medium',
    }).format(new Date(value));
  }

  private load(): void {
    const scope = this.context.captureScope();
    if (!scope) return;
    const generation = ++this.requestGeneration;
    this.cancelRequest();
    this.loading.set(true);
    this.loadError.set(false);
    const values = this.filters.getRawValue();
    this.request = this.api
      .list(scope.projectId, {
        estado: values.estado || undefined,
        desde: values.desde || undefined,
        hasta: values.hasta || undefined,
      })
      .subscribe({
        next: (response) => {
          if (!this.context.isCurrent(scope) || generation !== this.requestGeneration) return;
          this.items.set(response.items);
          this.loading.set(false);
        },
        error: () => {
          if (!this.context.isCurrent(scope) || generation !== this.requestGeneration) return;
          this.items.set([]);
          this.loadError.set(true);
          this.loading.set(false);
        },
      });
  }

  private cancelRequest(): void {
    this.request?.unsubscribe();
    this.request = undefined;
  }
}
