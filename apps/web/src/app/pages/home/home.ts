import { HttpClient } from '@angular/common/http';
import { Component, inject, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatToolbarModule } from '@angular/material/toolbar';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../core/auth.service';

interface ProjectSummary {
  id: string;
  nombre: string;
  descripcion: string | null;
}

@Component({
  selector: 'app-home',
  imports: [MatButtonModule, MatCardModule, MatToolbarModule],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  readonly auth = inject(AuthService);
  readonly projects = signal<ProjectSummary[]>([]);
  readonly loading = signal(true);
  readonly loadError = signal(false);

  async ngOnInit(): Promise<void> {
    try {
      this.projects.set(await firstValueFrom(this.http.get<ProjectSummary[]>('/api/projects')));
    } catch {
      this.loadError.set(true);
    } finally {
      this.loading.set(false);
    }
  }

  async logout(): Promise<void> {
    await this.auth.logout();
    await this.router.navigate(['/login']);
  }
}
