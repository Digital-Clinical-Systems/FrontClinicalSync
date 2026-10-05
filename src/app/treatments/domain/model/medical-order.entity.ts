import { AggregateRoot } from '../../../shared/domain/model/aggregate-root';
import { domainEvent } from '../../../shared/domain/events/domain-event';
import { PatientId, UserId } from '../../../shared/domain/model/identifier';

/**
 * US-22 a US-25 — Indicaciones medicas (BC-07, BG-03).
 *
 * CONTEXTO
 * La medica entrevistada describio la comunicacion con enfermeria como
 * "desconectada": deja indicaciones en la computadora sin recibir retorno de su
 * cumplimiento, y a veces debe ir fisicamente a preguntar (hallazgo H-J de la
 * seccion 2.2.3). Este agregado cierra ese ciclo.
 *
 * CICLO DE VIDA
 *   PRESCRITA  --ejecutar()-->  EJECUTADA  --confirmar()-->  CONFIRMADA
 *                \--cancelar()--> CANCELADA
 *
 * INVARIANTES QUE HAY QUE HACER CUMPLIR
 * Estan declaradas en la seccion 4.6.5 del informe, BC-07:
 *   1. Toda indicacion tiene un PhysicianId prescriptor y un PatientId destinatario.
 *   2. No puede marcarse como ejecutada sin el UserId de quien la ejecuto.
 *   3. ExecutedAt nunca es anterior a PrescribedAt.
 *   4. Una indicacion ejecutada no admite cambio de dosis: se cancela y se emite
 *      una nueva.
 *
 * COMO SE HACE
 * Mira alerts/domain/model/alert.entity.ts: tiene exactamente la misma forma
 * (estado privado, metodos que validan y lanzan Error, eventos con this.record).
 * Copia ese patron.
 *
 * TESTS
 * Crea medical-order.entity.spec.ts al lado. Usa alert.entity.spec.ts de
 * plantilla: una prueba por invariante. Con eso ya tienes el PR completo.
 *     npm test -- --watch=false
 */
export enum OrderStatus {
  Prescribed = 'PRESCRIBED',
  Executed = 'EXECUTED',
  Confirmed = 'CONFIRMED',
  Cancelled = 'CANCELLED',
}

export class MedicalOrder extends AggregateRoot {
  readonly id = crypto.randomUUID();
  readonly prescribedAt = new Date();
  private _status = OrderStatus.Prescribed;
  private _executedAt?: Date;
  private _executedBy?: UserId;

  private constructor(
    readonly patientId: PatientId,
    readonly physicianId: UserId,
    readonly description: string,
    readonly dosage: string,
  ) { super(); }

  static prescribe(
    patientId: PatientId, physicianId: UserId, description: string, dosage: string,
  ): MedicalOrder {
    // TODO invariante 1: validar que description no venga vacia
    const order = new MedicalOrder(patientId, physicianId, description, dosage);
    order.record(domainEvent('NuevaIndicacionMedicaRegistrada', {
      orderId: order.id, patientId: patientId.value, physicianId: physicianId.value,
    }));
    return order;
  }

  execute(by: UserId): void {
    // TODO invariante 2: exigir el UserId (ya viene por parametro, validar estado)
    // TODO invariante 3: ExecutedAt no anterior a PrescribedAt
    // TODO: solo una indicacion PRESCRITA puede ejecutarse
    // TODO: publicar 'IndicacionEjecutadaPorEnfermeria'
  }

  confirm(): void {
    // TODO: solo una indicacion EJECUTADA puede confirmarse
    // TODO: publicar 'CumplimientoDeIndicacionRegistrado'
  }

  cancel(): void {
    // TODO invariante 4: una indicacion ya ejecutada no se cancela
  }

  get status(): OrderStatus { return this._status; }
  get executedAt(): Date | undefined { return this._executedAt; }
  get executedBy(): UserId | undefined { return this._executedBy; }
}
