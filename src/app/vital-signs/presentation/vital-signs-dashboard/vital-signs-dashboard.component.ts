import { Component, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { VitalSignsStore } from '../../application/vital-signs.store';
import { PatientsStore } from '../../../patients/application/patients.store';
import { VitalSignFormComponent } from '../vital-sign-form/vital-sign-form.component';

@Component({
  selector: 'cs-vital-signs-dashboard',
  standalone: true,
  imports: [DatePipe, VitalSignFormComponent],
  template: `
    <h1>Signos vitales</h1>
    <cs-vital-sign-form />

    <h2>Registros del turno</h2>
    @if (store.records().length === 0) {
      <p class="empty">Aun no hay registros en este turno.</p>
    } @else {
      <table>
        <caption class="sr-only">Registros de signos vitales del turno</caption>
        <thead>
          <tr><th scope="col">Hora</th><th scope="col">Paciente</th><th scope="col">PA</th>
          <th scope="col">FC</th><th scope="col">SpO2</th><th scope="col">T</th><th scope="col">Riesgo</th></tr>
        </thead>
        <tbody>
          @for (r of store.records(); track r.id) {
            <tr>
              <td>{{ r.measuredAt | date:'HH:mm:ss' }}</td>
              <td>{{ patients.byId(r.patientId.value)?.fullName ?? r.patientId.value }}</td>
              <td>{{ r.bloodPressure.toString() }}</td>
              <td>{{ r.heartRate }}</td>
              <td>{{ r.oxygenSaturation }}%</td>
              <td>{{ r.temperature }}</td>
              <td><span class="tag" [class]="'tag--' + r.riskLevel.toLowerCase()">{{ r.riskLevel }}</span></td>
            </tr>
          }
        </tbody>
      </table>
    }
  `,
  styleUrl: './vital-signs-dashboard.component.css',
})
export class VitalSignsDashboardComponent {
  readonly store = inject(VitalSignsStore);
  readonly patients = inject(PatientsStore);
}
