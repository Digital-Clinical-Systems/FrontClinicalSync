import { buildShiftBoard, byClinicalPriority, CONTROL_INTERVAL_HOURS } from './shift-board';
import { Patient } from '../domain/model/patient.entity';
import { VitalSignRecord } from '../../vital-signs/domain/model/vital-sign-record.entity';
import { BloodPressure } from '../../vital-signs/domain/model/blood-pressure.vo';
import { Alert } from '../../alerts/domain/model/alert.entity';
import { AlertStatus, AlertSeverity } from '../../alerts/domain/model/alert-status.enum';
import { PatientId, UserId } from '../../shared/domain/model/identifier';
import { RiskLevel } from '../../vital-signs/domain/model/risk-level.enum';

const AHORA = new Date('2026-10-06T12:00:00Z');
const hace = (h: number) => new Date(AHORA.getTime() - h * 3_600_000);

const paciente = (id: string) => Patient.fromPersistence({
  id, medicalRecordNumber: `HC-${id}`, fullName: `Paciente ${id}`,
  admissionDiagnosis: 'Dx', unit: 'UCI Cardiovascular', bed: 'Cama 1',
  admittedAt: hace(72), active: true,
});

const medicion = (patientId: string, horas: number, overrides: Partial<{ spo2: number; hr: number }> = {}) =>
  VitalSignRecord.fromPersistence({
    patientId: PatientId.of(patientId), recordedBy: UserId.of('enf-001'),
    bloodPressure: BloodPressure.of(120, 75),
    heartRate: overrides.hr ?? 78,
    oxygenSaturation: overrides.spo2 ?? 97,
    temperature: 36.6,
  }, `vs-${patientId}-${horas}`, hace(horas));

const vacio = { alerts: [], orders: [], handovers: [], events: [], now: AHORA };

describe('Tablero del turno — proyeccion de lectura compuesta', () => {

  it('marca como pendiente al paciente sin ninguna medicion', () => {
    const [row] = buildShiftBoard({ ...vacio, patients: [paciente('p1')], records: [] });
    expect(row.pending.map(p => p.code)).toContain('sin-control');
    expect(row.risk).toBeNull();
  });

  it('marca el control como vencido pasado el intervalo definido', () => {
    const [row] = buildShiftBoard({
      ...vacio, patients: [paciente('p1')], records: [medicion('p1', CONTROL_INTERVAL_HOURS + 2)],
    });
    expect(row.pending.map(p => p.code)).toContain('control-vencido');
  });

  it('no marca pendiente un control dentro del intervalo', () => {
    const [row] = buildShiftBoard({
      ...vacio, patients: [paciente('p1')], records: [medicion('p1', 1)],
    });
    expect(row.pending.map(p => p.code)).not.toContain('control-vencido');
  });

  it('exige una anotacion posterior cuando la ultima medicion salio de rango', () => {
    const [row] = buildShiftBoard({
      ...vacio, patients: [paciente('p1')], records: [medicion('p1', 1, { spo2: 85 })],
    });
    expect(row.risk).toBe(RiskLevel.Critical);
    expect(row.pending.map(p => p.code)).toContain('sin-anotacion');
  });

  it('senala la alerta abierta como pendiente y no la resuelta', () => {
    const abierta = Alert.fromPersistence({
      id: 'a1', patientId: 'p1', severity: AlertSeverity.Critical, triggerSource: 'vital-sign:x',
      reason: 'r', status: AlertStatus.Open, raisedAt: hace(2),
    });
    const resuelta = Alert.fromPersistence({
      id: 'a2', patientId: 'p1', severity: AlertSeverity.Warning, triggerSource: 'vital-sign:y',
      reason: 'r', status: AlertStatus.Resolved, raisedAt: hace(5), acknowledgedBy: 'enf-001',
    });
    const [row] = buildShiftBoard({
      ...vacio, patients: [paciente('p1')], records: [medicion('p1', 1)], alerts: [abierta, resuelta],
    });
    expect(row.openAlerts).toBe(1);
    expect(row.pending.map(p => p.code)).toContain('alerta-abierta');
  });

  it('ordena por riesgo clinico antes que por cualquier otro criterio', () => {
    const rows = buildShiftBoard({
      ...vacio,
      patients: [paciente('normal'), paciente('critico'), paciente('alerta')],
      records: [
        medicion('normal', 1),
        medicion('critico', 1, { spo2: 85 }),
        medicion('alerta', 1, { hr: 115 }),
      ],
    });
    expect(byClinicalPriority(rows).map(r => r.patient.id.value))
      .toEqual(['critico', 'alerta', 'normal']);
  });

  it('a igual riesgo antepone a quien lleva mas tiempo sin control', () => {
    const rows = buildShiftBoard({
      ...vacio,
      patients: [paciente('reciente'), paciente('antiguo')],
      records: [medicion('reciente', 1), medicion('antiguo', 9)],
    });
    expect(byClinicalPriority(rows)[0].patient.id.value).toBe('antiguo');
  });
});
