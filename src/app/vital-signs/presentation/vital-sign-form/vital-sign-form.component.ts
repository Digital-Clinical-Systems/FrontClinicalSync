import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PatientsStore } from '../../../patients/application/patients.store';
import { VitalSignsStore } from '../../application/vital-signs.store';
import { CurrentUser } from '../../../iam/domain/model/current-user';
import { DirectoryStore } from '../../../iam/application/directory.store';
import { BloodPressure } from '../../domain/model/blood-pressure.vo';
import { PatientId } from '../../../shared/domain/model/identifier';
import { RISK_LABEL } from '../../../shared/presentation/risk';
import { pacienteDeLaRuta } from '../../../shared/presentation/selected-patient';

@Component({
  selector: 'cs-vital-sign-form',
  standalone: true,
  imports: [FormsModule],
  template: `
    <form class="card" (ngSubmit)="submit()" novalidate>
      <h2>Registrar signos vitales</h2>
      <p class="muted" style="font-size:.84rem;margin-top:-.4rem">
        El estado del paciente no se elige: lo calcula el sistema a partir de los valores que
        ingreses. Si alguno sale de los rangos definidos para la unidad, la alerta se genera sola.
      </p>

      <div class="field">
        <label for="patient">Paciente</label>
        <select id="patient" name="patient" [(ngModel)]="patientId" required>
          @for (p of patients.patients(); track p.id.value) {
            <option [value]="p.id.value">{{ p.fullName }} &mdash; {{ p.location.toString() }}</option>
          }
        </select>
      </div>

      <div class="form-grid">
        <div class="field">
          <label for="sys">Sistolica (mmHg)</label>
          <input id="sys" name="sys" type="number" inputmode="numeric" [(ngModel)]="systolic" required />
        </div>
        <div class="field">
          <label for="dia">Diastolica (mmHg)</label>
          <input id="dia" name="dia" type="number" inputmode="numeric" [(ngModel)]="diastolic" required />
        </div>
        <div class="field">
          <label for="hr">Frecuencia cardiaca (lpm)</label>
          <input id="hr" name="hr" type="number" inputmode="numeric" [(ngModel)]="heartRate" required />
        </div>
        <div class="field">
          <label for="spo2">Saturacion de oxigeno (%)</label>
          <input id="spo2" name="spo2" type="number" inputmode="numeric" [(ngModel)]="oxygen" required />
        </div>
        <div class="field">
          <label for="temp">Temperatura (&deg;C)</label>
          <input id="temp" name="temp" type="number" step="0.1" inputmode="decimal" [(ngModel)]="temperature" required />
        </div>
      </div>

      @if (error()) { <p class="notice notice--error" role="alert">{{ error() }}</p> }
      @if (ok()) { <p class="notice notice--ok" role="status">{{ ok() }}</p> }

      <div class="form-actions">
        <button type="submit" class="btn btn--primary">Guardar registro</button>
        <span class="muted" style="font-size:.8rem">Firmado como {{ directory.nameOf(user.id().value) }}</span>
      </div>
    </form>
  `,
})
export class VitalSignFormComponent {
  readonly patients = inject(PatientsStore);
  private readonly store = inject(VitalSignsStore);
  readonly user = inject(CurrentUser);
  readonly directory = inject(DirectoryStore);

  private readonly _paciente = signal(pacienteDeLaRuta());
  get patientId(): string { return this._paciente() || (this.patients.patients()[0]?.id.value ?? ''); }
  set patientId(v: string) { this._paciente.set(v); }

  systolic = 120; diastolic = 75; heartRate = 78; oxygen = 97; temperature = 36.6;
  readonly error = signal(''); readonly ok = signal('');

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
      const etiqueta = RISK_LABEL[record.riskLevel] ?? record.riskLevel;
      this.ok.set(record.riskLevel === 'NORMAL'
        ? `Registro guardado. Estado evaluado: ${etiqueta}.`
        : `Registro guardado. Estado evaluado: ${etiqueta}. Se genero una alerta para el equipo.`);
    } catch (e) { this.error.set((e as Error).message); }
  }
}
