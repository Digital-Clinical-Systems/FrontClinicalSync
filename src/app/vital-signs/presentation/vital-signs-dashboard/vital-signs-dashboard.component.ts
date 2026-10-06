import { Component, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { VitalSignsStore } from '../../application/vital-signs.store';
import { PatientsStore } from '../../../patients/application/patients.store';
import { DirectoryStore } from '../../../iam/application/directory.store';
import { VitalSignFormComponent } from '../vital-sign-form/vital-sign-form.component';
import { ChipComponent } from '../../../shared/presentation/risk-chip.component';
import { EmptyStateComponent } from '../../../shared/presentation/empty-state.component';
import { RISK_TONE, RISK_LABEL } from '../../../shared/presentation/risk';

@Component({
  selector: 'cs-vital-signs-dashboard',
  standalone: true,
  imports: [DatePipe, VitalSignFormComponent, ChipComponent, EmptyStateComponent],
  template: `
    <header class="page-head">
      <h1>Signos vitales</h1>
      <p class="lead">
        Registro junto a la cama y ultimas mediciones del servicio. Una medicion no se edita:
        corregirla significa registrar una nueva, porque la historia clinica debe conservar
        lo que se anoto en su momento.
      </p>
    </header>

    <div class="grid grid--stats" style="margin-bottom:1.1rem">
      <div class="stat">
        <p class="stat__label">Mediciones registradas</p>
        <p class="stat__value">{{ store.records().length }}</p>
      </div>
      <div class="stat" [class.stat--critical]="store.criticalCount() > 0">
        <p class="stat__label">En rango critico</p>
        <p class="stat__value">{{ store.criticalCount() }}</p>
      </div>
    </div>

    <cs-vital-sign-form />

    <section class="card card--flush">
      <div class="card__head"><h2 style="margin:0">Ultimas mediciones del servicio</h2></div>
      <div class="table-wrap">
        <table class="data">
          <thead>
            <tr>
              <th scope="col">Momento</th>
              <th scope="col">Paciente</th>
              <th scope="col" class="num">PA (mmHg)</th>
              <th scope="col" class="num">FC (lpm)</th>
              <th scope="col" class="num">SpO2 (%)</th>
              <th scope="col" class="num">T (C)</th>
              <th scope="col">Estado</th>
              <th scope="col">Responsable</th>
            </tr>
          </thead>
          <tbody>
            @for (r of store.records().slice(0, 20); track r.id) {
              <tr>
                <td class="mono">{{ r.measuredAt | date:'dd/MM HH:mm' }}</td>
                <th scope="row" style="font-weight:600">{{ patients.nameOf(r.patientId.value) }}</th>
                <td class="num">{{ r.bloodPressure.toString() }}</td>
                <td class="num">{{ r.heartRate }}</td>
                <td class="num">{{ r.oxygenSaturation }}</td>
                <td class="num">{{ r.temperature }}</td>
                <td><cs-chip [tone]="tono(r.riskLevel)" [label]="etiqueta(r.riskLevel)" /></td>
                <td class="muted">{{ directory.nameOf(r.recordedBy.value) }}</td>
              </tr>
            } @empty {
              <tr><td colspan="8"><cs-empty title="Sin mediciones registradas"
                    detail="La primera medicion que guardes aparecera en esta tabla." /></td></tr>
            }
          </tbody>
        </table>
      </div>
    </section>
  `,
})
export class VitalSignsDashboardComponent {
  readonly store = inject(VitalSignsStore);
  readonly patients = inject(PatientsStore);
  readonly directory = inject(DirectoryStore);
  tono(r: string) { return RISK_TONE[r] ?? 'neutral'; }
  etiqueta(r: string) { return RISK_LABEL[r] ?? r; }
}
