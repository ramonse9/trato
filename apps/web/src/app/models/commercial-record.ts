export type CommercialStage =
  | 'POR_CONTACTAR'
  | 'BUSCANDO_ENCARGADO'
  | 'CONTACTADO'
  | 'DEMO_PENDIENTE'
  | 'DEMO_REALIZADA'
  | 'PROPUESTA_ENVIADA'
  | 'EN_NEGOCIACION'
  | 'CLIENTE'
  | 'DESCARTADO';

export type InterestLevel = 'SIN_EVALUAR' | 'BAJO' | 'MEDIO' | 'ALTO';
export type ActivityType = 'LLAMADA' | 'WHATSAPP' | 'VISITA' | 'DEMO' | 'NOTA';
export type TaskType = 'LLAMADA' | 'WHATSAPP' | 'VISITA' | 'DEMO' | 'ENVIAR_PROPUESTA' | 'OTRO';
export type FollowUpStatus = 'ROJO' | 'AMARILLO' | 'VERDE' | 'GRIS';
export type RecordOrder = 'ANTIGUOS_PRIMERO' | 'RECIENTES_PRIMERO';

export const COMMERCIAL_STAGES: ReadonlyArray<{
  value: CommercialStage;
  label: string;
}> = [
  { value: 'POR_CONTACTAR', label: '0 - Por contactar' },
  { value: 'BUSCANDO_ENCARGADO', label: '1 - Buscando al encargado' },
  { value: 'CONTACTADO', label: '2 - Contactado' },
  { value: 'DEMO_PENDIENTE', label: '3 - Demo pendiente' },
  { value: 'DEMO_REALIZADA', label: '4 - Demo realizada' },
  { value: 'PROPUESTA_ENVIADA', label: '5 - Propuesta enviada' },
  { value: 'EN_NEGOCIACION', label: '6 - En negociación' },
  { value: 'CLIENTE', label: '7 - Cliente' },
  { value: 'DESCARTADO', label: '8 - Descartado' },
];

export const INTEREST_LEVELS: ReadonlyArray<{
  value: InterestLevel;
  label: string;
}> = [
  { value: 'SIN_EVALUAR', label: '0 - Sin evaluar' },
  { value: 'BAJO', label: '1 - Bajo' },
  { value: 'MEDIO', label: '2 - Medio' },
  { value: 'ALTO', label: '3 - Alto' },
];

export interface LastContact {
  id: string;
  tipo: ActivityType;
  ocurridaEn: string;
}

export interface NextAction {
  id: string;
  descripcion: string;
  tipo: string;
  fechaVencimiento: string;
}

export interface CommercialRecordSummary {
  id: string;
  proyectoId: string;
  nombreNegocio: string;
  nombreEncargado: string | null;
  telefono: string | null;
  correo: string | null;
  direccion: string | null;
  latitud: string | null;
  longitud: string | null;
  etapa: CommercialStage;
  nivelInteres: InterestLevel;
  notasGenerales: string | null;
  motivoDescarte: string | null;
  creadoEn: string;
  actualizadoEn: string;
  archivadoEn: string | null;
  ultimoContacto: LastContact | null;
  proximaAccion: NextAction | null;
  semaforo: FollowUpStatus;
}
export interface RecordActivity extends LastContact {
  detalle: string;
  resultado: string | null;
}

export interface FollowUpTask {
  id: string;
  descripcion: string;
  tipo: TaskType;
  fechaVencimiento: string;
  estado: 'PENDIENTE' | 'COMPLETADA';
  completadaEn: string | null;
  resultado: string | null;
  creadaEn: string;
  actualizadaEn: string;
}

export interface TaskInput {
  descripcion: string;
  tipo: TaskType;
  fechaVencimiento: string;
}

export interface CreateActivityInput {
  solicitudId: string;
  tipo: ActivityType;
  ocurridaEn: string;
  resumen: string;
  resultado?: string | null;
  proximaAccion?: TaskInput;
  nivelInteres?: InterestLevel;
}

export interface CreateActivityResponse {
  actividad: RecordActivity;
  proximaAccion: FollowUpTask | null;
}

export interface CreateTaskInput extends TaskInput {
  solicitudId: string;
}

export interface UpdateTaskInput {
  solicitudId: string;
  descripcion?: string;
  tipo?: TaskType;
  fechaVencimiento?: string;
}

export interface CompleteTaskInput {
  solicitudId: string;
  resultado?: string | null;
  siguienteTarea?: TaskInput;
}

export interface CompleteTaskResponse {
  tarea: FollowUpTask;
  siguienteTarea: FollowUpTask | null;
}

export interface CommercialRecordDetail extends Omit<
  CommercialRecordSummary,
  'ultimoContacto' | 'proximaAccion'
> {
  actividades: RecordActivity[];
  tareasSeguimiento: FollowUpTask[];
}

export interface RecordListResponse {
  items: CommercialRecordSummary[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface RecordListQuery {
  page: number;
  pageSize: number;
  search?: string;
  etapa?: CommercialStage;
  nivelInteres?: InterestLevel;
  archived?: boolean;
  orden: RecordOrder;
}

export interface RecordUpdateInput {
  nombreNegocio?: string;
  nombreEncargado?: string | null;
  telefono?: string | null;
  correo?: string | null;
  direccion?: string | null;
  latitud?: number | null;
  longitud?: number | null;
  etapa?: CommercialStage;
  nivelInteres?: InterestLevel;
  notasGenerales?: string | null;
  motivoDescarte?: string | null;
}

export function stageLabel(value: CommercialStage): string {
  return COMMERCIAL_STAGES.find((item) => item.value === value)?.label ?? value;
}

export function interestLabel(value: InterestLevel): string {
  return INTEREST_LEVELS.find((item) => item.value === value)?.label ?? value;
}

export function activityTypeLabel(value: ActivityType): string {
  const labels: Record<ActivityType, string> = {
    LLAMADA: 'Llamada',
    WHATSAPP: 'WhatsApp',
    VISITA: 'Visita',
    DEMO: 'Demo',
    NOTA: 'Nota',
  };
  return labels[value];
}

export function taskTypeLabel(value: TaskType): string {
  const labels: Record<TaskType, string> = {
    LLAMADA: 'Llamada',
    WHATSAPP: 'WhatsApp',
    VISITA: 'Visita',
    DEMO: 'Demo',
    ENVIAR_PROPUESTA: 'Enviar propuesta',
    OTRO: 'Otra acción',
  };
  return labels[value];
}
