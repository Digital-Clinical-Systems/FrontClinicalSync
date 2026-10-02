import { Injectable, inject, signal } from '@angular/core';
import { DomainEventBus } from '../../shared/domain/events/event-bus';
import { AuditLog } from '../domain/model/audit-log.entity';

/**
 * Capa de aplicacion de BC-06 (patron Conformist). Escucha todos los eventos de
 * dominio y los normaliza a AuditLog. No publica hacia el dominio: ningun
 * contexto depende de Audit para completar su operacion.
 */
@Injectable({ providedIn: 'root' })
export class AuditStore {
  private readonly bus = inject(DomainEventBus);
  readonly logs = signal<AuditLog[]>([]);

  constructor() {
    this.bus.all().subscribe(event => {
      if (event.name === 'LogDeAuditoriaCreado') return;   // evita realimentarse
      const log = AuditLog.from(event.name, event.occurredAt, event.payload as Record<string, unknown>);
      this.logs.update(list => [log, ...list]);            // append-only
    });
  }
}
