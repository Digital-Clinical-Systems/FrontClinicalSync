import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { ShiftBoardFacade } from '../shift-board.facade';
import { ChipComponent } from '../../../shared/presentation/risk-chip.component';
import { EmptyStateComponent } from '../../../shared/presentation/empty-state.component';
import { RISK_TONE, RISK_LABEL } from '../../../shared/presentation/risk';

@Component({
  selector: 'cs-patient-list',
  standalone: true,
  imports: [RouterLink, DecimalPipe, ChipComponent, EmptyStateComponent],
  template: `
    <header class="page-head">
      <h1>Pacientes del turno</h1>
      <p class="lead">
        Pacientes a cargo del turno, con el estado que arroja su ultima medicion.
        Entra al resumen de cualquiera para ver su evolucion, sus indicaciones y lo que
        se registro durante el turno.
      </p>
    </header>

    <div class="grid grid--stats" style="margin-bottom:1.1rem">
      <div class="stat">
        <p class="stat__label">Pacientes</p>
        <p class="stat__value">{{ board.rows().length }}</p>
      </div>
      <div class="stat" [class.stat--critical]="criticos() > 0">
        <p class="stat__label">En estado critico</p>
        <p class="stat__value">{{ criticos() }}</p>
        <p class="stat__hint">Segun la ultima medicion registrada</p>
      </div>
      <div class="stat" [class.stat--warning]="pendientes() > 0">
        <p class="stat__label">Registros pendientes</p>
        <p class="stat__value">{{ pendientes() }}</p>
        <p class="stat__hint">Ver documentacion pendiente</p>
      </div>
    </div>

    <section class="card card--flush">
      <div class="table-wrap">
        <table class="data">
          <caption>Un control se considera vencido pasadas 6 horas sin medicion.</caption>
          <thead>
            <tr>
              <th scope="col">Paciente</th>
              <th scope="col">Ubicacion</th>
              <th scope="col">Diagnostico de ingreso</th>
              <th scope="col">Estado</th>
              <th scope="col" class="num">Ultimo control</th>
              <th scope="col" class="num">Alertas</th>
              <th scope="col"><span class="sr-only">Acciones</span></th>
            </tr>
          </thead>
          <tbody>
            @for (row of board.rows(); track row.patient.id.value) {
              <tr>
                <th scope="row" style="font-weight:600">
                  {{ row.patient.fullName }}
                  <span class="muted" style="display:block;font-weight:400;font-size:.8rem">
                    {{ row.patient.medicalRecordNumber }}
                  </span>
                </th>
                <td>{{ row.patient.location.toString() }}</td>
                <td>{{ row.patient.admissionDiagnosis }}</td>
                <td>
                  @if (row.risk) {
                    <cs-chip [tone]="tone(row.risk)" [label]="label(row.risk)" />
                  } @else {
                    <cs-chip tone="neutral" label="Sin medicion" />
                  }
                </td>
                <td class="num">
                  @if (row.hoursSinceControl !== null) {
                    <span [class.overdue]="row.hoursSinceControl > 6">
                      hace {{ row.hoursSinceControl | number:'1.0-0' }} h
                    </span>
                  } @else { <span class="muted">&mdash;</span> }
                </td>
                <td class="num">
                  @if (row.openAlerts > 0) {
                    <cs-chip tone="critical" [label]="row.openAlerts + ' sin cerrar'" />
                  } @else { <span class="muted">0</span> }
                </td>
                <td>
                  <a class="btn btn--secondary btn--sm" [routerLink]="['/resumen-paciente']"
                     [queryParams]="{ paciente: row.patient.id.value }">
                    Ver resumen<span class="sr-only"> de {{ row.patient.fullName }}</span>
                  </a>
                </td>
              </tr>
            } @empty {
              <tr><td colspan="7">
                <cs-empty title="No hay pacientes asignados"
                          detail="Cuando el directorio registre una admision aparecera en esta lista." />
              </td></tr>
            }
          </tbody>
        </table>
      </div>
    </section>
  `,
  styles: [`.overdue { color: var(--cs-warning-ink); font-weight: 600; }`],
})
export class PatientListComponent {
  readonly board = inject(ShiftBoardFacade);
  readonly criticos = () => this.board.rows().filter(r => r.risk === 'CRITICAL').length;
  readonly pendientes = () => this.board.pendingCount();
  tone(r: string) { return RISK_TONE[r] ?? 'neutral'; }
  label(r: string) { return RISK_LABEL[r] ?? r; }
}
