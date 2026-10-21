import { Component, effect, inject, signal, untracked } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { ProjectContextService } from '../../core/project-context.service';
import { RecordsService } from '../../core/records.service';
import {
  COMMERCIAL_STAGES,
  CommercialRecordSummary,
  CommercialStage,
  INTEREST_LEVELS,
  InterestLevel,
  interestLabel,
  stageLabel,
} from '../../models/commercial-record';

@Component({
  selector: 'app-records',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    RouterLink,
  ],
  templateUrl: './records.html',
  styleUrl: './records.scss',
})
export class Records {
  private readonly api = inject(RecordsService);
  private readonly router = inject(Router);
  readonly context = inject(ProjectContextService);
  private request?: Subscription;
  private requestGeneration = 0;

  readonly stages = COMMERCIAL_STAGES;
  readonly interests = INTEREST_LEVELS;
  readonly records = signal<CommercialRecordSummary[]>([]);
  readonly loading = signal(false);
  readonly loadError = signal(false);
  readonly archived = signal(false);
  readonly page = signal(1);
  readonly pageSize = 20;
  readonly total = signal(0);
  readonly totalPages = signal(1);
  readonly filters = new FormGroup({
    search: new FormControl('', { nonNullable: true }),
    etapa: new FormControl<CommercialStage | ''>('', { nonNullable: true }),
    nivelInteres: new FormControl<InterestLevel | ''>('', { nonNullable: true }),
  });

  constructor() {
    effect((onCleanup) => {
      this.context.activeProject();
      this.context.revision();
      untracked(() => {
        this.cancelRequest();
        this.filters.reset({ search: '', etapa: '', nivelInteres: '' });
        this.archived.set(false);
        this.page.set(1);
        this.records.set([]);
        this.load();
      });
      onCleanup(() => this.cancelRequest());
    });
  }

  applyFilters(): void {
    this.page.set(1);
    this.load();
  }

  clearFilters(): void {
    this.filters.reset({ search: '', etapa: '', nivelInteres: '' });
    this.applyFilters();
  }

  showArchived(value: boolean): void {
    if (this.archived() === value) return;
    this.archived.set(value);
    this.page.set(1);
    this.load();
  }

  previousPage(): void {
    if (this.page() <= 1) return;
    this.page.update((value) => value - 1);
    this.load();
  }

  nextPage(): void {
    if (this.page() >= this.totalPages()) return;
    this.page.update((value) => value + 1);
    this.load();
  }

  open(recordId: string): void {
    const projectId = this.context.activeProject()?.id;
    if (projectId) void this.router.navigate(['/p', projectId, 'records', recordId]);
  }

  retry(): void {
    this.load();
  }

  stage(value: CommercialStage): string {
    return stageLabel(value);
  }

  interest(value: InterestLevel): string {
    return interestLabel(value);
  }

  contactDate(value: string): string {
    return new Intl.DateTimeFormat('es-MX', {
      timeZone: 'America/Mazatlan',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(new Date(value));
  }

  calendarDate(value: string): string {
    return new Intl.DateTimeFormat('es-MX', {
      timeZone: 'UTC',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(new Date(`${value}T00:00:00Z`));
  }

  private load(): void {
    const project = this.context.activeProject();
    const scope = this.context.captureScope();
    if (!project || !scope) return;

    const generation = ++this.requestGeneration;
    this.cancelRequest();
    this.loading.set(true);
    this.loadError.set(false);
    const values = this.filters.getRawValue();
    this.request = this.api
      .list(project.id, {
        page: this.page(),
        pageSize: this.pageSize,
        search: values.search.trim() || undefined,
        etapa: values.etapa || undefined,
        nivelInteres: values.nivelInteres || undefined,
        archived: this.archived(),
      })
      .subscribe({
        next: (response) => {
          if (!this.context.isCurrent(scope) || generation !== this.requestGeneration) return;
          this.records.set(response.items);
          this.total.set(response.total);
          this.totalPages.set(response.totalPages);
          this.page.set(response.page);
          this.loading.set(false);
        },
        error: () => {
          if (!this.context.isCurrent(scope) || generation !== this.requestGeneration) return;
          this.records.set([]);
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
