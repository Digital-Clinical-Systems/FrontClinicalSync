import { Injectable, inject, signal, computed } from '@angular/core';
import { DomainEventBus } from '../../shared/domain/events/event-bus';
import { AUDIT_LOG_REPOSITORY } from '../domain/services/audit-log.repository';
import { AuditLog } from '../domain/model/audit-log.entity';

/**
 * Capa de aplicacion de BC-06 (patron Conformist). Escucha todos los eventos de
 * dominio y los normaliza a AuditLog. No publica hacia el dominio: ningun
 * contexto depende de Audit para completar su operacion.
 */
@Injectable({ providedIn: 'root' })
export class AuditStore {
  private readonly bus = inject(DomainEventBus);
  private readonly repo = inject(AUDIT_LOG_REPOSITORY);
  readonly logs = signal<AuditLog[]>([]);
  readonly count = computed(() => this.logs().length);

  constructor() {
    this.bus.all().subscribe(event => {
      if (event.name === 'LogDeAuditoriaCreado') return;   // evita realimentarse
      const log = AuditLog.from(event.name, event.occurredAt, event.payload as Record<string, unknown>);
      this.logs.update(list => [log, ...list]);            // append-only
      this.repo.append(log);
    });
  }

  /** Carga la bitacora historica. Se antepone a lo ya anotado en esta sesion. */
  async load(): Promise<void> {
    const historicos = await this.repo.load();
    this.logs.update(actuales => [...actuales, ...historicos]);
  }

  /** US-32: historial de cambios de un recurso, del mas reciente al mas antiguo. */
  forResource(resourceId: string): AuditLog[] {
    return this.logs().filter(l => l.affectedResource === resourceId);
  }
}
