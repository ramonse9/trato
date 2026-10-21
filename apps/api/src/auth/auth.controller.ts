import { Body, Controller, Get, Post, Req, Res } from '@nestjs/common';
import { Throttle, minutes } from '@nestjs/throttler';
import type { Response } from 'express';
import type { AuthenticatedRequest } from '../common/authenticated-request.js';
import { Public } from '../common/public.decorator.js';
import { AuthService } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import {
  clearSessionCookieOptions,
  sessionCookieName,
  sessionCookieOptions,
} from './session-cookie.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: minutes(15) } })
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const session = await this.authService.login(dto.correo, dto.password);
    response.cookie(
      sessionCookieName(),
      session.token,
      sessionCookieOptions(session.expires),
    );

    return {
      user: session.user,
      csrfToken: session.csrfToken,
      expiresAt: session.expires.toISOString(),
    };
  }

  @Get('session')
  getSession(@Req() request: AuthenticatedRequest) {
    return {
      user: request.auth.user,
      csrfToken: request.auth.csrfToken,
    };
  }

  @Post('logout')
  async logout(
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.authService.logout(request.auth.sessionId);
    response.clearCookie(sessionCookieName(), clearSessionCookieOptions());
    return { message: 'Sesión cerrada.' };
  }
}
