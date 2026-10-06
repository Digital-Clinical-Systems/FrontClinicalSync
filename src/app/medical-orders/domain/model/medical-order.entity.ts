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
  readonly id: string;
  readonly prescribedAt: Date;
  private _status = OrderStatus.Active;
  private _supersededBy?: string;
  private _fulfilledAt?: Date;
  private _fulfilledBy?: UserId;

  private constructor(
    readonly patientId: PatientId,
    readonly prescribedBy: UserId,
    readonly dosage: Dosage,
    readonly replacesOrderId?: string,
    id?: string,
    prescribedAt?: Date,
  ) {
    super();
    this.id = id ?? crypto.randomUUID();
    this.prescribedAt = prescribedAt ?? new Date();
  }

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

  /**
   * Reconstruye una indicacion ya emitida con el estado que alcanzo. No valida
   * el rol del prescriptor porque esa invariante se verifico al emitirla: lo que
   * el repositorio devuelve es el resultado de una emision que ya ocurrio, no
   * una emision nueva.
   */
  static fromPersistence(snapshot: {
    id: string; patientId: string; prescribedBy: string; dosage: Dosage;
    status: OrderStatus; prescribedAt: string | Date;
    replacesOrderId?: string | null; supersededBy?: string | null;
    fulfilledAt?: string | null; fulfilledBy?: string | null;
  }): MedicalOrder {
    const order = new MedicalOrder(
      PatientId.of(snapshot.patientId), UserId.of(snapshot.prescribedBy), snapshot.dosage,
      snapshot.replacesOrderId ?? undefined, snapshot.id, new Date(snapshot.prescribedAt),
    );
    order._status = snapshot.status;
    order._supersededBy = snapshot.supersededBy ?? undefined;
    order._fulfilledAt = snapshot.fulfilledAt ? new Date(snapshot.fulfilledAt) : undefined;
    order._fulfilledBy = snapshot.fulfilledBy ? UserId.of(snapshot.fulfilledBy) : undefined;
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

  /**
   * US-24. Enfermeria deja constancia de que ejecuto la indicacion.
   * Invariantes: solo se cumple una indicacion vigente, una sola vez, lo registra
   * enfermeria —que es quien administra— y nunca quien la prescribio, porque el
   * valor del registro esta en que acredita que la orden llego a quien debia
   * ejecutarla. Si el prescriptor pudiera firmar su propio cumplimiento, el
   * registro no probaria nada.
   */
  fulfill(by: UserId, byRole: Role, at: Date = new Date()): void {
    if (byRole !== Role.Nurse) {
      throw new Error('El cumplimiento de una indicacion lo registra el personal de enfermeria que la administra');
    }
    if (this._status !== OrderStatus.Active) {
      throw new Error('Solo una indicacion vigente admite registro de cumplimiento');
    }
    if (this._fulfilledAt) {
      throw new Error('La indicacion ya tiene registrado su cumplimiento');
    }
    if (by.equals(this.prescribedBy)) {
      throw new Error('Quien prescribe la indicacion no puede registrar su propio cumplimiento');
    }
    this._fulfilledAt = at;
    this._fulfilledBy = by;
    this.record(domainEvent('IndicacionMedicaCumplida', {
      orderId: this.id, patientId: this.patientId.value, fulfilledBy: by.value,
      fulfilledAt: at.toISOString(),
    }));
  }

  get status(): OrderStatus { return this._status; }
  get supersededBy(): string | undefined { return this._supersededBy; }
  get isActive(): boolean { return this._status === OrderStatus.Active; }
  get fulfilledAt(): Date | undefined { return this._fulfilledAt; }
  get fulfilledBy(): UserId | undefined { return this._fulfilledBy; }
  /** US-25: vigente y sin cumplimiento registrado. */
  get isPending(): boolean { return this.isActive && !this._fulfilledAt; }
}
