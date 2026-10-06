import { Patient } from '../domain/model/patient.entity';
import { VitalSignRecord } from '../../vital-signs/domain/model/vital-sign-record.entity';
import { Alert } from '../../alerts/domain/model/alert.entity';
import { MedicalOrder } from '../../medical-orders/domain/model/medical-order.entity';
import { Handover } from '../../handover/domain/model/handover.entity';
import { ClinicalEvent } from '../../clinical-events/domain/model/clinical-event.entity';
import { RiskLevel } from '../../vital-signs/domain/model/risk-level.enum';
import { AlertStatus } from '../../alerts/domain/model/alert-status.enum';
import { HandoverStatus } from '../../handover/domain/model/handover-status.enum';

/**
 * Proyeccion de lectura del tablero del turno. Compone datos de varios Bounded
 * Contexts, que es exactamente lo que la capa de presentacion puede hacer segun
 * la regla 2 de la seccion 4.6.6: lee de la capa `application` de cada contexto
 * y nunca de su infraestructura.
 *
 * Vive aqui y no en la capa de aplicacion de ningun contexto porque ninguno de
 * ellos es dueno de esta vista: el tablero existe para el profesional que mira
 * el turno completo, no para un contexto en particular.
 */

/** Horas sin registro de signos vitales a partir de las cuales se considera documentacion pendiente. */
export const CONTROL_INTERVAL_HOURS = 6;

export interface PendingItem {
  readonly code: string;
  readonly label: string;
  readonly detail: string;
}

export interface ShiftRow {
  readonly patient: Patient;
  readonly latest?: VitalSignRecord;
  readonly risk: RiskLevel | null;
  readonly hoursSinceControl: number | null;
  readonly openAlerts: number;
  readonly criticalAlerts: number;
  readonly activeOrders: number;
  readonly pendingOrders: number;
  readonly handoverPending: boolean;
  readonly pending: PendingItem[];
}

export interface BoardInput {
  patients: readonly Patient[];
  records: readonly VitalSignRecord[];
  alerts: readonly Alert[];
  orders: readonly MedicalOrder[];
  handovers: readonly Handover[];
  events: readonly ClinicalEvent[];
  now?: Date;
}

const RISK_ORDER: Record<RiskLevel, number> = {
  [RiskLevel.Critical]: 0, [RiskLevel.Warning]: 1, [RiskLevel.Normal]: 2,
};

export function buildShiftBoard(input: BoardInput): ShiftRow[] {
  const now = input.now ?? new Date();
  return input.patients.map(patient => {
    const id = patient.id.value;

    const ofPatient = input.records.filter(r => r.patientId.value === id);
    const latest = ofPatient.reduce<VitalSignRecord | undefined>(
      (last, r) => (!last || r.measuredAt > last.measuredAt ? r : last), undefined);

    const hoursSinceControl = latest
      ? (now.getTime() - latest.measuredAt.getTime()) / 3_600_000
      : null;

    const alerts = input.alerts.filter(a => a.patientId.value === id && a.status !== AlertStatus.Resolved);
    const orders = input.orders.filter(o => o.patientId.value === id);
    const activeOrders = orders.filter(o => o.isActive);
    const pendingOrders = orders.filter(o => o.isPending);
    const handoverPending = input.handovers.some(
      h => h.patientId.value === id && h.status === HandoverStatus.Issued);

    // US-21. Lo que falta registrar, con el motivo explicito: una lista de
    // pendientes sin razon obliga a adivinar que hacer con ella.
    const pending: PendingItem[] = [];
    if (!latest) {
      pending.push({
        code: 'sin-control', label: 'Sin control de signos vitales',
        detail: 'El paciente no tiene ninguna medicion registrada en el sistema.',
      });
    } else if (hoursSinceControl !== null && hoursSinceControl > CONTROL_INTERVAL_HOURS) {
      pending.push({
        code: 'control-vencido', label: 'Control de signos vitales vencido',
        detail: `Ultima medicion hace ${Math.floor(hoursSinceControl)} horas; el intervalo definido es de ${CONTROL_INTERVAL_HOURS} horas.`,
      });
    }
    for (const order of pendingOrders) {
      pending.push({
        code: `indicacion-${order.id}`, label: 'Indicacion sin cumplimiento registrado',
        detail: `${order.dosage.medication} ${order.dosage.dose} (${order.dosage.frequency}).`,
      });
    }
    if (handoverPending) {
      pending.push({
        code: 'traspaso-sin-acuse', label: 'Traspaso sin acuse de recibo',
        detail: 'El enfermero entrante todavia no confirmo haber recibido el traspaso.',
      });
    }
    if (alerts.some(a => a.status === AlertStatus.Open)) {
      pending.push({
        code: 'alerta-abierta', label: 'Alerta sin atender',
        detail: 'Hay al menos una alerta abierta que nadie ha tomado.',
      });
    }
    if (latest && latest.riskLevel !== RiskLevel.Normal
        && !input.events.some(e => e.patientId.value === id && e.occurredAt >= latest.measuredAt)) {
      pending.push({
        code: 'sin-anotacion', label: 'Valor fuera de umbral sin anotacion',
        detail: 'La ultima medicion salio de rango y no hay ninguna anotacion clinica posterior que explique que se hizo.',
      });
    }

    return {
      patient, latest, risk: latest?.riskLevel ?? null, hoursSinceControl,
      openAlerts: alerts.length,
      criticalAlerts: alerts.filter(a => a.severity === 'CRITICAL').length,
      activeOrders: activeOrders.length,
      pendingOrders: pendingOrders.length,
      handoverPending, pending,
    };
  });
}

/**
 * US-29. Ordena por riesgo clinico y, a igual riesgo, por alertas abiertas y por
 * antiguedad del ultimo control: entre dos pacientes igual de graves atiende
 * primero quien lleva mas tiempo sin que nadie lo mire.
 */
export function byClinicalPriority(rows: readonly ShiftRow[]): ShiftRow[] {
  return [...rows].sort((a, b) => {
    const ra = a.risk ? RISK_ORDER[a.risk] : 3;
    const rb = b.risk ? RISK_ORDER[b.risk] : 3;
    if (ra !== rb) return ra - rb;
    if (b.openAlerts !== a.openAlerts) return b.openAlerts - a.openAlerts;
    return (b.hoursSinceControl ?? 1e9) - (a.hoursSinceControl ?? 1e9);
  });
}
