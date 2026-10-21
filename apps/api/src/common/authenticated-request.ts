import type { Request } from 'express';

export interface AuthContext {
  sessionId: string;
  csrfToken: string;
  user: {
    id: string;
    nombre: string;
    correo: string;
  };
}

export interface AuthenticatedRequest extends Request {
  auth: AuthContext;
}
