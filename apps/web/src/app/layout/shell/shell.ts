import { Component, computed, inject, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatToolbarModule } from '@angular/material/toolbar';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { ProjectContextService } from '../../core/project-context.service';

interface NavigationItem {
  path: string;
  label: string;
  compactLabel: string;
}

const NAVIGATION: NavigationItem[] = [
  { path: 'today', label: 'Hoy', compactLabel: 'Hoy' },
  { path: 'records', label: 'Prospectos y clientes', compactLabel: 'Contactos' },
  { path: 'follow-ups', label: 'Seguimientos', compactLabel: 'Seguimientos' },
  { path: 'settings', label: 'Configuración del proyecto', compactLabel: 'Configurar' },
];

@Component({
  selector: 'app-shell',
  imports: [
    MatButtonModule,
    MatFormFieldModule,
    MatSelectModule,
    MatToolbarModule,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
  ],
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
})
export class Shell implements OnInit {
  private readonly router = inject(Router);
  readonly auth = inject(AuthService);
  readonly context = inject(ProjectContextService);
  readonly navigation = NAVIGATION;
  readonly projectId = computed(() => this.context.activeProject()?.id ?? null);

  ngOnInit(): void {
    void this.context.initialize();
  }

  async changeProject(projectId: string): Promise<void> {
    if (!this.context.projects().some((project) => project.id === projectId)) return;
    const currentSection = this.currentSection();
    await this.router.navigate(['/p', projectId, currentSection]);
  }

  async logout(): Promise<void> {
    const leftWorkspace = await this.router.navigate(['/login']);
    if (!leftWorkspace) return;
    await this.auth.logout();
    this.context.reset();
  }

  private currentSection(): string {
    const section = this.router.url.split('?')[0]?.split('/').filter(Boolean).at(-1);
    return NAVIGATION.some((item) => item.path === section) ? section! : 'today';
  }
}
