import { Component, inject, signal, computed } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuditStore } from '../../application/audit.store';
import { PatientsStore } from '../../../patients/application/patients.store';
import { DirectoryStore } from '../../../iam/application/directory.store';
import { EmptyStateComponent } from '../../../shared/presentation/empty-state.component';
import { pacienteDeLaRuta } from '../../../shared/presentation/selected-patient';

/** Traduccion del nombre tecnico del evento al vocabulario del turno (seccion 2.5). */
const ACCION_LEGIBLE: Record<string, string> = {
  PacienteAdmitido: 'Admision del paciente',
  PacienteDadoDeAlta: 'Alta del paciente',
  SignosVitalesRegistrados: 'Registro de signos vitales',
  NivelDeRiesgoClinicoEvaluado: 'Evaluacion del nivel de riesgo',
  AlertaCriticaGenerada: 'Alerta generada',
  AlertaAtendida: 'Alerta atendida',
  AlertaResuelta: 'Alerta resuelta',
  NuevaIndicacionMedicaRegistrada: 'Indicacion medica emitida',
  IndicacionMedicaReemplazada: 'Indicacion medica reemplazada',
  IndicacionMedicaCumplida: 'Cumplimiento de indicacion registrado',
  EntregaSbarRegistrada: 'Traspaso SBAR emitido',
  AcuseDeReciboConfirmado: 'Acuse de recibo del traspaso',
  EventoClinicoRegistrado: 'Anotacion clinica registrada',
  EventoClinicoCriticoRegistrado: 'Anotacion clinica critica',
};

@Component({
  selector: 'cs-audit-log-list',
  standalone: true,
  imports: [DatePipe, FormsModule, EmptyStateComponent],
  template: `
    <header class="page-head">
      <h1>Bitacora de auditoria</h1>
      <p class="lead">
        US-30, US-31 y US-32. Registro por anexion: las entradas no se modifican ni se borran,
        y las genera el sistema al consumir los eventos de dominio, nunca el usuario. Ningun
        contexto depende de la bitacora para completar su operacion.
      </p>
    </header>

    <div class="toolbar">
      <div class="field">
        <label for="a-paciente">Paciente &middot; US-32</label>
        <select id="a-paciente" name="aPaciente" [(ngModel)]="filtroPaciente">
          <option value="">Todos los pacientes</option>
          @for (p of patients.patients(); track p.id.value) {
            <option [value]="p.id.value">{{ p.fullName }}</option>
          }
        </select>
        <span class="hint">Filtrar por paciente muestra el historial completo de ese registro.</span>
      </div>
      <div class="field">
        <label for="a-accion">Tipo de accion</label>
        <select id="a-accion" name="aAccion" [(ngModel)]="filtroAccion">
          <option value="">Todas</option>
          @for (a of accionesPresentes(); track a) { <option [value]="a">{{ legible(a) }}</option> }
        </select>
      </div>
      <div class="field">
        <label for="a-actor">Responsable &middot; US-31</label>
        <select id="a-actor" name="aActor" [(ngModel)]="filtroActor">
          <option value="">Todos</option>
          @for (u of actoresPresentes(); track u) { <option [value]="u">{{ directory.nameOf(u) }}</option> }
        </select>
      </div>
    </div>

    <section class="card card--flush">
      <div class="table-wrap">
        <table class="data">
          <caption>{{ visibles().length }} entrada(s) de {{ store.count() }} registradas.</caption>
          <thead>
            <tr>
              <th scope="col">Momento</th>
              <th scope="col">Accion</th>
              <th scope="col">Paciente afectado</th>
              <th scope="col">Responsable</th>
            </tr>
          </thead>
          <tbody>
            @for (l of visibles().slice(0, 150); track l.id) {
              <tr>
                <td class="mono">{{ l.occurredAt | date:'dd/MM/yyyy HH:mm' }}</td>
                <th scope="row" style="font-weight:600">{{ legible(l.actionType) }}</th>
                <td>{{ nombrePaciente(l.affectedResource) }}</td>
                <td class="muted">{{ directory.nameOf(l.actorId) }}</td>
              </tr>
            } @empty {
              <tr><td colspan="4">
                <cs-empty title="No hay entradas con esos filtros"
                          detail="Prueba con otro paciente, otra accion u otro responsable." />
              </td></tr>
            }
          </tbody>
        </table>
      </div>
      @if (visibles().length > 150) {
        <p class="muted" style="padding:.8rem 1.25rem;font-size:.8rem;margin:0">
          Se muestran las 150 entradas mas recientes de {{ visibles().length }}. Afina los filtros para ver el resto.
        </p>
      }
    </section>
  `,
})
export class AuditLogListComponent {
  readonly store = inject(AuditStore);
  readonly patients = inject(PatientsStore);
  readonly directory = inject(DirectoryStore);

  private readonly paciente = signal(pacienteDeLaRuta());
  private readonly accion = signal('');
  private readonly actor = signal('');
  get filtroPaciente(): string { return this.paciente(); }
  set filtroPaciente(v: string) { this.paciente.set(v); }
  get filtroAccion(): string { return this.accion(); }
  set filtroAccion(v: string) { this.accion.set(v); }
  get filtroActor(): string { return this.actor(); }
  set filtroActor(v: string) { this.actor.set(v); }

  readonly visibles = computed(() => {
    const p = this.paciente(); const a = this.accion(); const u = this.actor();
    return this.store.logs().filter(l =>
      (!p || l.affectedResource === p) &&
      (!a || l.actionType === a) &&
      (!u || l.actorId === u));
  });

  readonly accionesPresentes = computed(
    () => [...new Set(this.store.logs().map(l => l.actionType))].sort());
  readonly actoresPresentes = computed(
    () => [...new Set(this.store.logs().map(l => l.actorId))].sort());

  legible(a: string): string { return ACCION_LEGIBLE[a] ?? a; }
  nombrePaciente(id: string): string {
    if (id === '-') return 'No aplica';
    return this.patients.byId(id)?.fullName ?? 'Paciente no identificado';
  }
}
