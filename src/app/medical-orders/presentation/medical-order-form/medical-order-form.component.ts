import { Component, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { MedicalOrdersStore } from '../../application/medical-orders.store';
import { MedicalOrder } from '../../domain/model/medical-order.entity';
import { Dosage } from '../../domain/model/dosage.vo';
import { PatientsStore } from '../../../patients/application/patients.store';
import { CurrentUser } from '../../../iam/domain/model/current-user';
import { DirectoryStore } from '../../../iam/application/directory.store';
import { Role } from '../../../iam/domain/model/role.enum';
import { PatientId } from '../../../shared/domain/model/identifier';
import { ChipComponent } from '../../../shared/presentation/risk-chip.component';
import { EmptyStateComponent } from '../../../shared/presentation/empty-state.component';

@Component({
  selector: 'cs-medical-order-form',
  standalone: true,
  imports: [FormsModule, DatePipe, ChipComponent, EmptyStateComponent],
  template: `
    <header class="page-head">
      <h1>Indicaciones medicas</h1>
      <p class="lead">
        Una indicacion no se edita: para cambiarla se emite una nueva que reemplaza a la
        anterior, y la anterior queda en el historial. El registro de cumplimiento lo hace
        enfermeria, nunca quien prescribio, porque su valor esta en acreditar que la orden
        llego a quien debia ejecutarla.
      </p>
    </header>

    <div class="grid grid--stats" style="margin-bottom:1.1rem">
      <div class="stat">
        <p class="stat__label">Vigentes</p>
        <p class="stat__value">{{ store.activeCount() }}</p>
      </div>
      <div class="stat" [class.stat--warning]="store.pendingCount() > 0">
        <p class="stat__label">Sin cumplimiento</p>
        <p class="stat__value">{{ store.pendingCount() }}</p>
        <p class="stat__hint">US-25 &middot; vigentes que nadie ha ejecutado</p>
      </div>
      <div class="stat">
        <p class="stat__label">Historial</p>
        <p class="stat__value">{{ store.orders().length }}</p>
      </div>
    </div>

    <div class="toolbar">
      <div class="field">
        <label for="filtro-paciente">Paciente</label>
        <select id="filtro-paciente" name="filtroPaciente" [(ngModel)]="filtro">
          <option value="">Todos los pacientes</option>
          @for (p of patients.patients(); track p.id.value) {
            <option [value]="p.id.value">{{ p.fullName }}</option>
          }
        </select>
      </div>
      <div class="field">
        <label for="filtro-estado">Mostrar</label>
        <select id="filtro-estado" name="filtroEstado" [(ngModel)]="vista">
          <option value="ACTIVE">Solo vigentes</option>
          <option value="PENDING">Solo sin cumplimiento</option>
          <option value="ALL">Vigentes y reemplazadas</option>
        </select>
      </div>
    </div>

    @if (error()) { <p class="notice notice--error" role="alert">{{ error() }}</p> }
    @if (ok()) { <p class="notice notice--ok" role="status">{{ ok() }}</p> }

    <section class="card card--flush">
      <div class="card__head"><h2>Indicaciones &middot; US-23 y US-25</h2></div>
      <div class="table-wrap">
        <table class="data">
          <thead>
            <tr>
              <th scope="col">Paciente</th>
              <th scope="col">Indicacion</th>
              <th scope="col">Via y frecuencia</th>
              <th scope="col">Prescrita</th>
              <th scope="col">Estado</th>
              <th scope="col">Cumplimiento</th>
              <th scope="col"><span class="sr-only">Acciones</span></th>
            </tr>
          </thead>
          <tbody>
            @for (o of visibles(); track o.id) {
              <tr>
                <th scope="row" style="font-weight:600">{{ patients.nameOf(o.patientId.value) }}</th>
                <td><strong>{{ o.dosage.medication }}</strong> {{ o.dosage.dose }}</td>
                <td class="muted">{{ o.dosage.route }} &middot; {{ o.dosage.frequency }}</td>
                <td class="mono">{{ o.prescribedAt | date:'dd/MM HH:mm' }}<br />
                  <span class="muted" style="font-size:.78rem">{{ directory.nameOf(o.prescribedBy.value) }}</span>
                </td>
                <td>
                  @if (o.isActive) { <cs-chip tone="normal" label="Vigente" /> }
                  @else { <cs-chip tone="neutral" label="Reemplazada" /> }
                </td>
                <td>
                  @if (o.fulfilledAt) {
                    <cs-chip tone="normal" label="Registrado" />
                    <span class="muted" style="display:block;font-size:.78rem">
                      {{ o.fulfilledAt | date:'dd/MM HH:mm' }} &middot; {{ directory.nameOf(o.fulfilledBy?.value) }}
                    </span>
                  } @else if (o.isActive) {
                    <cs-chip tone="warning" label="Pendiente" />
                  } @else { <span class="muted">&mdash;</span> }
                </td>
                <td>
                  @if (o.isPending) {
                    <button type="button" class="btn btn--primary btn--sm" (click)="cumplir(o)">
                      Registrar cumplimiento<span class="sr-only"> de {{ o.dosage.medication }}</span>
                    </button>
                  } @else { <span class="muted">&mdash;</span> }
                </td>
              </tr>
            } @empty {
              <tr><td colspan="7">
                <cs-empty title="No hay indicaciones con esos filtros"
                          detail="Cambia el paciente o el estado para ver otras." />
              </td></tr>
            }
          </tbody>
        </table>
      </div>
    </section>

    <form class="card" (ngSubmit)="emitir()" novalidate>
      <h2>Emitir indicacion &middot; US-22</h2>
      @if (!esMedico()) {
        <p class="notice notice--info">
          Solo un medico puede emitir una indicacion. Cambia el rol en la barra superior para
          usar este formulario; la regla la impone el agregado y no esta pantalla.
        </p>
      }
      <div class="form-grid">
        <div class="field">
          <label for="o-paciente">Paciente</label>
          <select id="o-paciente" name="oPaciente" [(ngModel)]="pacienteId" [disabled]="!esMedico()" required>
            @for (p of patients.patients(); track p.id.value) {
              <option [value]="p.id.value">{{ p.fullName }}</option>
            }
          </select>
        </div>
        <div class="field">
          <label for="o-med">Medicamento</label>
          <input id="o-med" name="oMed" [(ngModel)]="medicamento" [disabled]="!esMedico()" required />
        </div>
        <div class="field">
          <label for="o-dosis">Dosis</label>
          <input id="o-dosis" name="oDosis" [(ngModel)]="dosis" [disabled]="!esMedico()" required />
        </div>
        <div class="field">
          <label for="o-via">Via</label>
          <input id="o-via" name="oVia" [(ngModel)]="via" [disabled]="!esMedico()" required />
        </div>
        <div class="field">
          <label for="o-frec">Frecuencia</label>
          <input id="o-frec" name="oFrec" [(ngModel)]="frecuencia" [disabled]="!esMedico()" required />
        </div>
        <div class="field">
          <label for="o-reemplaza">Reemplaza a</label>
          <select id="o-reemplaza" name="oReemplaza" [(ngModel)]="reemplazaId" [disabled]="!esMedico()">
            <option value="">No reemplaza ninguna</option>
            @for (o of store.activeFor(pacienteId); track o.id) {
              <option [value]="o.id">{{ o.dosage.medication }} {{ o.dosage.dose }}</option>
            }
          </select>
          <span class="hint">La reemplazada pasa al historial y no vuelve a estar vigente.</span>
        </div>
      </div>
      <div class="form-actions">
        <button type="submit" class="btn btn--primary" [disabled]="!esMedico()">Emitir indicacion</button>
      </div>
    </form>
  `,
})
export class MedicalOrderFormComponent {
  readonly store = inject(MedicalOrdersStore);
  readonly patients = inject(PatientsStore);
  readonly directory = inject(DirectoryStore);
  private readonly user = inject(CurrentUser);

  private readonly _filtro = signal('');
  private readonly _vista = signal('ACTIVE');
  get filtro(): string { return this._filtro(); }
  set filtro(v: string) { this._filtro.set(v); }
  get vista(): string { return this._vista(); }
  set vista(v: string) { this._vista.set(v); }

  private readonly _paciente = signal('');
  get pacienteId(): string { return this._paciente() || (this.patients.patients()[0]?.id.value ?? ''); }
  set pacienteId(v: string) { this._paciente.set(v); this.reemplazaId = ''; }

  medicamento = ''; dosis = ''; via = 'Via oral'; frecuencia = 'Cada 24 horas'; reemplazaId = '';
  readonly error = signal(''); readonly ok = signal('');

  esMedico(): boolean { return this.user.role() === Role.Physician; }

  readonly visibles = computed(() => {
    const p = this._filtro(); const v = this._vista();
    return this.store.orders().filter(o => {
      if (p && o.patientId.value !== p) return false;
      if (v === 'ACTIVE') return o.isActive;
      if (v === 'PENDING') return o.isPending;
      return true;
    });
  });

  emitir(): void {
    this.error.set(''); this.ok.set('');
    try {
      this.store.issue(
        PatientId.of(this.pacienteId), this.user.id(), this.user.role(),
        Dosage.of(this.medicamento, this.dosis, this.via, this.frecuencia),
        this.reemplazaId || undefined,
      );
      this.ok.set('Indicacion emitida.');
      this.medicamento = ''; this.dosis = ''; this.reemplazaId = '';
    } catch (e) { this.error.set((e as Error).message); }
  }

  cumplir(o: MedicalOrder): void {
    this.error.set(''); this.ok.set('');
    try {
      this.store.fulfill(o, this.user.id());
      this.ok.set('Cumplimiento registrado.');
    } catch (e) { this.error.set((e as Error).message); }
  }
}
