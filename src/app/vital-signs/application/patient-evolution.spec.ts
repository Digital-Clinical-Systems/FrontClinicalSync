import { VitalSignRecord } from '../domain/model/vital-sign-record.entity';
import { BloodPressure } from '../domain/model/blood-pressure.vo';
import { PatientId, UserId } from '../../shared/domain/model/identifier';
import {
  recordsForPatient,
  toChronological,
  withinRange,
  trendsBetween,
} from './patient-evolution';

const pac1 = PatientId.of('pac-001');
const pac2 = PatientId.of('pac-002');
const nurse = UserId.of('enf-001');

function makeRecord(
  patientId: PatientId,
  overrides: { heartRate?: number; oxygenSaturation?: number; temperature?: number; systolic?: number; diastolic?: number } = {},
): VitalSignRecord {
  return VitalSignRecord.register({
    patientId,
    recordedBy: nurse,
    bloodPressure: BloodPressure.of(overrides.systolic ?? 120, overrides.diastolic ?? 75),
    heartRate: overrides.heartRate ?? 78,
    oxygenSaturation: overrides.oxygenSaturation ?? 97,
    temperature: overrides.temperature ?? 36.6,
  });
}

describe('Patient evolution (BC-03) — proyeccion de lectura US-26/US-27', () => {

  it('filtra solo los registros del paciente pedido', () => {
    const r1 = makeRecord(pac1);
    const r2 = makeRecord(pac2);
    const r3 = makeRecord(pac1);
    const result = recordsForPatient([r1, r2, r3], 'pac-001');
    expect(result.length).toBe(2);
    expect(result.every(r => r.patientId.value === 'pac-001')).toBeTrue();
  });

  it('toChronological ordena del mas antiguo al mas reciente y no muta la entrada', () => {
    const older = makeRecord(pac1);
    const newer = makeRecord(pac1);
    const input = [newer, older];
    const sorted = toChronological(input);
    expect(input[0]).toBe(newer);
    expect(sorted[0].measuredAt.getTime()).toBeLessThanOrEqual(sorted[1].measuredAt.getTime());
  });

  it('withinRange excluye los registros fuera de la ventana', () => {
    const record = makeRecord(pac1);
    const future = new Date(record.measuredAt.getTime() + 2 * 60 * 60 * 1000);
    const result = withinRange([record], 1, future);
    expect(result.length).toBe(0);
  });

  it('withinRange con hours = null devuelve todos', () => {
    const r1 = makeRecord(pac1);
    const r2 = makeRecord(pac1);
    const result = withinRange([r1, r2], null, new Date());
    expect(result.length).toBe(2);
  });

  it('trendsBetween devuelve up/down/stable correctamente', () => {
    const previous = makeRecord(pac1, { heartRate: 70, oxygenSaturation: 95, temperature: 36.5, systolic: 110, diastolic: 70 });
    const current = makeRecord(pac1, { heartRate: 80, oxygenSaturation: 93, temperature: 36.5, systolic: 130, diastolic: 75 });
    const trends = trendsBetween(current, previous);
    expect(trends.heartRate).toBe('up');
    expect(trends.oxygenSaturation).toBe('down');
    expect(trends.temperature).toBe('stable');
    expect(trends.systolic).toBe('up');
  });

  it('trendsBetween sin registro previo devuelve none en todas las metricas', () => {
    const current = makeRecord(pac1);
    const trends = trendsBetween(current);
    expect(trends.heartRate).toBe('none');
    expect(trends.oxygenSaturation).toBe('none');
    expect(trends.systolic).toBe('none');
    expect(trends.temperature).toBe('none');
  });
});
