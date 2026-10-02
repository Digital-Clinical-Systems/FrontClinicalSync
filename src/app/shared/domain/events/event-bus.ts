import { Injectable } from '@angular/core';
import { Subject, Observable, filter } from 'rxjs';
import { DomainEvent } from './domain-event';

/**
 * Transporte de eventos de dominio entre Bounded Contexts.
 * Materializa el mapa de contextos de la seccion 4.6.6: el publicador no conoce
 * a sus suscriptores, de modo que Vital Signs puede publicar sin saber que
 * existen Alerts ni Audit.
 */
@Injectable({ providedIn: 'root' })
export class DomainEventBus {
  private readonly stream = new Subject<DomainEvent>();

  publish(event: DomainEvent): void { this.stream.next(event); }

  /** Suscripcion a un evento concreto. */
  on(name: string): Observable<DomainEvent> {
    return this.stream.asObservable().pipe(filter(e => e.name === name));
  }

  /** Suscripcion a todos los eventos: la usa Audit (patron Conformist). */
  all(): Observable<DomainEvent> { return this.stream.asObservable(); }
}
