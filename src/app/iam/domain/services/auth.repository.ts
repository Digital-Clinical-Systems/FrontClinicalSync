import { InjectionToken } from '@angular/core';
import { AuthenticatedUser } from '../model/authenticated-user';

/** Motivo por el que no se pudo abrir sesion, distinguido para poder explicarselo al usuario. */
export type MotivoFallo = 'credenciales' | 'servicio' | 'red';

export class FalloDeAutenticacion extends Error {
  constructor(readonly motivo: MotivoFallo, mensaje: string) {
    super(mensaje);
    this.name = 'FalloDeAutenticacion';
  }
}

/**
 * Puerto de autenticacion. El dominio declara que una sesion se abre con un
 * usuario y una contrasena y produce un usuario autenticado; que eso ocurra
 * contra un API REST con tokens JWT es una decision de infraestructura.
 */
export interface AuthRepository {
  signIn(username: string, password: string): Promise<AuthenticatedUser>;
}

export const AUTH_REPOSITORY = new InjectionToken<AuthRepository>('AuthRepository');
