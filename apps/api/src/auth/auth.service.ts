import { Injectable, UnauthorizedException } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service.js';
import { hashPassword, verifyPassword } from './password.js';
import { SESSION_TTL_DAYS_DEFAULT } from './session-cookie.js';

const DUMMY_PASSWORD = randomBytes(32).toString('hex');

@Injectable()
export class AuthService {
  private readonly dummyHash = hashPassword(DUMMY_PASSWORD);

  constructor(private readonly prisma: PrismaService) {}

  async login(correo: string, password: string) {
    const normalizedEmail = correo.trim().normalize('NFC').toLowerCase();
    const user = await this.prisma.usuario.findUnique({
      where: { correo: normalizedEmail },
      select: { id: true, nombre: true, correo: true, passwordHash: true },
    });
    const passwordHash = user?.passwordHash ?? (await this.dummyHash);
    const valid = await verifyPassword(password, passwordHash);

    if (!user?.passwordHash || !valid) {
      throw new UnauthorizedException('Correo o contraseña incorrectos.');
    }

    const token = randomBytes(32).toString('hex');
    const csrfToken = randomBytes(32).toString('hex');
    const ttlDays = this.sessionTtlDays();
    const expires = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);

    await this.prisma.sesion.create({
      data: {
        usuarioId: user.id,
        tokenHash: this.hashToken(token),
        csrfToken,
        expiraEn: expires,
      },
    });

    return {
      token,
      csrfToken,
      expires,
      user: { id: user.id, nombre: user.nombre, correo: user.correo },
    };
  }

  async logout(sessionId: string): Promise<void> {
    await this.prisma.sesion.deleteMany({ where: { id: sessionId } });
  }

  hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private sessionTtlDays(): number {
    const parsed = Number.parseInt(process.env.SESSION_TTL_DAYS ?? '', 10);
    return Number.isInteger(parsed) && parsed > 0 && parsed <= 30
      ? parsed
      : SESSION_TTL_DAYS_DEFAULT;
  }
}
