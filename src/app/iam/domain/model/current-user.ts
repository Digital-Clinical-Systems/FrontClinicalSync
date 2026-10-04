import { Injectable, signal } from '@angular/core';
import { UserId } from '../../../shared/domain/model/identifier';
import { Role } from './role.enum';

/** Identidades de demostracion que el selector de rol puede asumir. */
const DEMO_IDENTITIES = {
  [Role.Nurse]: { id: 'enf-001', displayName: 'Enfermera de turno (demo)' },
  [Role.Physician]: { id: 'med-001', displayName: 'Medico especialista (demo)' },
} as const;

export type DemoRole = keyof typeof DEMO_IDENTITIES;
export const DEMO_ROLES = Object.keys(DEMO_IDENTITIES) as DemoRole[];

/**
 * Sesion en curso. En este incremento se resuelve en memoria: la autenticacion
 * real depende de TS-01 y del servicio web correspondiente, aun no implementado.
 * El cambio de rol es solo una ayuda de demostracion para recorrer el ciclo
 * medico-enfermeria sin iniciar sesion.
 */
@Injectable({ providedIn: 'root' })
export class CurrentUser {
  readonly id = signal(UserId.of(DEMO_IDENTITIES[Role.Nurse].id));
  readonly displayName = signal<string>(DEMO_IDENTITIES[Role.Nurse].displayName);
  readonly role = signal<Role>(Role.Nurse);

  switchTo(role: DemoRole): void {
    const identity = DEMO_IDENTITIES[role];
    this.id.set(UserId.of(identity.id));
    this.displayName.set(identity.displayName);
    this.role.set(role);
  }
}
