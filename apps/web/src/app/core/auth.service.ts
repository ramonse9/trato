import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

export interface SessionUser {
  id: string;
  nombre: string;
  correo: string;
}

interface SessionResponse {
  user: SessionUser;
  csrfToken: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly currentUser = signal<SessionUser | null>(null);
  private readonly currentCsrfToken = signal<string | null>(null);
  private restoration?: Promise<boolean>;

  readonly user = this.currentUser.asReadonly();
  readonly csrfToken = this.currentCsrfToken.asReadonly();
  readonly authenticated = computed(() => this.currentUser() !== null);

  async restoreSession(): Promise<boolean> {
    if (this.authenticated()) return true;
    this.restoration ??= firstValueFrom(this.http.get<SessionResponse>('/api/auth/session'))
      .then((session) => {
        this.setSession(session);
        return true;
      })
      .catch(() => {
        this.clearSession();
        return false;
      })
      .finally(() => {
        this.restoration = undefined;
      });
    return this.restoration;
  }

  async login(correo: string, password: string): Promise<void> {
    const session = await firstValueFrom(
      this.http.post<SessionResponse>('/api/auth/login', { correo, password }),
    );
    this.setSession(session);
  }

  async logout(): Promise<void> {
    try {
      await firstValueFrom(this.http.post('/api/auth/logout', {}));
    } finally {
      this.clearSession();
    }
  }

  private setSession(session: SessionResponse): void {
    this.currentUser.set(session.user);
    this.currentCsrfToken.set(session.csrfToken);
  }

  private clearSession(): void {
    this.currentUser.set(null);
    this.currentCsrfToken.set(null);
  }
}
