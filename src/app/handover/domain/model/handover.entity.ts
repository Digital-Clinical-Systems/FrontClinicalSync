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
  readonly id: string;
  readonly issuedAt: Date;
  private _status = HandoverStatus.Draft;
  private _acknowledgedAt?: Date;

  private constructor(
    readonly patientId: PatientId,
    readonly outgoingNurseId: UserId,
    readonly incomingNurseId: UserId,
    readonly content: SbarContent,
    id?: string,
    issuedAt?: Date,
  ) {
    super();
    this.id = id ?? crypto.randomUUID();
    this.issuedAt = issuedAt ?? new Date();
  }

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

  /**
   * Reconstruye un traspaso ya emitido con el estado que alcanzo. Revalida la
   * invariante de los dos enfermeros porque un traspaso que el repositorio
   * devuelva con el mismo enfermero en ambos extremos esta corrupto y no debe
   * entrar al dominio; no revalida el acuse, que ya ocurrio.
   */
  static fromPersistence(snapshot: {
    id: string; patientId: string; outgoingNurseId: string; incomingNurseId: string;
    content: SbarContent; status: HandoverStatus;
    issuedAt: string | Date; acknowledgedAt?: string | null;
  }): Handover {
    if (snapshot.outgoingNurseId === snapshot.incomingNurseId) {
      throw new Error('El enfermero entrante debe ser distinto del saliente: nadie se entrega el turno a si mismo');
    }
    const h = new Handover(
      PatientId.of(snapshot.patientId), UserId.of(snapshot.outgoingNurseId),
      UserId.of(snapshot.incomingNurseId), snapshot.content, snapshot.id, new Date(snapshot.issuedAt),
    );
    h._status = snapshot.status;
    h._acknowledgedAt = snapshot.acknowledgedAt ? new Date(snapshot.acknowledgedAt) : undefined;
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
