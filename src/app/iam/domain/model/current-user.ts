import { Injectable, computed, signal } from '@angular/core';
import { UserId } from '../../../shared/domain/model/identifier';
import { Role } from './role.enum';
import { AuthenticatedUser, rolDeActuacion } from './authenticated-user';

/**
 * Profesional que opera la aplicacion. Es el Shared Kernel de identidad que el
 * resto de los contextos consulta para saber quien actua.
 *
 * Conserva la misma interfaz de lectura que exponia el selector de rol de
 * demostracion al que sustituye, de modo que los contextos que la consultan no
 * se enteran del cambio: lo que antes era un atajo ahora es la identidad que el
 * API devolvio al iniciar sesion.
 *
 * No conoce como se obtiene la sesion: la capa de aplicacion se la establece.
 * Asi el dominio no depende de la aplicacion ni del transporte.
 */
@Injectable({ providedIn: 'root' })
export class CurrentUser {
  private readonly actual = signal<AuthenticatedUser | null>(null);

  readonly autenticado = computed(() => this.actual() !== null);

  /**
   * Identificador del profesional. Sin sesion devuelve un centinela en lugar de
   * fallar: la guarda impide que una pantalla se renderice sin sesion, y si
   * alguna vez ocurriera, el API rechaza ese identificador antes de que pueda
   * escribirse un registro a nombre de nadie.
   */
  readonly id = computed(() => UserId.of(this.actual()?.username ?? 'sesion-ausente'));

  readonly displayName = computed(() => this.actual()?.fullName ?? '');

  /**
   * Rol con el que actua la sesion. Sin sesion devuelve el rol de menor
   * privilegio y no el mayor, para que un error de programacion degrade hacia
   * solo lectura.
   */
  readonly role = computed<Role>(() => {
    const usuario = this.actual();
    return usuario ? rolDeActuacion(usuario.roles) : Role.Auditor;
  });

  readonly roles = computed<readonly Role[]>(() => this.actual()?.roles ?? []);

  /** La establece la capa de aplicacion al abrir o cerrar sesion. */
  establecer(usuario: AuthenticatedUser | null): void {
    this.actual.set(usuario);
  }
}
