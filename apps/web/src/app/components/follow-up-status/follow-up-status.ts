import { Component, computed, input } from '@angular/core';
import { FollowUpStatus } from '../../models/commercial-record';

const PRESENTATION: Record<FollowUpStatus, { icon: string; text: string }> = {
  ROJO: { icon: '!', text: 'Vencido' },
  AMARILLO: { icon: '◷', text: 'Próximo' },
  VERDE: { icon: '✓', text: 'Al día' },
  GRIS: { icon: '—', text: 'Sin pendientes' },
};

@Component({
  selector: 'app-follow-up-status',
  template: `
    <span class="status" [class]="'status ' + status().toLowerCase()">
      <span class="icon" aria-hidden="true">{{ presentation().icon }}</span>
      <span>{{ presentation().text }}</span>
    </span>
  `,
  styles: `
    .status {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      width: fit-content;
      padding: 0.22rem 0.55rem;
      border-radius: 999px;
      font-size: 0.76rem;
      font-weight: 750;
      white-space: nowrap;
    }

    .icon {
      display: grid;
      width: 1.1rem;
      height: 1.1rem;
      place-items: center;
      border-radius: 50%;
      font-size: 0.75rem;
      font-weight: 900;
    }

    .rojo {
      background: #f8e0dc;
      color: #8a2d24;
    }

    .rojo .icon {
      background: #a33a30;
      color: white;
    }

    .amarillo {
      background: #fff1c7;
      color: #6f4b00;
    }

    .amarillo .icon {
      background: #d89c21;
      color: #2e2208;
    }

    .verde {
      background: #dceee4;
      color: #215a3f;
    }

    .verde .icon {
      background: #337a58;
      color: white;
    }

    .gris {
      background: #ecece7;
      color: #5f6d68;
    }

    .gris .icon {
      background: #7b8782;
      color: white;
    }
  `,
})
export class FollowUpStatusBadge {
  readonly status = input.required<FollowUpStatus>();
  readonly presentation = computed(() => PRESENTATION[this.status()]);
}
