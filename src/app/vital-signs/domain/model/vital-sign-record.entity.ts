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
      triggerSource: `vital-sign:${record.id}`, reason: record.outOfRangeSummary(),
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

  /**
   * Descripcion de los valores que se salieron de umbral, en el vocabulario del
   * turno. La construye el agregado y no la vista, porque es el unico que conoce
   * los umbrales con los que se evaluo: si la vista la compusiera, podria quedar
   * describiendo una regla distinta de la que realmente se aplico.
   */
  outOfRangeSummary(): string {
    const causas: string[] = [];
    const { systolic } = this.bloodPressure;
    const media = this.bloodPressure.meanArterialPressure;
    if (this.oxygenSaturation < 90) causas.push(`saturacion de oxigeno en ${this.oxygenSaturation} %`);
    else if (this.oxygenSaturation < 94) causas.push(`saturacion de oxigeno en descenso, ${this.oxygenSaturation} %`);
    if (this.heartRate > 130) causas.push(`frecuencia cardiaca en ${this.heartRate} lpm`);
    else if (this.heartRate > 110) causas.push(`taquicardia de ${this.heartRate} lpm`);
    if (this.heartRate < 40) causas.push(`bradicardia de ${this.heartRate} lpm`);
    else if (this.heartRate < 50) causas.push(`frecuencia cardiaca baja, ${this.heartRate} lpm`);
    if (systolic > 180) causas.push(`sistolica en ${systolic} mmHg`);
    else if (systolic > 160) causas.push(`sistolica elevada, ${systolic} mmHg`);
    if (systolic < 90) causas.push(`hipotension con sistolica en ${systolic} mmHg`);
    else if (systolic < 100) causas.push(`sistolica baja, ${systolic} mmHg`);
    if (media < 65) causas.push(`presion arterial media en ${media} mmHg`);
    if (this.temperature >= 39) causas.push(`temperatura en ${this.temperature} C`);
    else if (this.temperature >= 38) causas.push(`febricula de ${this.temperature} C`);
    if (this.temperature < 35) causas.push(`hipotermia de ${this.temperature} C`);
    return causas.length ? `Valor fuera de umbral: ${causas.join('; ')}` : 'Valores dentro de rango';
  }
}
