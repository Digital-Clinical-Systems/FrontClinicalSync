import { Injectable, computed, inject, signal } from '@angular/core';
import { AUTH_REPOSITORY } from '../domain/services/auth.repository';
import { AuthenticatedUser } from '../domain/model/authenticated-user';
import { CurrentUser } from '../domain/model/current-user';

/**
 * Clave de la sesion en el almacenamiento del navegador.
 *
 * Se usa `sessionStorage` y no `localStorage` a proposito: en un puesto de
 * trabajo compartido de una unidad asistencial la sesion debe morir al cerrar la
 * pestana y no quedar disponible para el turno siguiente. Sobrevive a un
 * refresco de pagina, que es lo unico que hace falta.
 */
const CLAVE = 'clinicalsync.sesion';

/**
 * Sesion en curso. Unica fuente de verdad sobre quien opera la aplicacion:
 * mantiene el token con el que se autorizan las peticiones y propaga la
 * identidad al Shared Kernel para que el resto de los contextos la consulten
 * sin conocer el transporte.
 */
@Injectable({ providedIn: 'root' })
export class SessionStore {
  private readonly auth = inject(AUTH_REPOSITORY);
  private readonly currentUser = inject(CurrentUser);
  private readonly sesion = signal<AuthenticatedUser | null>(null);

  readonly usuario = computed(() => this.sesion());
  readonly autenticado = computed(() => this.sesion() !== null);
  readonly token = computed(() => this.sesion()?.token ?? null);

  constructor() {
    // Una sesion guardada se restaura al arrancar, para que un refresco de
    // pagina no expulse al profesional en medio de un turno.
    const guardada = this.leerDelNavegador();
    if (guardada) {
      this.establecer(guardada);
    }
  }

  async signIn(username: string, password: string): Promise<void> {
    const usuario = await this.auth.signIn(username.trim(), password);
    this.establecer(usuario);
    this.guardarEnNavegador(usuario);
  }

  signOut(): void {
    this.establecer(null);
    try {
      sessionStorage.removeItem(CLAVE);
    } catch {
      // Sin almacenamiento disponible la sesion ya solo vivia en memoria.
    }
  }

  private establecer(usuario: AuthenticatedUser | null): void {
    this.sesion.set(usuario);
    this.currentUser.establecer(usuario);
  }

  private leerDelNavegador(): AuthenticatedUser | null {
    try {
      const crudo = sessionStorage.getItem(CLAVE);
      if (!crudo) return null;
      const leido = JSON.parse(crudo) as AuthenticatedUser;
      // Una sesion a medias es peor que ninguna: se descarta.
      return leido?.token && leido.username && leido.roles?.length ? leido : null;
    } catch {
      return null;
    }
  }

  private guardarEnNavegador(usuario: AuthenticatedUser): void {
    try {
      sessionStorage.setItem(CLAVE, JSON.stringify(usuario));
    } catch {
      // Modo privado o almacenamiento bloqueado: la sesion vive solo en memoria
      // y se pierde al refrescar, que es una degradacion aceptable.
    }
  }
}
