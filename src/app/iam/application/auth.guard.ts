import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SessionStore } from './session.store';

/**
 * Impide entrar a la aplicacion sin sesion. Conserva el destino solicitado para
 * devolver al profesional a donde queria ir una vez autenticado, de modo que un
 * enlace compartido a una pantalla concreta siga funcionando.
 */
export const sesionIniciada: CanActivateFn = (_ruta, estado) => {
  const sesion = inject(SessionStore);
  const router = inject(Router);
  if (sesion.autenticado()) {
    return true;
  }
  return router.createUrlTree(['/ingresar'], { queryParams: { destino: estado.url } });
};

/** Evita que una sesion abierta vuelva a la pantalla de inicio de sesion. */
export const sesionAusente: CanActivateFn = () => {
  const sesion = inject(SessionStore);
  const router = inject(Router);
  return sesion.autenticado() ? router.createUrlTree(['/pacientes']) : true;
};
