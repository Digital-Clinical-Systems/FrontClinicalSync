import { Component, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { HandoverStore } from '../../application/handover.store';
import { Handover } from '../../domain/model/handover.entity';
import { SbarContent } from '../../domain/model/sbar-content.vo';
import { PatientsStore } from '../../../patients/application/patients.store';
import { VitalSignsStore } from '../../../vital-signs/application/vital-signs.store';
import { AlertsStore } from '../../../alerts/application/alerts.store';
import { MedicalOrdersStore } from '../../../medical-orders/application/medical-orders.store';
import { ClinicalEventsStore } from '../../../clinical-events/application/clinical-events.store';
import { CurrentUser } from '../../../iam/domain/model/current-user';
import { DirectoryStore } from '../../../iam/application/directory.store';
import { Permissions, Permiso } from '../../../iam/application/permissions';
import { PatientId, UserId } from '../../../shared/domain/model/identifier';
import { ChipComponent } from '../../../shared/presentation/risk-chip.component';
import { EmptyStateComponent } from '../../../shared/presentation/empty-state.component';
import { HANDOVER_STATUS_LABEL, HANDOVER_STATUS_TONE } from '../../../shared/presentation/risk';

@Component({
  selector: 'cs-handover-form',
  standalone: true,
  imports: [FormsModule, DatePipe, ChipComponent, EmptyStateComponent],
  template: `
    <header class="page-head">
      <h1>Traspasos SBAR</h1>
      <p class="lead">
        La entrega del turno en formato SBAR: situacion, antecedentes, evaluacion y recomendacion.
        Las cuatro secciones son obligatorias, y el traspaso no se da por recibido hasta que el
        enfermero entrante lo confirma.
      </p>
    </header>

    <section class="card">
      <div class="card__head">
        <h2>Recibidos por mi</h2>
        <span class="muted" style="font-size:.82rem">{{ directory.nameOf(user.id().value) }}</span>
      </div>
      @if (error()) { <p class="notice notice--error" role="alert">{{ error() }}</p> }
      @if (ok()) { <p class="notice notice--ok" role="status">{{ ok() }}</p> }

      @for (h of recibidos(); track h.id) {
        <article class="sbar" [class.sbar--pending]="h.isPending">
          <div class="sbar__head">
            <h3>{{ patients.nameOf(h.patientId.value) }}</h3>
            <cs-chip [tone]="tono(h.status)" [label]="etiqueta(h.status)" />
            <span class="muted" style="font-size:.8rem">
              Emitido {{ h.issuedAt | date:'dd/MM HH:mm' }} por {{ directory.nameOf(h.outgoingNurseId.value) }}
            </span>
          </div>
          <dl class="sbar__body">
            <div><dt>Situacion</dt><dd>{{ h.content.situation }}</dd></div>
            <div><dt>Antecedentes</dt><dd>{{ h.content.background }}</dd></div>
            <div><dt>Evaluacion</dt><dd>{{ h.content.assessment }}</dd></div>
            <div><dt>Recomendacion</dt><dd>{{ h.content.recommendation }}</dd></div>
          </dl>
          @if (h.isPending) {
            @if (permisoAcusar(h); as permiso) {
              <button type="button" class="btn btn--primary btn--sm"
                      [disabled]="!permiso.permitido" (click)="acusar(h)">
                Acusar recibo<span class="sr-only"> del traspaso de {{ patients.nameOf(h.patientId.value) }}</span>
              </button>
              @if (!permiso.permitido) { <p class="motivo">{{ permiso.motivo }}</p> }
            }
          } @else {
            <p class="muted" style="font-size:.8rem;margin:0">
              Acusado el {{ h.acknowledgedAt | date:'dd/MM/yyyy HH:mm' }}.
            </p>
          }
        </article>
      } @empty {
        <cs-empty title="No tienes traspasos dirigidos a ti"
                  detail="Los traspasos que otro enfermero te emita apareceran aqui para que confirmes su recepcion." />
      }
    </section>

    <form class="card" (ngSubmit)="emitir()" novalidate>
      <h2>Emitir traspaso</h2>
      @if (!puedeEmitir().permitido) {
        <p class="notice notice--info">
          {{ puedeEmitir().motivo }}
        </p>
      }

      <div class="form-grid">
        <div class="field">
          <label for="h-paciente">Paciente</label>
          <select id="h-paciente" name="hPaciente" [(ngModel)]="pacienteId" [disabled]="!puedeEmitir().permitido">
            @for (p of patients.patients(); track p.id.value) {
              <option [value]="p.id.value">{{ p.fullName }} &mdash; {{ p.location.toString() }}</option>
            }
          </select>
        </div>
        <div class="field">
          <label for="h-entrante">Enfermero entrante</label>
          <select id="h-entrante" name="hEntrante" [(ngModel)]="entranteId" [disabled]="!puedeEmitir().permitido">
            <option value="">Selecciona</option>
            @for (u of entrantesPosibles(); track u.id) {
              <option [value]="u.id">{{ u.fullName }}@if (u.shift) { &mdash; {{ u.shift }} }</option>
            }
          </select>
          <span class="hint">Nadie se entrega el turno a si mismo: tu identidad no aparece en la lista.</span>
        </div>
      </div>

      <div class="form-actions" style="margin-bottom:.8rem">
        <button type="button" class="btn btn--secondary" [disabled]="!puedeEmitir().permitido" (click)="prellenar()">
          Pre-llenar con lo registrado
        </button>
        <span class="muted" style="font-size:.8rem">
          Arma el borrador con la ultima medicion, las alertas sin cerrar, las indicaciones
          vigentes y lo anotado en el turno. Revisalo antes de emitirlo.
        </span>
      </div>

      <div class="field">
        <label for="s">Situacion</label>
        <textarea id="s" name="s" [disabled]="!puedeEmitir().permitido" [(ngModel)]="situacion" required></textarea>
      </div>
      <div class="field">
        <label for="b">Antecedentes</label>
        <textarea id="b" name="b" [disabled]="!puedeEmitir().permitido" [(ngModel)]="antecedentes" required></textarea>
      </div>
      <div class="field">
        <label for="a">Evaluacion</label>
        <textarea id="a" name="a" [disabled]="!puedeEmitir().permitido" [(ngModel)]="evaluacion" required></textarea>
      </div>
      <div class="field">
        <label for="r">Recomendacion</label>
        <textarea id="r" name="r" [disabled]="!puedeEmitir().permitido" [(ngModel)]="recomendacion" required></textarea>
      </div>

      <div class="form-actions">
        <button type="submit" class="btn btn--primary" [disabled]="!puedeEmitir().permitido">Emitir traspaso</button>
      </div>
    </form>

    <section class="card card--flush">
      <div class="card__head"><h2>Traspasos del servicio</h2></div>
      <div class="table-wrap">
        <table class="data">
          <thead>
            <tr>
              <th scope="col">Paciente</th>
              <th scope="col">Emitido</th>
              <th scope="col">Saliente</th>
              <th scope="col">Entrante</th>
              <th scope="col">Estado</th>
            </tr>
          </thead>
          <tbody>
            @for (h of store.handovers(); track h.id) {
              <tr>
                <th scope="row" style="font-weight:600">{{ patients.nameOf(h.patientId.value) }}</th>
                <td class="mono">{{ h.issuedAt | date:'dd/MM HH:mm' }}</td>
                <td class="muted">{{ directory.nameOf(h.outgoingNurseId.value) }}</td>
                <td class="muted">{{ directory.nameOf(h.incomingNurseId.value) }}</td>
                <td><cs-chip [tone]="tono(h.status)" [label]="etiqueta(h.status)" /></td>
              </tr>
            } @empty {
              <tr><td colspan="5"><cs-empty title="Sin traspasos registrados" /></td></tr>
            }
          </tbody>
        </table>
      </div>
    </section>
  `,
  styles: [`
    .sbar { border:1px solid var(--cs-border); border-left:4px solid var(--cs-border-strong);
      border-radius:8px; padding:.9rem 1rem; margin-bottom:.8rem; }
    .sbar--pending { border-left-color: var(--cs-warning); background: var(--cs-warning-bg); }
    .sbar__head { display:flex; flex-wrap:wrap; align-items:center; gap:.6rem; margin-bottom:.6rem; }
    .sbar__head h3 { margin:0; font-size:.95rem; }
    .sbar__body { display:grid; gap:.5rem; margin:0 0 .8rem; }
    .sbar__body dt { font-size:.72rem; text-transform:uppercase; letter-spacing:.05em; color:var(--cs-ink-3); font-weight:600; }
    .sbar__body dd { margin:0; font-size:.86rem; }
    .motivo { font-size:.76rem; color:var(--cs-ink-2); margin:.4rem 0 0; max-width:60ch; }
  `],
})
export class HandoverFormComponent {
  readonly store = inject(HandoverStore);
  readonly patients = inject(PatientsStore);
  readonly directory = inject(DirectoryStore);
  readonly permisos = inject(Permissions);
  readonly user = inject(CurrentUser);
  private readonly vitals = inject(VitalSignsStore);
  private readonly alerts = inject(AlertsStore);
  private readonly orders = inject(MedicalOrdersStore);
  private readonly events = inject(ClinicalEventsStore);

  private readonly _paciente = signal('');
  get pacienteId(): string { return this._paciente() || (this.patients.patients()[0]?.id.value ?? ''); }
  set pacienteId(v: string) { this._paciente.set(v); }

  entranteId = '';
  situacion = ''; antecedentes = ''; evaluacion = ''; recomendacion = '';
  readonly error = signal(''); readonly ok = signal('');

  readonly recibidos = computed(() => this.store.receivedBy(this.user.id().value));
  entrantesPosibles() { return this.directory.nursesOtherThan(this.user.id().value); }

  puedeEmitir(): Permiso { return this.permisos.emitirTraspaso(); }
  permisoAcusar(h: Handover): Permiso {
    return this.permisos.acusarTraspaso(h.incomingNurseId.value, !h.isPending);
  }

  tono(s: string) { return HANDOVER_STATUS_TONE[s] ?? 'neutral'; }
  etiqueta(s: string) { return HANDOVER_STATUS_LABEL[s] ?? s; }

  /**
   * US-16. Compone el borrador con lo que el turno ya registro. No inventa
   * contenido clinico: cada frase procede de un dato existente, y si un dato
   * falta la frase lo dice en lugar de omitirlo, para que el enfermero saliente
   * vea el hueco antes de firmar el traspaso.
   */
  prellenar(): void {
    const id = this.pacienteId;
    const paciente = this.patients.byId(id);
    if (!paciente) return;

    const ultima = this.vitals.latestFor(id);
    const abiertas = this.alerts.openFor(id);
    const vigentes = this.orders.activeFor(id);
    const anotaciones = this.events.forPatient(id).slice(0, 3);

    this.situacion = ultima
      ? `${paciente.fullName}, en ${paciente.location.toString()}. Ultimo control a las `
        + `${ultima.measuredAt.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}: `
        + `PA ${ultima.bloodPressure.toString()} mmHg, FC ${ultima.heartRate} lpm, `
        + `SpO2 ${ultima.oxygenSaturation} %, T ${ultima.temperature} C.`
      : `${paciente.fullName}, en ${paciente.location.toString()}. Sin control de signos vitales registrado en el turno.`;

    this.antecedentes = `Ingreso por ${paciente.admissionDiagnosis}. `
      + (vigentes.length
        ? `Indicaciones vigentes: ${vigentes.map(o => `${o.dosage.medication} ${o.dosage.dose} ${o.dosage.frequency}`).join('; ')}.`
        : 'Sin indicaciones medicas vigentes.');

    this.evaluacion = (ultima ? `Nivel de riesgo derivado de la ultima medicion: ${ultima.riskLevel}. ` : '')
      + (abiertas.length
        ? `${abiertas.length} alerta(s) sin cerrar: ${abiertas.map(a => a.reason).join('; ')}.`
        : 'Sin alertas sin cerrar.')
      + (anotaciones.length
        ? ` Anotaciones recientes: ${anotaciones.map(e => e.description).join(' ')}`
        : ' Sin anotaciones clinicas en el turno.');

    const pendientes = this.orders.forPatient(id).filter(o => o.isPending);
    this.recomendacion = pendientes.length
      ? `Queda(n) pendiente(s) de ejecucion: ${pendientes.map(o => `${o.dosage.medication} ${o.dosage.dose}`).join('; ')}. Registrar el cumplimiento al administrarla(s).`
      : 'Mantener el control segun el intervalo definido y registrar cualquier cambio en la bitacora del paciente.';

    this.ok.set('Borrador compuesto con los datos registrados. Revisalo y corrigelo antes de emitirlo.');
  }

  emitir(): void {
    this.error.set(''); this.ok.set('');
    try {
      this.store.issue(
        PatientId.of(this.pacienteId), this.user.id(), this.user.role(), UserId.of(this.entranteId),
        SbarContent.of(this.situacion, this.antecedentes, this.evaluacion, this.recomendacion),
      );
      this.ok.set('Traspaso emitido. Queda pendiente del acuse del enfermero entrante.');
      this.situacion = ''; this.antecedentes = ''; this.evaluacion = ''; this.recomendacion = '';
    } catch (e) { this.error.set((e as Error).message); }
  }

  acusar(h: Handover): void {
    this.error.set(''); this.ok.set('');
    try {
      this.store.acknowledge(h, this.user.id());
      this.ok.set('Acuse de recibo registrado.');
    } catch (e) { this.error.set((e as Error).message); }
  }
}
