import { CommercialStage, FollowUpStatus, InterestLevel, TaskType } from './commercial-record';

export type FollowUpTaskStatus = 'PENDIENTE' | 'COMPLETADA';

export interface FollowUpListItem {
  id: string;
  descripcion: string;
  tipo: TaskType;
  fechaVencimiento: string;
  estado: FollowUpTaskStatus;
  completadaEn: string | null;
  resultado: string | null;
  semaforo: FollowUpStatus;
  registro: {
    id: string;
    nombreNegocio: string;
    nombreEncargado: string | null;
    etapa: CommercialStage;
    nivelInteres: InterestLevel;
  };
}

export interface FollowUpListResponse {
  items: FollowUpListItem[];
  total: number;
}

export interface FollowUpListQuery {
  estado?: FollowUpTaskStatus;
  desde?: string;
  hasta?: string;
}
