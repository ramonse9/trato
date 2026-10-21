import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  CommercialRecordDetail,
  CommercialRecordSummary,
  RecordListQuery,
  RecordListResponse,
  RecordUpdateInput,
} from '../models/commercial-record';

@Injectable({ providedIn: 'root' })
export class RecordsService {
  private readonly http = inject(HttpClient);

  list(projectId: string, query: RecordListQuery): Observable<RecordListResponse> {
    let params = new HttpParams()
      .set('page', query.page)
      .set('pageSize', query.pageSize)
      .set('archived', query.archived ?? false);
    if (query.search) params = params.set('search', query.search);
    if (query.etapa) params = params.set('etapa', query.etapa);
    if (query.nivelInteres) params = params.set('nivelInteres', query.nivelInteres);

    return this.http.get<RecordListResponse>(`/api/projects/${projectId}/records`, {
      params,
    });
  }

  get(projectId: string, recordId: string): Observable<CommercialRecordDetail> {
    return this.http.get<CommercialRecordDetail>(`/api/projects/${projectId}/records/${recordId}`);
  }

  create(projectId: string, nombreNegocio: string): Observable<CommercialRecordSummary> {
    return this.http.post<CommercialRecordSummary>(`/api/projects/${projectId}/records`, {
      nombreNegocio,
    });
  }

  update(
    projectId: string,
    recordId: string,
    input: RecordUpdateInput,
  ): Observable<CommercialRecordSummary> {
    return this.http.patch<CommercialRecordSummary>(
      `/api/projects/${projectId}/records/${recordId}`,
      input,
    );
  }

  archive(projectId: string, recordId: string): Observable<CommercialRecordSummary> {
    return this.http.post<CommercialRecordSummary>(
      `/api/projects/${projectId}/records/${recordId}/archive`,
      {},
    );
  }

  restore(projectId: string, recordId: string): Observable<CommercialRecordSummary> {
    return this.http.post<CommercialRecordSummary>(
      `/api/projects/${projectId}/records/${recordId}/restore`,
      {},
    );
  }
}
