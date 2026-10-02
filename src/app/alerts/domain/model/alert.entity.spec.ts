import { Alert } from './alert.entity';
import { AlertSeverity, AlertStatus } from './alert-status.enum';
import { PatientId, UserId } from '../../../shared/domain/model/identifier';

const patient = PatientId.of('pac-001');
const enfermera = UserId.of('enf-001');
const nueva = () => Alert.raise(patient, AlertSeverity.Critical, 'vital-sign:abc', 'SpO2 bajo');

describe('Alert (BC-04) — invariantes del ciclo de vida', () => {
  it('exige el origen que la disparo', () => {
    expect(() => Alert.raise(patient, AlertSeverity.Critical, '', 'x'))
      .toThrowError(/sin el origen/);
  });

  it('no se resuelve sin haber sido atendida', () => {
    expect(() => nueva().resolve(enfermera)).toThrowError(/sin haber sido atendida/);
  });

  it('sigue el ciclo abierta -> atendida -> resuelta', () => {
    const a = nueva();
    expect(a.status).toBe(AlertStatus.Open);
    a.acknowledge(enfermera);
    expect(a.status).toBe(AlertStatus.Acknowledged);
    expect(a.acknowledgedBy?.value).toBe('enf-001');
    a.resolve(enfermera);
    expect(a.status).toBe(AlertStatus.Resolved);
  });

  it('no retrocede desde resuelta', () => {
    const a = nueva();
    a.acknowledge(enfermera); a.resolve(enfermera);
    expect(() => a.acknowledge(enfermera)).toThrowError(/abierta/);
  });
});
