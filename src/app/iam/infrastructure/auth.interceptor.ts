import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SessionStore } from '../application/session.store';

/** El inicio de sesion es la unica peticion del API que viaja sin token. */
const RUTA_DE_AUTENTICACION = '/authentication/';

/**
 * Adjunta el token de la sesion a cada peticion dirigida al API y reacciona a su
 * rechazo.
 *
 * Solo firma las peticiones al backend propio: un token enviado a cualquier otro
 * destino seria una fuga de credenciales. Un 401 significa que la sesion ya no
 * vale —expiro o fue revocada—, de modo que se cierra y se devuelve al usuario
 * al inicio de sesion en lugar de dejarlo ante pantallas vacias sin explicacion.
 */
export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const sesion = inject(SessionStore);
  const router = inject(Router);

  const esDelBackend = request.url.startsWith(environment.backendBaseUrl);
  const esAutenticacion = request.url.includes(RUTA_DE_AUTENTICACION);
  const token = sesion.token();

  const peticion = esDelBackend && !esAutenticacion && token
    ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : request;

  return next(peticion).pipe(catchError((error: unknown) => {
    if (error instanceof HttpErrorResponse && error.status === 401 && esDelBackend && !esAutenticacion) {
      sesion.signOut();
      void router.navigate(['/ingresar']);
    }
    return throwError(() => error);
  }));
};
