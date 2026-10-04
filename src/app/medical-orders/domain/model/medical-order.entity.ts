import { AggregateRoot } from '../../../shared/domain/model/aggregate-root';
import { domainEvent } from '../../../shared/domain/events/domain-event';
import { PatientId, UserId } from '../../../shared/domain/model/identifier';
import { Role } from '../../../iam/domain/model/role.enum';
import { Dosage } from './dosage.vo';
import { OrderStatus } from './order-status.enum';

/**
 * Aggregate Root de BC-07.
 * Invariantes: solo un medico puede emitir una indicacion; toda indicacion tiene
 * prescriptor y paciente destinatario; una indicacion reemplazada queda en el
 * historial como Superseded y nunca vuelve a estar vigente.
 */
export class MedicalOrder extends AggregateRoot {
  readonly id = crypto.randomUUID();
  readonly prescribedAt = new Date();
  private _status = OrderStatus.Active;
  private _supersededBy?: string;

  private constructor(
    readonly patientId: PatientId,
    readonly prescribedBy: UserId,
    readonly dosage: Dosage,
    readonly replacesOrderId?: string,
  ) { super(); }

  static issue(
    patientId: PatientId, prescriber: UserId, prescriberRole: Role, dosage: Dosage, replacesOrderId?: string,
  ): MedicalOrder {
    if (prescriberRole !== Role.Physician) {
      throw new Error('Solo un medico puede emitir una indicacion medica');
    }
    const order = new MedicalOrder(patientId, prescriber, dosage, replacesOrderId);
    order.record(domainEvent('NuevaIndicacionMedicaRegistrada', {
      orderId: order.id, patientId: patientId.value, prescribedBy: prescriber.value,
      replacesOrderId: replacesOrderId ?? null,
    }));
    return order;
  }

  supersede(by: MedicalOrder): void {
    if (this._status !== OrderStatus.Active) {
      throw new Error('Solo una indicacion vigente puede ser reemplazada');
    }
    if (!by.patientId.equals(this.patientId)) {
      throw new Error('La indicacion que reemplaza debe pertenecer al mismo paciente');
    }
    this._status = OrderStatus.Superseded;
    this._supersededBy = by.id;
    this.record(domainEvent('IndicacionMedicaReemplazada', {
      orderId: this.id, patientId: this.patientId.value, supersededBy: by.id,
      prescribedBy: by.prescribedBy.value,
    }));
  }

  get status(): OrderStatus { return this._status; }
  get supersededBy(): string | undefined { return this._supersededBy; }
  get isActive(): boolean { return this._status === OrderStatus.Active; }
}
