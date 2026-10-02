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

  private constructor(private readonly input: VitalSignInput) {
    super();
    this.id = crypto.randomUUID();
    this.measuredAt = new Date();
    this.riskLevel = evaluateRisk(input);          // derivado, no asignable
    Object.freeze(this);                            // inmutable
  }

  static register(input: VitalSignInput): VitalSignRecord {
    if (!Number.isFinite(input.heartRate) || input.heartRate < 20 || input.heartRate > 250) {
      throw new Error('Frecuencia cardiaca fuera del rango fisiologico (20-250 lpm)');
    }
    if (!Number.isFinite(input.oxygenSaturation) || input.oxygenSaturation < 50 || input.oxygenSaturation > 100) {
      throw new Error('Saturacion de oxigeno fuera de rango (50-100 %)');
    }
    if (!Number.isFinite(input.temperature) || input.temperature < 30 || input.temperature > 43) {
      throw new Error('Temperatura fuera del rango fisiologico (30-43 C)');
    }
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

  get patientId(): PatientId { return this.input.patientId; }
  get recordedBy(): UserId { return this.input.recordedBy; }
  get bloodPressure(): BloodPressure { return this.input.bloodPressure; }
  get heartRate(): number { return this.input.heartRate; }
  get oxygenSaturation(): number { return this.input.oxygenSaturation; }
  get temperature(): number { return this.input.temperature; }
  get corrects(): string | undefined { return this.input.corrects; }
}
