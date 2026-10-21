import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { FollowUpListQuery, FollowUpListResponse } from '../models/follow-up-list';

@Injectable({ providedIn: 'root' })
export class FollowUpsService {
  private readonly http = inject(HttpClient);

  list(projectId: string, query: FollowUpListQuery): Observable<FollowUpListResponse> {
    let params = new HttpParams();
    if (query.estado) params = params.set('estado', query.estado);
    if (query.desde) params = params.set('desde', query.desde);
    if (query.hasta) params = params.set('hasta', query.hasta);
    return this.http.get<FollowUpListResponse>(`/api/projects/${projectId}/follow-ups`, {
      params,
    });
  }
}
