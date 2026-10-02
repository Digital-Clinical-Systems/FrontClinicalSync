import { Injectable, signal } from '@angular/core';
import { UserId } from '../../../shared/domain/model/identifier';
import { Role } from './role.enum';

/**
 * Sesion en curso. En este incremento se resuelve en memoria: la autenticacion
 * real depende de TS-01 y del servicio web correspondiente, aun no implementado.
 */
@Injectable({ providedIn: 'root' })
export class CurrentUser {
  readonly id = signal(UserId.of('enf-001'));
  readonly displayName = signal('Enfermera de turno (demo)');
  readonly role = signal<Role>(Role.Nurse);
}
