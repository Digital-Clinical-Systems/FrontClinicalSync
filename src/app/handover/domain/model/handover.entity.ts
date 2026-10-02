import { AggregateRoot } from '../../../shared/domain/model/aggregate-root';
import { domainEvent } from '../../../shared/domain/events/domain-event';
import { PatientId, UserId } from '../../../shared/domain/model/identifier';
import { SbarContent } from './sbar-content.vo';
import { HandoverStatus } from './handover-status.enum';

/**
 * Aggregate Root de BC-05.
 * Invariantes: las cuatro secciones SBAR completas; el enfermero entrante es
 * distinto del saliente; el acuse de recibo lo registra solo el entrante y una
 * sola vez.
 */
export class Handover extends AggregateRoot {
  readonly id = crypto.randomUUID();
  readonly issuedAt = new Date();
  private _status = HandoverStatus.Draft;
  private _acknowledgedAt?: Date;

  private constructor(
    readonly patientId: PatientId,
    readonly outgoingNurseId: UserId,
    readonly incomingNurseId: UserId,
    readonly content: SbarContent,
  ) { super(); }

  static issue(
    patientId: PatientId, outgoingNurseId: UserId, incomingNurseId: UserId, content: SbarContent,
  ): Handover {
    if (outgoingNurseId.equals(incomingNurseId)) {
      throw new Error('El enfermero entrante debe ser distinto del saliente: nadie se entrega el turno a si mismo');
    }
    const h = new Handover(patientId, outgoingNurseId, incomingNurseId, content);
    h._status = HandoverStatus.Issued;
    h.record(domainEvent('EntregaSbarRegistrada', {
      handoverId: h.id, patientId: patientId.value,
      outgoingNurseId: outgoingNurseId.value, incomingNurseId: incomingNurseId.value,
    }));
    return h;
  }

  acknowledge(by: UserId): void {
    if (this._status === HandoverStatus.Acknowledged) {
      throw new Error('El traspaso ya fue acusado: no admite un segundo acuse');
    }
    if (!by.equals(this.incomingNurseId)) {
      throw new Error('Solo el enfermero entrante puede acusar recibo del traspaso');
    }
    this._status = HandoverStatus.Acknowledged;
    this._acknowledgedAt = new Date();
    this.record(domainEvent('AcuseDeReciboConfirmado', {
      handoverId: this.id, patientId: this.patientId.value, acknowledgedBy: by.value,
    }));
  }

  get status(): HandoverStatus { return this._status; }
  get acknowledgedAt(): Date | undefined { return this._acknowledgedAt; }
  get isPending(): boolean { return this._status === HandoverStatus.Issued; }
}
