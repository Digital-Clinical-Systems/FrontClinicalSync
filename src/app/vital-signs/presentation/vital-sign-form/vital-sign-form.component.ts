import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PatientsStore } from '../../../patients/application/patients.store';
import { VitalSignsStore } from '../../application/vital-signs.store';
import { CurrentUser } from '../../../iam/domain/model/current-user';
import { BloodPressure } from '../../domain/model/blood-pressure.vo';
import { PatientId } from '../../../shared/domain/model/identifier';

@Component({
  selector: 'cs-vital-sign-form',
  standalone: true,
  imports: [FormsModule],
  template: `
    <form class="card" (ngSubmit)="submit()" #f="ngForm" novalidate>
      <h2>Registrar signos vitales</h2>
      <p class="hint">US-17 &middot; El nivel de riesgo lo calcula el dominio: no se elige aqui.</p>

      <label for="patient">Paciente</label>
      <select id="patient" name="patient" [(ngModel)]="patientId" required>
        @for (p of patients.patients(); track p.id.value) {
          <option [value]="p.id.value">{{ p.fullName }} &mdash; {{ p.location.toString() }}</option>
        }
      </select>

      <div class="grid">
        <div>
          <label for="sys">Sistolica (mmHg)</label>
          <input id="sys" name="sys" type="number" [(ngModel)]="systolic" required />
        </div>
        <div>
          <label for="dia">Diastolica (mmHg)</label>
          <input id="dia" name="dia" type="number" [(ngModel)]="diastolic" required />
        </div>
        <div>
          <label for="hr">Frecuencia cardiaca (lpm)</label>
          <input id="hr" name="hr" type="number" [(ngModel)]="heartRate" required />
        </div>
        <div>
          <label for="spo2">Saturacion (%)</label>
          <input id="spo2" name="spo2" type="number" [(ngModel)]="oxygen" required />
        </div>
        <div>
          <label for="temp">Temperatura (&deg;C)</label>
          <input id="temp" name="temp" type="number" step="0.1" [(ngModel)]="temperature" required />
        </div>
      </div>

      @if (error()) {
        <p class="error" role="alert">{{ error() }}</p>
      }
      @if (ok()) {
        <p class="ok" role="status">Registro guardado. Riesgo evaluado: <strong>{{ ok() }}</strong></p>
      }
      <button type="submit">Guardar registro</button>
    </form>
  `,
  styleUrl: './vital-sign-form.component.css',
})
export class VitalSignFormComponent {
  readonly patients = inject(PatientsStore);
  private readonly store = inject(VitalSignsStore);
  private readonly user = inject(CurrentUser);

  patientId = this.patients.patients()[0]?.id.value ?? '';
  systolic = 120; diastolic = 75; heartRate = 78; oxygen = 97; temperature = 36.6;

  readonly error = signal('');
  readonly ok = signal('');

  submit(): void {
    this.error.set(''); this.ok.set('');
    try {
      const record = this.store.register({
        patientId: PatientId.of(this.patientId),
        recordedBy: this.user.id(),
        bloodPressure: BloodPressure.of(this.systolic, this.diastolic),
        heartRate: this.heartRate,
        oxygenSaturation: this.oxygen,
        temperature: this.temperature,
      });
      this.ok.set(record.riskLevel);
    } catch (e) {
      this.error.set((e as Error).message);
    }
  }
}
