import { CommercialStage, FollowUpStatus, InterestLevel, TaskType } from './commercial-record';

export interface TodayRecord {
  id: string;
  nombreNegocio: string;
  nombreEncargado: string | null;
  etapa: CommercialStage;
  nivelInteres: InterestLevel;
}

export interface TodayTask {
  id: string;
  descripcion: string;
  tipo: TaskType;
  fechaVencimiento: string;
  semaforo: FollowUpStatus;
  registro: TodayRecord;
}

export interface TodayDashboard {
  fechaHoy: string;
  indicadores: {
    prospectosActivos: number;
    prospectosInteresAlto: number;
    clientes: number;
    tareasVencidas: number;
  };
  vencidas: TodayTask[];
  hoy: TodayTask[];
  proximosTresDias: TodayTask[];
  prospectosSinProximaAccion: TodayRecord[];
}
