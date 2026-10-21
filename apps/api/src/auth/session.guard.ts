import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { AuthenticatedRequest } from '../common/authenticated-request.js';
import { IS_PUBLIC_KEY } from '../common/public.decorator.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuthService } from './auth.service.js';
import { parseCookie, sessionCookieName } from './session-cookie.js';

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const token = parseCookie(request.headers.cookie, sessionCookieName());
    if (!token || !/^[0-9a-f]{64}$/.test(token)) {
      throw new UnauthorizedException('Inicia sesión para continuar.');
    }

    const session = await this.prisma.sesion.findUnique({
      where: { tokenHash: this.authService.hashToken(token) },
      select: {
        id: true,
        csrfToken: true,
        expiraEn: true,
        usuario: {
          select: { id: true, nombre: true, correo: true },
        },
      },
    });

    if (!session || session.expiraEn <= new Date()) {
      if (session) {
        await this.prisma.sesion.deleteMany({ where: { id: session.id } });
      }
      throw new UnauthorizedException(
        'La sesión expiró. Inicia sesión de nuevo.',
      );
    }

    (request as AuthenticatedRequest).auth = {
      sessionId: session.id,
      csrfToken: session.csrfToken,
      user: session.usuario,
    };
    return true;
  }
}
