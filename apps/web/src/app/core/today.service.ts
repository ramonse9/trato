import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { TodayDashboard } from '../models/today-dashboard';

@Injectable({ providedIn: 'root' })
export class TodayService {
  private readonly http = inject(HttpClient);

  get(projectId: string): Observable<TodayDashboard> {
    return this.http.get<TodayDashboard>(`/api/projects/${projectId}/today`);
  }
}
