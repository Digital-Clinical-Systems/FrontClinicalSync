import { Component, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { AuditStore } from '../../application/audit.store';
import { PatientsStore } from '../../../patients/application/patients.store';

@Component({
  selector: 'cs-audit-log-list',
  standalone: true,
  imports: [DatePipe],
  template: `
    <h1>Bitacora de auditoria</h1>
    <p class="hint">BC-06 escucha todos los eventos de dominio y los normaliza (patron Conformist).
      El almacenamiento es append-only: las entradas no se modifican ni se borran. Sostiene BG-05.</p>
    @if (store.logs().length === 0) {
      <p class="empty">Sin actividad registrada todavia.</p>
    } @else {
      <table>
        <caption class="sr-only">Entradas de auditoria</caption>
        <thead><tr><th scope="col">Hora</th><th scope="col">Accion</th>
          <th scope="col">Responsable</th><th scope="col">Recurso</th></tr></thead>
        <tbody>
          @for (l of store.logs(); track l.id) {
            <tr><td>{{ l.occurredAt | date:'HH:mm:ss' }}</td><td>{{ l.actionType }}</td>
              <td>{{ l.actorId }}</td><td>{{ paciente(l.affectedResource) }}</td></tr>
          }
        </tbody>
      </table>
    }
  `,
  styles: [`
    h1 { color:var(--cs-navy); font-size:1.4rem; margin:0 0 .25rem; }
    .hint { color:var(--cs-slate); font-size:.85rem; margin:0 0 1.25rem; max-width:65ch; }
    table { width:100%; border-collapse:collapse; background:#fff; border:1px solid var(--cs-border); border-radius:12px; overflow:hidden; }
    th, td { padding:.55rem .75rem; text-align:left; border-bottom:1px solid var(--cs-border); font-size:.85rem; }
    th { background:var(--cs-surface); color:var(--cs-navy); font-size:.75rem; text-transform:uppercase; letter-spacing:.03em; }
    .empty { color:var(--cs-slate); }
  `],
})
export class AuditLogListComponent {
  readonly store = inject(AuditStore);
  private readonly patients = inject(PatientsStore);

  /** Traduce el identificador del paciente a su nombre para la lectura humana. */
  paciente(id: string): string {
    if (!id || id === '-') return 'No aplica';
    return this.patients.byId(id)?.fullName ?? id;
  }
}
