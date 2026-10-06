import { VitalSignRecord } from './vital-sign-record.entity';
import { BloodPressure } from './blood-pressure.vo';
import { RiskLevel } from './risk-level.enum';
import { PatientId, UserId } from '../../../shared/domain/model/identifier';

const base = {
  patientId: PatientId.of('pac-001'),
  recordedBy: UserId.of('enf-001'),
  bloodPressure: BloodPressure.of(120, 75),
  heartRate: 78, oxygenSaturation: 97, temperature: 36.6,
};

describe('VitalSignRecord (BC-03) — invariantes del agregado', () => {
  it('deriva el nivel de riesgo y no permite asignarlo', () => {
    const r = VitalSignRecord.register(base);
    expect(r.riskLevel).toBe(RiskLevel.Normal);
    expect(() => ((r as unknown as Record<string, unknown>)['riskLevel'] = RiskLevel.Critical)).toThrow();
  });

  it('evalua como critico un valor fuera de umbral', () => {
    const r = VitalSignRecord.register({ ...base, oxygenSaturation: 85 });
    expect(r.riskLevel).toBe(RiskLevel.Critical);
  });

  it('publica los eventos que BC-04 y BC-06 consumen', () => {
    const names = VitalSignRecord.register(base).pullEvents().map(e => e.name);
    expect(names).toContain('SignosVitalesRegistrados');
    expect(names).toContain('NivelDeRiesgoClinicoEvaluado');
  });

  it('rechaza mediciones fuera del rango fisiologico', () => {
    expect(() => VitalSignRecord.register({ ...base, heartRate: 400 })).toThrowError(/Frecuencia cardiaca/);
    expect(() => VitalSignRecord.register({ ...base, oxygenSaturation: 120 })).toThrowError(/Saturacion/);
    expect(() => VitalSignRecord.register({ ...base, temperature: 50 })).toThrowError(/Temperatura/);
  });

  it('es inmutable una vez creado', () => {
    const r = VitalSignRecord.register(base);
    expect(Object.isFrozen(r)).toBe(true);
  });
});

describe('VitalSignRecord — descripcion de los valores fuera de umbral', () => {
  it('nombra cada valor que se salio de rango, en el vocabulario del turno', () => {
    const r = VitalSignRecord.register({ ...base, oxygenSaturation: 85, heartRate: 140 });
    const texto = r.outOfRangeSummary();
    expect(texto).toContain('saturacion de oxigeno en 85 %');
    expect(texto).toContain('frecuencia cardiaca en 140 lpm');
  });

  it('no inventa causas cuando todo esta dentro de rango', () => {
    expect(VitalSignRecord.register(base).outOfRangeSummary()).toBe('Valores dentro de rango');
  });

  it('viaja en el evento que BC-04 consume, para que la alerta no muestre el enum tecnico', () => {
    const evento = VitalSignRecord.register({ ...base, oxygenSaturation: 85 })
      .pullEvents().find(e => e.name === 'NivelDeRiesgoClinicoEvaluado')!;
    expect(String(evento.payload['reason'])).toContain('saturacion de oxigeno');
  });
});
