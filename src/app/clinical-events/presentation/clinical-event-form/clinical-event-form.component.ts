import { Component, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { ClinicalEventsStore } from '../../application/clinical-events.store';
import {
  ClinicalEventType, ClinicalEventSeverity,
  CLINICAL_EVENT_TYPE_LABEL, CLINICAL_EVENT_SEVERITY_LABEL,
} from '../../domain/model/clinical-event-type.enum';
import { PatientsStore } from '../../../patients/application/patients.store';
import { MedicalOrdersStore } from '../../../medical-orders/application/medical-orders.store';
import { CurrentUser } from '../../../iam/domain/model/current-user';
import { DirectoryStore } from '../../../iam/application/directory.store';
import { PatientId } from '../../../shared/domain/model/identifier';
import { ChipComponent, ChipTone } from '../../../shared/presentation/risk-chip.component';
import { EmptyStateComponent } from '../../../shared/presentation/empty-state.component';
import { pacienteDeLaRuta } from '../../../shared/presentation/selected-patient';

const SEVERITY_TONE: Record<string, ChipTone> = {
  ROUTINE: 'neutral', NOTABLE: 'warning', CRITICAL: 'critical',
};

@Component({
  selector: 'cs-clinical-event-form',
  standalone: true,
  imports: [FormsModule, DatePipe, ChipComponent, EmptyStateComponent],
  template: `
    <header class="page-head">
      <h1>Registros del turno</h1>
      <p class="lead">
        Constancia de los medicamentos que administras y de los hechos relevantes del turno:
        un episodio de dolor, una complicacion, lo que observaste y que hiciste. Si marcas un
        registro como critico, el equipo recibe la alerta de inmediato.
      </p>
    </header>

    <div class="grid grid--2">
      <form class="card" (ngSubmit)="guardar()" novalidate>
        <h2>Nuevo registro</h2>

        <div class="field">
          <label for="tipo">Tipo de registro</label>
          <select id="tipo" name="tipo" [(ngModel)]="tipo">
            @for (t of tipos; track t) { <option [value]="t">{{ etiquetaTipo(t) }}</option> }
          </select>
        </div>

        <div class="field">
          <label for="paciente">Paciente</label>
          <select id="paciente" name="paciente" [(ngModel)]="pacienteId" required>
            @for (p of patients.patients(); track p.id.value) {
              <option [value]="p.id.value">{{ p.fullName }} &mdash; {{ p.location.toString() }}</option>
            }
          </select>
        </div>

        @if (esMedicamento()) {
          <div class="field">
            <label for="indicacion">Indicacion que lo origina</label>
            <select id="indicacion" name="indicacion" [(ngModel)]="indicacionId" (ngModelChange)="rellenarDesdeIndicacion()">
              <option value="">Sin indicacion asociada</option>
              @for (o of indicacionesDelPaciente(); track o.id) {
                <option [value]="o.id">{{ o.dosage.medication }} {{ o.dosage.dose }} &middot; {{ o.dosage.frequency }}</option>
              }
            </select>
            <span class="hint">Al elegir una indicacion se completan el medicamento y la dosis.</span>
          </div>
          <div class="form-grid">
            <div class="field">
              <label for="medicamento">Medicamento</label>
              <input id="medicamento" name="medicamento" [(ngModel)]="medicamento" required />
            </div>
            <div class="field">
              <label for="dosis">Dosis</label>
              <input id="dosis" name="dosis" [(ngModel)]="dosis" required />
            </div>
          </div>
        }

        <div class="field">
          <label for="gravedad">Gravedad</label>
          <select id="gravedad" name="gravedad" [(ngModel)]="gravedad">
            @for (s of gravedades; track s) { <option [value]="s">{{ etiquetaGravedad(s) }}</option> }
          </select>
          <span class="hint">Marcar como critico genera una alerta para el equipo.</span>
        </div>

        <div class="field">
          <label for="descripcion">Descripcion</label>
          <textarea id="descripcion" name="descripcion" [(ngModel)]="descripcion" required
                    placeholder="Que ocurrio, que se observo y que se hizo."></textarea>
        </div>

        @if (error()) { <p class="notice notice--error" role="alert">{{ error() }}</p> }
        @if (ok()) { <p class="notice notice--ok" role="status">{{ ok() }}</p> }

        <div class="form-actions">
          <button type="submit" class="btn btn--primary">Guardar registro</button>
          <span class="muted" style="font-size:.8rem">Firmado como {{ directory.nameOf(user.id().value) }}</span>
        </div>
      </form>

      <section class="card card--flush">
        <div class="card__head"><h2>Ultimos registros</h2></div>
        <div class="table-wrap">
          <table class="data">
            <thead>
              <tr>
                <th scope="col">Momento</th>
                <th scope="col">Paciente</th>
                <th scope="col">Registro</th>
                <th scope="col">Gravedad</th>
                <th scope="col">Responsable</th>
              </tr>
            </thead>
            <tbody>
              @for (e of store.events().slice(0, 12); track e.id) {
                <tr>
                  <td class="mono">{{ e.occurredAt | date:'dd/MM HH:mm' }}</td>
                  <th scope="row" style="font-weight:600">{{ patients.nameOf(e.patientId.value) }}</th>
                  <td>
                    @if (e.isMedication) {
                      <strong>{{ e.medication }} {{ e.dose }}</strong><br />
                    }
                    <span class="muted">{{ e.description }}</span>
                  </td>
                  <td><cs-chip [tone]="tonoGravedad(e.severity)" [label]="etiquetaGravedad(e.severity)" /></td>
                  <td class="muted">{{ directory.nameOf(e.recordedBy.value) }}</td>
                </tr>
              } @empty {
                <tr><td colspan="5">
                  <cs-empty title="Sin registros todavia"
                            detail="Los medicamentos administrados y los eventos del turno apareceran aqui." />
                </td></tr>
              }
            </tbody>
          </table>
        </div>
      </section>
    </div>
  `,
})
export class ClinicalEventFormComponent {
  readonly store = inject(ClinicalEventsStore);
  readonly patients = inject(PatientsStore);
  readonly orders = inject(MedicalOrdersStore);
  readonly directory = inject(DirectoryStore);
  readonly user = inject(CurrentUser);

  readonly tipos = Object.values(ClinicalEventType);
  readonly gravedades = Object.values(ClinicalEventSeverity);

  private readonly _tipo = signal<ClinicalEventType>(ClinicalEventType.MedicationAdministration);
  private readonly _paciente = signal(pacienteDeLaRuta());
  get tipo(): ClinicalEventType { return this._tipo(); }
  set tipo(v: ClinicalEventType) { this._tipo.set(v); }
  get pacienteId(): string { return this._paciente() || (this.patients.patients()[0]?.id.value ?? ''); }
  set pacienteId(v: string) { this._paciente.set(v); this.indicacionId = ''; }

  indicacionId = '';
  medicamento = '';
  dosis = '';
  gravedad: ClinicalEventSeverity = ClinicalEventSeverity.Routine;
  descripcion = '';

  readonly error = signal('');
  readonly ok = signal('');

  readonly esMedicamento = computed(() => this._tipo() === ClinicalEventType.MedicationAdministration);
  indicacionesDelPaciente() { return this.orders.activeFor(this.pacienteId); }

  rellenarDesdeIndicacion(): void {
    const orden = this.orders.orders().find(o => o.id === this.indicacionId);
    if (!orden) return;
    this.medicamento = orden.dosage.medication;
    this.dosis = orden.dosage.dose;
    if (!this.descripcion.trim()) {
      this.descripcion = `Administracion de ${orden.dosage.medication} ${orden.dosage.dose} por ${orden.dosage.route}, segun la indicacion vigente.`;
    }
  }

  etiquetaTipo(t: ClinicalEventType) { return CLINICAL_EVENT_TYPE_LABEL[t]; }
  etiquetaGravedad(s: string) { return CLINICAL_EVENT_SEVERITY_LABEL[s as ClinicalEventSeverity] ?? s; }
  tonoGravedad(s: string): ChipTone { return SEVERITY_TONE[s] ?? 'neutral'; }

  guardar(): void {
    this.error.set(''); this.ok.set('');
    try {
      this.store.record({
        patientId: PatientId.of(this.pacienteId),
        recordedBy: this.user.id(),
        type: this._tipo(),
        severity: this.gravedad,
        description: this.descripcion,
        medication: this.esMedicamento() ? this.medicamento : undefined,
        dose: this.esMedicamento() ? this.dosis : undefined,
        relatedOrderId: this.indicacionId || undefined,
      });
      this.ok.set(this.gravedad === ClinicalEventSeverity.Critical
        ? 'Registro guardado. Se genero una alerta critica para el equipo.'
        : 'Registro guardado.');
      this.descripcion = ''; this.indicacionId = ''; this.medicamento = ''; this.dosis = '';
      this.gravedad = ClinicalEventSeverity.Routine;
    } catch (e) {
      this.error.set((e as Error).message);
    }
  }
}
