/**
 * Published Language: lo unico que cruza la frontera entre contextos.
 * Ningun contexto importa las clases de dominio de otro (regla 1 de la seccion 4.6.6).
 */
export interface DomainEvent {
  readonly name: string;
  readonly occurredAt: Date;
  readonly payload: Readonly<Record<string, unknown>>;
}

export function domainEvent(name: string, payload: Record<string, unknown>): DomainEvent {
  return { name, occurredAt: new Date(), payload: Object.freeze({ ...payload }) };
}
