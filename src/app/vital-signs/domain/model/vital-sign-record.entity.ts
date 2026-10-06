import { AggregateRoot } from '../../../shared/domain/model/aggregate-root';
import { domainEvent } from '../../../shared/domain/events/domain-event';
import { PatientId, UserId } from '../../../shared/domain/model/identifier';
import { BloodPressure } from './blood-pressure.vo';
import { RiskLevel } from './risk-level.enum';
import { evaluateRisk } from '../services/risk-evaluator';

export interface VitalSignInput {
  patientId: PatientId;
  recordedBy: UserId;
  bloodPressure: BloodPressure;
  heartRate: number;
  oxygenSaturation: number;
  temperature: number;
  /** Registro que corrige: una correccion es un registro nuevo, nunca una edicion. */
  corrects?: string;
}

/**
 * Aggregate Root de BC-03 (Core Domain).
 * Invariantes: referencia paciente y responsable; el RiskLevel se deriva; el
 * registro es inmutable una vez creado.
 */
export class VitalSignRecord extends AggregateRoot {
  readonly id: string;
  readonly measuredAt: Date;
  readonly riskLevel: RiskLevel;

  private constructor(private readonly input: VitalSignInput, id?: string, measuredAt?: Date) {
    super();
    this.id = id ?? crypto.randomUUID();
    this.measuredAt = measuredAt ?? new Date();
    this.riskLevel = evaluateRisk(input);          // derivado, no asignable
    Object.freeze(this);                            // inmutable
  }

  private static validate(input: VitalSignInput): void {
    if (!Number.isFinite(input.heartRate) || input.heartRate < 20 || input.heartRate > 250) {
      throw new Error('Frecuencia cardiaca fuera del rango fisiologico (20-250 lpm)');
    }
    if (!Number.isFinite(input.oxygenSaturation) || input.oxygenSaturation < 50 || input.oxygenSaturation > 100) {
      throw new Error('Saturacion de oxigeno fuera de rango (50-100 %)');
    }
    if (!Number.isFinite(input.temperature) || input.temperature < 30 || input.temperature > 43) {
      throw new Error('Temperatura fuera del rango fisiologico (30-43 C)');
    }
  }

  static register(input: VitalSignInput): VitalSignRecord {
    VitalSignRecord.validate(input);
    const record = new VitalSignRecord(input);
    record.record(domainEvent('SignosVitalesRegistrados', {
      recordId: record.id, patientId: input.patientId.value, recordedBy: input.recordedBy.value,
    }));
    record.record(domainEvent('NivelDeRiesgoClinicoEvaluado', {
      recordId: record.id, patientId: input.patientId.value,
      riskLevel: record.riskLevel, measuredAt: record.measuredAt.toISOString(),
      triggerSource: `vital-sign:${record.id}`,
    }));
    return record;
  }

  /**
   * Reconstruye una medicion ya tomada, con su identificador y su hora
   * originales y sin publicar eventos.
   *
   * Que la reconstruccion no emita eventos no es un detalle tecnico: si leer el
   * historial los publicara, BC-04 generaria otra vez las alertas de hace tres
   * dias y BC-06 anotaria en la bitacora una accion clinica que nadie ejecuto.
   * Las invariantes si se revalidan, porque un dato que el repositorio devuelve
   * corrupto no debe entrar al dominio.
   *
   * El nivel de riesgo se vuelve a derivar en lugar de leerse del snapshot: es
   * una propiedad calculada del agregado y aceptarla desde fuera permitiria que
   * la persistencia contradijera la regla clinica.
   */
  static fromPersistence(input: VitalSignInput, id: string, measuredAt: Date): VitalSignRecord {
    VitalSignRecord.validate(input);
    return new VitalSignRecord(input, id, measuredAt);
  }

  get patientId(): PatientId { return this.input.patientId; }
  get recordedBy(): UserId { return this.input.recordedBy; }
  get bloodPressure(): BloodPressure { return this.input.bloodPressure; }
  get heartRate(): number { return this.input.heartRate; }
  get oxygenSaturation(): number { return this.input.oxygenSaturation; }
  get temperature(): number { return this.input.temperature; }
  get corrects(): string | undefined { return this.input.corrects; }
}
