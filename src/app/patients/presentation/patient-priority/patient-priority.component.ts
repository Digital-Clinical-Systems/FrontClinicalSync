import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ShiftBoardFacade } from '../shift-board.facade';
import { ChipComponent } from '../../../shared/presentation/risk-chip.component';
import { EmptyStateComponent } from '../../../shared/presentation/empty-state.component';
import { RISK_TONE, RISK_LABEL } from '../../../shared/presentation/risk';

@Component({
  selector: 'cs-patient-priority',
  standalone: true,
  imports: [RouterLink, ChipComponent, EmptyStateComponent],
  template: `
    <header class="page-head">
      <h1>Pacientes por prioridad</h1>
      <p class="lead">
        El orden lo calcula el sistema y nadie lo asigna a mano: primero quien tiene la ultima
        medicion fuera de rango, luego quien acumula mas alertas sin cerrar y, en igualdad de
        condiciones, quien lleva mas tiempo sin que le tomen un control.
      </p>
    </header>

    <ol class="priority">
      @for (row of board.byPriority(); track row.patient.id.value; let i = $index) {
        <li class="card prio" [class.prio--critical]="row.risk === 'CRITICAL'"
                              [class.prio--warning]="row.risk === 'WARNING'">
          <span class="prio__rank" aria-hidden="true">{{ i + 1 }}</span>
          <div class="prio__body">
            <div class="prio__head">
              <h2>{{ row.patient.fullName }}</h2>
              @if (row.risk) {
                <cs-chip [tone]="tone(row.risk)" [label]="label(row.risk)" />
              } @else {
                <cs-chip tone="neutral" label="Sin medicion" />
              }
            </div>
            <p class="muted" style="font-size:.84rem;margin:0 0 .5rem">
              {{ row.patient.location.toString() }} &middot; {{ row.patient.admissionDiagnosis }}
            </p>
            <p class="reason">{{ motivo(row) }}</p>
          </div>
          <a class="btn btn--secondary btn--sm" [routerLink]="['/resumen-paciente']"
             [queryParams]="{ paciente: row.patient.id.value }">
            Ver resumen<span class="sr-only"> de {{ row.patient.fullName }}</span>
          </a>
        </li>
      } @empty {
        <cs-empty title="No hay pacientes en el turno" />
      }
    </ol>
  `,
  styles: [`
    .priority { list-style:none; margin:0; padding:0; }
    .prio { display:flex; gap:1rem; align-items:flex-start; border-left:4px solid var(--cs-border-strong); }
    .prio--critical { border-left-color: var(--cs-critical); }
    .prio--warning  { border-left-color: var(--cs-warning); }
    .prio__rank { font-size:1.3rem; font-weight:700; color:var(--cs-ink-3); min-width:1.5rem; font-variant-numeric:tabular-nums; }
    .prio__body { flex:1; min-width:0; }
    .prio__head { display:flex; flex-wrap:wrap; align-items:center; gap:.6rem; margin-bottom:.15rem; }
    .prio__head h2 { margin:0; font-size:1rem; }
    .reason { font-size:.85rem; color:var(--cs-ink-2); margin:0; }
  `],
})
export class PatientPriorityComponent {
  readonly board = inject(ShiftBoardFacade);
  tone(r: string) { return RISK_TONE[r] ?? 'neutral'; }
  label(r: string) { return RISK_LABEL[r] ?? r; }

  motivo(row: { risk: string | null; openAlerts: number; hoursSinceControl: number | null }): string {
    const partes: string[] = [];
    if (row.risk === 'CRITICAL') partes.push('la ultima medicion salio del rango critico');
    else if (row.risk === 'WARNING') partes.push('la ultima medicion esta fuera del rango habitual');
    else if (row.risk === 'NORMAL') partes.push('la ultima medicion esta dentro de rango');
    else partes.push('no tiene ninguna medicion registrada');
    if (row.openAlerts > 0) {
      partes.push(`${row.openAlerts} alerta${row.openAlerts > 1 ? 's' : ''} sin cerrar`);
    }
    if (row.hoursSinceControl !== null && row.hoursSinceControl > 6) {
      partes.push(`${Math.floor(row.hoursSinceControl)} horas sin control`);
    }
    return partes.join(' · ');
  }
}
