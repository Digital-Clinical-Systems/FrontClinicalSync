import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ShiftBoardFacade } from '../shift-board.facade';
import { EmptyStateComponent } from '../../../shared/presentation/empty-state.component';

/** US-21. Que falta registrar, por paciente, y por que. */
@Component({
  selector: 'cs-pending-documentation',
  standalone: true,
  imports: [RouterLink, EmptyStateComponent],
  template: `
    <header class="page-head">
      <h1>Documentacion pendiente</h1>
      <p class="lead">
        Lo que el turno todavia no ha dejado registrado, paciente por paciente. Cada punto
        dice por que esta pendiente y lleva directo a la pantalla donde se resuelve, con el
        paciente ya seleccionado.
      </p>
    </header>

    <div class="grid grid--stats" style="margin-bottom:1.1rem">
      <div class="stat" [class.stat--warning]="board.pendingCount() > 0"
                        [class.stat--normal]="board.pendingCount() === 0">
        <p class="stat__label">Registros pendientes</p>
        <p class="stat__value">{{ board.pendingCount() }}</p>
      </div>
      <div class="stat">
        <p class="stat__label">Pacientes afectados</p>
        <p class="stat__value">{{ board.withPending().length }}</p>
        <p class="stat__hint">de {{ board.rows().length }} en el turno</p>
      </div>
    </div>

    @for (row of board.withPending(); track row.patient.id.value) {
      <section class="card">
        <div class="card__head">
          <h2>{{ row.patient.fullName }}
            <span class="muted" style="font-weight:400">&middot; {{ row.patient.location.toString() }}</span>
          </h2>
          <a class="btn btn--secondary btn--sm" [routerLink]="['/resumen-paciente']"
             [queryParams]="{ paciente: row.patient.id.value }">
            Ver resumen<span class="sr-only"> de {{ row.patient.fullName }}</span>
          </a>
        </div>
        <ul class="pending">
          @for (item of row.pending; track item.code) {
            <li>
              <span class="pending__label">{{ item.label }}</span>
              <span class="pending__detail">{{ item.detail }}</span>
              <a class="btn btn--secondary btn--sm" [routerLink]="item.accion.ruta"
                 [queryParams]="{ paciente: row.patient.id.value }">
                {{ item.accion.texto }}<span class="sr-only"> para {{ row.patient.fullName }}</span>
              </a>
            </li>
          }
        </ul>
      </section>
    } @empty {
      <section class="card">
        <cs-empty title="No hay documentacion pendiente"
                  detail="Todos los pacientes del turno tienen su control al dia, sus indicaciones con cumplimiento registrado y sus traspasos acusados." />
      </section>
    }
  `,
  styles: [`
    .pending { list-style:none; margin:0; padding:0; display:grid; gap:.55rem; }
    .pending li { border-left:3px solid var(--cs-warning); padding-left:.75rem; }
    .pending__label { display:block; font-weight:600; font-size:.88rem; }
    .pending__detail { display:block; font-size:.82rem; color:var(--cs-ink-2); margin-bottom:.35rem; }
  `],
})
export class PendingDocumentationComponent {
  readonly board = inject(ShiftBoardFacade);
}
