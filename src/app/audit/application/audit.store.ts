import { Injectable, inject, signal, computed } from '@angular/core';
import { DomainEventBus } from '../../shared/domain/events/event-bus';
import { AUDIT_LOG_REPOSITORY } from '../domain/services/audit-log.repository';
import { AuditLog } from '../domain/model/audit-log.entity';

/**
 * Capa de aplicacion de BC-06 (patron Conformist). No publica hacia el dominio:
 * ningun contexto depende de Audit para completar su operacion.
 *
 * Las entradas las deriva el servidor de los eventos de dominio de cada
 * contexto, en la misma transaccion que los produjo. Este contexto no las
 * escribe, y es lo que se esperaria de una bitacora: si el cliente pudiera
 * anotar, la bitacora dejaria de ser prueba de lo que ocurrio y pasaria a ser
 * prueba de lo que el cliente dijo que ocurrio.
 *
 * Lo que llega por el bus solo avisa de que hubo actividad; la reaccion es
 * volver a leer la bitacora del servidor.
 */
@Injectable({ providedIn: 'root' })
export class AuditStore {
  private readonly bus = inject(DomainEventBus);
  private readonly repo = inject(AUDIT_LOG_REPOSITORY);
  readonly logs = signal<AuditLog[]>([]);
  readonly count = computed(() => this.logs().length);

  private relecturaPendiente = false;

  constructor() {
    this.bus.all().subscribe(event => {
      if (event.name === 'LogDeAuditoriaCreado') return;   // evita realimentarse
      this.releer();
    });
  }

  /**
   * Una escritura publica varios eventos de forma sincrona. Agrupar la
   * relectura en una microtarea deja una sola peticion por escritura sin
   * introducir un temporizador, que haria la reaccion dificil de probar.
   */
  private releer(): void {
    if (this.relecturaPendiente) return;
    this.relecturaPendiente = true;
    queueMicrotask(() => {
      this.relecturaPendiente = false;
      void this.load();
    });
  }

  /**
   * Lee la bitacora del servidor, que es la version que vale.
   *
   * Una lectura vacia sobre una bitacora que ya tenia entradas no se adopta: o
   * el rol no la puede leer o la peticion fallo, y en los dos casos vaciar la
   * pantalla seria afirmar que no hay registro de nada. Se conserva lo ultimo
   * leido y el motivo queda en la consola.
   */
  async load(): Promise<void> {
    const leidos = await this.repo.load();
    if (!leidos.length && this.logs().length) return;
    this.logs.set(leidos);
  }

  /** US-32: historial de cambios de un recurso, del mas reciente al mas antiguo. */
  forResource(resourceId: string): AuditLog[] {
    return this.logs().filter(l => l.affectedResource === resourceId);
  }
}
