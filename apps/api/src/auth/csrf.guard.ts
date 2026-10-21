import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';
import type { AuthenticatedRequest } from '../common/authenticated-request.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

@Injectable()
export class CsrfGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    if (SAFE_METHODS.has(request.method)) return true;

    this.validateOrigin(request);

    const auth = (request as Partial<AuthenticatedRequest>).auth;
    if (!auth) return true;

    const supplied = request.header('x-csrf-token') ?? '';
    const expected = auth.csrfToken;
    const suppliedBuffer = Buffer.from(supplied);
    const expectedBuffer = Buffer.from(expected);

    if (
      suppliedBuffer.length !== expectedBuffer.length ||
      !timingSafeEqual(suppliedBuffer, expectedBuffer)
    ) {
      throw new ForbiddenException('Token CSRF inválido.');
    }

    return true;
  }

  private validateOrigin(request: Request): void {
    const expectedOrigin = process.env.WEB_ORIGIN ?? 'http://localhost:4200';
    const origin = request.header('origin');

    if (origin === expectedOrigin) return;

    if (!origin) {
      const referer = request.header('referer');
      if (referer) {
        try {
          if (new URL(referer).origin === expectedOrigin) return;
        } catch {
          // La respuesta genérica evita filtrar detalles de la validación.
        }
      }
    }

    throw new ForbiddenException('Origen de solicitud no permitido.');
  }
}
