import { Component, inject, signal, computed } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AlertsStore } from '../../application/alerts.store';
import { Alert } from '../../domain/model/alert.entity';
import { AlertStatus } from '../../domain/model/alert-status.enum';
import { PatientsStore } from '../../../patients/application/patients.store';
import { CurrentUser } from '../../../iam/domain/model/current-user';
import { DirectoryStore } from '../../../iam/application/directory.store';
import { ChipComponent } from '../../../shared/presentation/risk-chip.component';
import { EmptyStateComponent } from '../../../shared/presentation/empty-state.component';
import { ALERT_STATUS_LABEL, ALERT_STATUS_TONE, RISK_TONE, RISK_LABEL } from '../../../shared/presentation/risk';

@Component({
  selector: 'cs-alert-list',
  standalone: true,
  imports: [DatePipe, FormsModule, ChipComponent, EmptyStateComponent],
  template: `
    <header class="page-head">
      <h1>Alertas clinicas</h1>
      <p class="lead">
        US-28. Las genera el sistema cuando una medicion sale de umbral o cuando se registra
        un evento clinico critico. Una alerta no se resuelve sin haber sido atendida antes:
        esa regla vive en el agregado y no en esta pantalla.
      </p>
    </header>

    <div class="grid grid--stats" style="margin-bottom:1.1rem">
      <div class="stat" [class.stat--critical]="store.openCount() > 0">
        <p class="stat__label">Sin atender</p>
        <p class="stat__value">{{ store.openCount() }}</p>
      </div>
      <div class="stat">
        <p class="stat__label">Criticas abiertas</p>
        <p class="stat__value">{{ store.criticalOpenCount() }}</p>
      </div>
      <div class="stat">
        <p class="stat__label">Registradas en total</p>
        <p class="stat__value">{{ store.alerts().length }}</p>
      </div>
    </div>

    <div class="toolbar">
      <div class="field">
        <label for="f-estado">Estado</label>
        <select id="f-estado" [(ngModel)]="filtroEstado" name="estado">
          <option value="PENDIENTES">Abiertas y atendidas</option>
          <option value="OPEN">Solo sin atender</option>
          <option value="ACKNOWLEDGED">Solo atendidas</option>
          <option value="RESOLVED">Solo resueltas</option>
          <option value="TODAS">Todas</option>
        </select>
      </div>
      <div class="field">
        <label for="f-paciente">Paciente</label>
        <select id="f-paciente" [(ngModel)]="filtroPaciente" name="paciente">
          <option value="">Todos</option>
          @for (p of patients.patients(); track p.id.value) {
            <option [value]="p.id.value">{{ p.fullName }}</option>
          }
        </select>
      </div>
    </div>

    @if (error()) { <p class="notice notice--error" role="alert">{{ error() }}</p> }

    <section class="card card--flush">
      <div class="table-wrap">
        <table class="data">
          <caption>{{ visibles().length }} alerta(s) con los filtros aplicados.</caption>
          <thead>
            <tr>
              <th scope="col">Paciente</th>
              <th scope="col">Gravedad</th>
              <th scope="col">Motivo</th>
              <th scope="col">Origen</th>
              <th scope="col">Generada</th>
              <th scope="col">Estado</th>
              <th scope="col">Atendida por</th>
              <th scope="col"><span class="sr-only">Acciones</span></th>
            </tr>
          </thead>
          <tbody>
            @for (a of visibles(); track a.id) {
              <tr>
                <th scope="row" style="font-weight:600">{{ patients.nameOf(a.patientId.value) }}</th>
                <td><cs-chip [tone]="tono(a.severity)" [label]="etiqueta(a.severity)" /></td>
                <td>{{ a.reason }}</td>
                <td class="muted">{{ a.originLabel }}</td>
                <td class="mono">{{ a.raisedAt | date:'dd/MM HH:mm' }}</td>
                <td><cs-chip [tone]="tonoEstado(a.status)" [label]="etiquetaEstado(a.status)" /></td>
                <td class="muted">{{ directory.nameOf(a.acknowledgedBy?.value) }}</td>
                <td>
                  @if (a.status === 'OPEN') {
                    <button type="button" class="btn btn--primary btn--sm" (click)="atender(a)">
                      Atender<span class="sr-only"> la alerta de {{ patients.nameOf(a.patientId.value) }}</span>
                    </button>
                  } @else if (a.status === 'ACKNOWLEDGED') {
                    <button type="button" class="btn btn--secondary btn--sm" (click)="resolver(a)">
                      Resolver<span class="sr-only"> la alerta de {{ patients.nameOf(a.patientId.value) }}</span>
                    </button>
                  } @else { <span class="muted">&mdash;</span> }
                </td>
              </tr>
            } @empty {
              <tr><td colspan="8">
                <cs-empty title="No hay alertas con esos filtros"
                          detail="Cambia el estado o el paciente para ver otras." />
              </td></tr>
            }
          </tbody>
        </table>
      </div>
    </section>
  `,
})
export class AlertListComponent {
  readonly store = inject(AlertsStore);
  readonly patients = inject(PatientsStore);
  readonly directory = inject(DirectoryStore);
  private readonly user = inject(CurrentUser);

  readonly error = signal('');
  private readonly estado = signal('PENDIENTES');
  private readonly paciente = signal('');

  get filtroEstado(): string { return this.estado(); }
  set filtroEstado(v: string) { this.estado.set(v); }
  get filtroPaciente(): string { return this.paciente(); }
  set filtroPaciente(v: string) { this.paciente.set(v); }

  readonly visibles = computed(() => {
    const e = this.estado(); const p = this.paciente();
    return this.store.alerts().filter(a => {
      if (p && a.patientId.value !== p) return false;
      if (e === 'TODAS') return true;
      if (e === 'PENDIENTES') return a.status !== AlertStatus.Resolved;
      return a.status === e;
    });
  });

  tono(s: string) { return RISK_TONE[s] ?? 'neutral'; }
  etiqueta(s: string) { return RISK_LABEL[s] ?? s; }
  tonoEstado(s: string) { return ALERT_STATUS_TONE[s] ?? 'neutral'; }
  etiquetaEstado(s: string) { return ALERT_STATUS_LABEL[s] ?? s; }

  atender(a: Alert): void {
    this.error.set('');
    try { this.store.acknowledge(a, this.user.id()); }
    catch (e) { this.error.set((e as Error).message); }
  }
  resolver(a: Alert): void {
    this.error.set('');
    try { this.store.resolve(a, this.user.id()); }
    catch (e) { this.error.set((e as Error).message); }
  }
}
