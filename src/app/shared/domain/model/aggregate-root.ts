import { DomainEvent } from '../events/domain-event';

/**
 * Raiz de agregado. Acumula los eventos que la operacion produjo para que la
 * capa de aplicacion los publique despues de confirmar el cambio: una
 * transaccion modifica un solo agregado (criterio transaccional, seccion 4.6.5).
 */
export abstract class AggregateRoot {
  private readonly events: DomainEvent[] = [];

  protected record(event: DomainEvent): void { this.events.push(event); }

  pullEvents(): DomainEvent[] { return this.events.splice(0, this.events.length); }
}
