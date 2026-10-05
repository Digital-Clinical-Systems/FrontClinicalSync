import { Component, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { MedicalOrdersStore } from '../../application/medical-orders.store';
import { PatientsStore } from '../../../patients/application/patients.store';
import { CurrentUser } from '../../../iam/domain/model/current-user';
import { Role } from '../../../iam/domain/model/role.enum';
import { Dosage } from '../../domain/model/dosage.vo';
import { OrderStatus } from '../../domain/model/order-status.enum';
import { PatientId } from '../../../shared/domain/model/identifier';

@Component({
  selector: 'cs-medical-order-form',
  standalone: true,
  imports: [FormsModule, DatePipe],
  template: `
    <h1>Indicaciones medicas</h1>
    <p class="hint">US-22 &middot; El medico emite la indicacion y queda visible para enfermeria.
      Si reemplaza a otra, la anterior se conserva en el historial. Las reglas viven en el dominio.</p>

    @if (isPhysician()) {
      <form class="card" (ngSubmit)="submit()" novalidate>
        <label for="patient">Paciente</label>
        <select id="patient" name="patient" [(ngModel)]="patientId" (ngModelChange)="replaces = ''" required>
          @for (p of patients.patients(); track p.id.value) {
            <option [value]="p.id.value">{{ p.fullName }} &mdash; {{ p.location.toString() }}</option>
          }
        </select>

        <label for="medication">Medicamento</label>
        <input id="medication" name="medication" [(ngModel)]="medication" />
        <div class="row">
          <div>
            <label for="dose">Dosis</label>
            <input id="dose" name="dose" [(ngModel)]="dose" placeholder="40 mg" />
          </div>
          <div>
            <label for="route">Via</label>
            <input id="route" name="route" [(ngModel)]="route" placeholder="Subcutanea" />
          </div>
        </div>
        <label for="frequency">Frecuencia</label>
        <input id="frequency" name="frequency" [(ngModel)]="frequency" placeholder="Cada 24 h" />

        <label for="replaces">Reemplaza a (opcional)</label>
        <select id="replaces" name="replaces" [(ngModel)]="replaces">
          <option value="">Ninguna: es una indicacion nueva</option>
          @for (o of store.activeFor(patientId); track o.id) {
            <option [value]="o.id">{{ o.dosage.toString() }}</option>
          }
        </select>

        @if (error()) { <p class="error" role="alert">{{ error() }}</p> }
        @if (ok()) { <p class="ok" role="status">{{ ok() }}</p> }
        <button type="submit">Emitir indicacion</button>
      </form>
    } @else {
      <p class="notice" role="note">Solo el medico especialista puede emitir indicaciones.
        Cambia el rol en la barra superior para emitir una. Mientras tanto puedes ver las indicaciones registradas.</p>
    }

    <h2>Indicaciones registradas</h2>
    @if (store.orders().length === 0) {
      <p class="empty">Sin indicaciones emitidas.</p>
    } @else {
      <ul class="list">
        @for (o of store.orders(); track o.id) {
          <li class="item" [class.item--superseded]="!o.isActive">
            <div>
              <strong>{{ patients.byId(o.patientId.value)?.fullName ?? o.patientId.value }}</strong>
              <p class="meta">{{ o.dosage.toString() }}</p>
              <p class="meta">{{ o.prescribedAt | date:'HH:mm' }} &middot; {{ o.prescribedBy.value }}
                @if (o.replacesOrderId) { &middot; reemplaza una indicacion anterior }</p>
            </div>
            <span class="status" [class.status--superseded]="!o.isActive">{{ label(o.status) }}</span>
          </li>
        }
      </ul>
    }
  `,
  styleUrl: './medical-order-form.component.css',
})
export class MedicalOrderFormComponent {
  readonly store = inject(MedicalOrdersStore);
  readonly patients = inject(PatientsStore);
  private readonly user = inject(CurrentUser);
  readonly isPhysician = computed(() => this.user.role() === Role.Physician);

  patientId = this.patients.patients()[0]?.id.value ?? '';
  medication = ''; dose = ''; route = ''; frequency = ''; replaces = '';
  readonly error = signal(''); readonly ok = signal('');

  submit(): void {
    this.error.set(''); this.ok.set('');
    try {
      this.store.issue(
        PatientId.of(this.patientId), this.user.id(), this.user.role(),
        Dosage.of(this.medication, this.dose, this.route, this.frequency),
        this.replaces || undefined,
      );
      this.ok.set(this.replaces
        ? 'Indicacion emitida. La anterior quedo en el historial.'
        : 'Indicacion emitida. Queda visible para enfermeria.');
      this.medication = this.dose = this.route = this.frequency = this.replaces = '';
    } catch (e) { this.error.set((e as Error).message); }
  }

  label(status: OrderStatus): string {
    return status === OrderStatus.Active ? 'Vigente' : 'Reemplazada';
  }
}
