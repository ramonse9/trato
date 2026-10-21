export interface ProjectSummary {
  id: string;
  nombre: string;
  descripcion: string | null;
  archivadoEn: string | null;
  creadoEn: string;
  actualizadoEn: string;
  _count: { registros: number };
}

export interface ProjectInput {
  nombre: string;
  descripcion: string | null;
}

export interface ProjectScope {
  projectId: string;
  revision: number;
}
