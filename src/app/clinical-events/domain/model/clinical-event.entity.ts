import { AggregateRoot } from '../../../shared/domain/model/aggregate-root';
import { domainEvent } from '../../../shared/domain/events/domain-event';
import { PatientId, UserId } from '../../../shared/domain/model/identifier';
import { ClinicalEventType, ClinicalEventSeverity } from './clinical-event-type.enum';

export interface ClinicalEventInput {
  patientId: PatientId;
  recordedBy: UserId;
  type: ClinicalEventType;
  severity: ClinicalEventSeverity;
  description: string;
  /** Obligatorio cuando el tipo es administracion de medicamento. */
  medication?: string;
  dose?: string;
  /** Indicacion medica que origina la administracion, cuando existe. */
  relatedOrderId?: string;
}

/**
 * Aggregate Root de BC-08 (Clinical Events).
 *
 * Invariantes:
 *  - toda anotacion referencia al paciente y a quien la registro;
 *  - la descripcion no puede ir vacia: una anotacion sin contenido no es un
 *    registro clinico, es ruido en la historia;
 *  - una administracion de medicamento exige medicamento y dosis, porque sin
 *    ellos la constancia no sirve para auditar lo que recibio el paciente;
 *  - el registro es inmutable: una correccion es una anotacion nueva que
 *    referencia a la anterior, nunca una edicion de la original.
 */
export class ClinicalEvent extends AggregateRoot {
  readonly id: string;
  readonly occurredAt: Date;

  private constructor(private readonly input: ClinicalEventInput, id?: string, occurredAt?: Date) {
    super();
    this.id = id ?? crypto.randomUUID();
    this.occurredAt = occurredAt ?? new Date();
    Object.freeze(this);
  }

  private static validate(input: ClinicalEventInput): void {
    if (!input.description?.trim()) {
      throw new Error('La anotacion clinica requiere una descripcion');
    }
    if (input.type === ClinicalEventType.MedicationAdministration) {
      const faltantes: string[] = [];
      if (!input.medication?.trim()) faltantes.push('Medicamento');
      if (!input.dose?.trim()) faltantes.push('Dosis');
      if (faltantes.length) {
        throw new Error(`La administracion de un medicamento exige datos completos: ${faltantes.join(', ')}`);
      }
    }
  }

  static record_(input: ClinicalEventInput): ClinicalEvent {
    ClinicalEvent.validate(input);
    const event = new ClinicalEvent(input);
    event.record(domainEvent('EventoClinicoRegistrado', {
      eventId: event.id, patientId: input.patientId.value, recordedBy: input.recordedBy.value,
      eventType: input.type, severity: input.severity,
    }));
    if (input.severity === ClinicalEventSeverity.Critical) {
      // BC-04 escucha este evento y levanta la alerta. BC-08 no conoce las
      // alertas: solo declara que ocurrio algo critico.
      event.record(domainEvent('EventoClinicoCriticoRegistrado', {
        eventId: event.id, patientId: input.patientId.value,
        triggerSource: `clinical-event:${event.id}`, reason: input.description.trim(),
      }));
    }
    return event;
  }

  /** Reconstruye una anotacion ya escrita, sin volver a publicarla. */
  static fromPersistence(input: ClinicalEventInput, id: string, occurredAt: Date): ClinicalEvent {
    ClinicalEvent.validate(input);
    return new ClinicalEvent(input, id, occurredAt);
  }

  get patientId(): PatientId { return this.input.patientId; }
  get recordedBy(): UserId { return this.input.recordedBy; }
  get type(): ClinicalEventType { return this.input.type; }
  get severity(): ClinicalEventSeverity { return this.input.severity; }
  get description(): string { return this.input.description; }
  get medication(): string | undefined { return this.input.medication; }
  get dose(): string | undefined { return this.input.dose; }
  get relatedOrderId(): string | undefined { return this.input.relatedOrderId; }
  get isMedication(): boolean { return this.input.type === ClinicalEventType.MedicationAdministration; }
}
