import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const csrfToken = inject(AuthService).csrfToken();
  const setHeaders: Record<string, string> = {};

  if (csrfToken && !SAFE_METHODS.has(request.method.toUpperCase())) {
    setHeaders['X-CSRF-Token'] = csrfToken;
  }

  return next(
    request.clone({
      withCredentials: true,
      setHeaders,
    }),
  );
};
