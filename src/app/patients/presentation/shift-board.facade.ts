import { Injectable, inject, computed } from '@angular/core';
import { PatientsStore } from '../application/patients.store';
import { VitalSignsStore } from '../../vital-signs/application/vital-signs.store';
import { AlertsStore } from '../../alerts/application/alerts.store';
import { MedicalOrdersStore } from '../../medical-orders/application/medical-orders.store';
import { HandoverStore } from '../../handover/application/handover.store';
import { ClinicalEventsStore } from '../../clinical-events/application/clinical-events.store';
import { buildShiftBoard, byClinicalPriority, ShiftRow } from './shift-board';

/**
 * Punto unico desde el que las vistas del turno leen la proyeccion compuesta.
 * Evita que cada componente repita la composicion y deje versiones distintas de
 * la misma regla.
 */
@Injectable({ providedIn: 'root' })
export class ShiftBoardFacade {
  private readonly patients = inject(PatientsStore);
  private readonly vitals = inject(VitalSignsStore);
  private readonly alerts = inject(AlertsStore);
  private readonly orders = inject(MedicalOrdersStore);
  private readonly handovers = inject(HandoverStore);
  private readonly events = inject(ClinicalEventsStore);

  readonly rows = computed<ShiftRow[]>(() => buildShiftBoard({
    patients: this.patients.patients(),
    records: this.vitals.records(),
    alerts: this.alerts.alerts(),
    orders: this.orders.orders(),
    handovers: this.handovers.handovers(),
    events: this.events.events(),
  }));

  readonly byPriority = computed(() => byClinicalPriority(this.rows()));
  readonly withPending = computed(() => this.rows().filter(r => r.pending.length > 0));
  readonly pendingCount = computed(() => this.rows().reduce((n, r) => n + r.pending.length, 0));
}
