import { AggregateRoot } from '../../../shared/domain/model/aggregate-root';
import { domainEvent } from '../../../shared/domain/events/domain-event';
import { PatientId, UserId } from '../../../shared/domain/model/identifier';
import { AlertStatus, AlertSeverity } from './alert-status.enum';

/**
 * Aggregate Root de BC-04.
 * Invariantes: toda alerta referencia el origen que la disparo; no se resuelve
 * sin haber sido atendida; atenderla exige el responsable; una alerta resuelta
 * no retrocede de estado.
 */
export class Alert extends AggregateRoot {
  readonly id = crypto.randomUUID();
  readonly raisedAt = new Date();
  private _status = AlertStatus.Open;
  private _acknowledgedBy?: UserId;

  private constructor(
    readonly patientId: PatientId,
    readonly severity: AlertSeverity,
    readonly triggerSource: string,
    readonly reason: string,
  ) { super(); }

  static raise(patientId: PatientId, severity: AlertSeverity, triggerSource: string, reason: string): Alert {
    if (!triggerSource || !triggerSource.trim()) {
      throw new Error('Una alerta no puede existir sin el origen que la disparo');
    }
    const a = new Alert(patientId, severity, triggerSource, reason);
    a.record(domainEvent('AlertaCriticaGenerada', {
      alertId: a.id, patientId: patientId.value, severity, triggerSource,
    }));
    return a;
  }

  acknowledge(by: UserId): void {
    if (this._status !== AlertStatus.Open) {
      throw new Error('Solo una alerta abierta puede pasar a atendida');
    }
    this._status = AlertStatus.Acknowledged;
    this._acknowledgedBy = by;
    this.record(domainEvent('AlertaAtendida', {
      alertId: this.id, patientId: this.patientId.value, acknowledgedBy: by.value,
    }));
  }

  resolve(by: UserId): void {
    if (this._status !== AlertStatus.Acknowledged) {
      throw new Error('Una alerta no puede resolverse sin haber sido atendida antes');
    }
    this._status = AlertStatus.Resolved;
    this.record(domainEvent('AlertaResuelta', {
      alertId: this.id, patientId: this.patientId.value, resolvedBy: by.value,
    }));
  }

  /**
   * Descripcion legible del origen, para mostrar al profesional clinico.
   * El triggerSource conserva el identificador tecnico porque la trazabilidad
   * de BG-05 lo necesita; esta propiedad es su traduccion para la interfaz.
   */
  get originLabel(): string {
    if (this.triggerSource.startsWith('vital-sign:')) {
      return 'Registro de signos vitales';
    }
    if (this.triggerSource.startsWith('clinical-event:')) {
      return 'Evento clinico registrado';
    }
    return 'Origen no identificado';
  }

  get status(): AlertStatus { return this._status; }
  get acknowledgedBy(): UserId | undefined { return this._acknowledgedBy; }
}
