import { VitalSignRecord } from '../../../vital-signs/domain/model/vital-sign-record.entity';
import { BloodPressure } from '../../../vital-signs/domain/model/blood-pressure.vo';
import { Alert } from '../../../alerts/domain/model/alert.entity';
import { AlertStatus, AlertSeverity } from '../../../alerts/domain/model/alert-status.enum';
import { Handover } from '../../../handover/domain/model/handover.entity';
import { SbarContent } from '../../../handover/domain/model/sbar-content.vo';
import { HandoverStatus } from '../../../handover/domain/model/handover-status.enum';
import { PatientId, UserId } from './identifier';

/**
 * La reconstruccion desde persistencia es la pieza que permite que la aplicacion
 * cargue el historial sin falsearlo. Estas pruebas fijan las dos propiedades que
 * la hacen correcta: conserva identidad y momento, y no vuelve a publicar los
 * eventos que ya ocurrieron.
 */
describe('Reconstruccion de agregados desde persistencia', () => {

  const medicion = {
    patientId: PatientId.of('pac-001'),
    recordedBy: UserId.of('enf-001'),
    bloodPressure: BloodPressure.of(168, 94),
    heartRate: 126, oxygenSaturation: 89, temperature: 38.4,
  };

  it('VitalSignRecord conserva el identificador y la hora original', () => {
    const cuando = new Date('2026-10-03T22:15:00Z');
    const r = VitalSignRecord.fromPersistence(medicion, 'vs-005', cuando);
    expect(r.id).toBe('vs-005');
    expect(r.measuredAt).toEqual(cuando);
  });

  it('VitalSignRecord no publica eventos al reconstruirse: leer el historial no regenera alertas', () => {
    const r = VitalSignRecord.fromPersistence(medicion, 'vs-005', new Date('2026-10-03T22:15:00Z'));
    expect(r.pullEvents().length).toBe(0);
  });

  it('VitalSignRecord vuelve a derivar el riesgo y no lo acepta desde fuera', () => {
    const r = VitalSignRecord.fromPersistence(medicion, 'vs-005', new Date());
    expect(r.riskLevel).toBe('CRITICAL');
  });

  it('VitalSignRecord revalida las invariantes de rango fisiologico', () => {
    expect(() => VitalSignRecord.fromPersistence(
      { ...medicion, heartRate: 400 }, 'vs-006', new Date())).toThrowError(/Frecuencia cardiaca/);
  });

  it('Alert conserva el estado alcanzado y no vuelve a notificarse', () => {
    const a = Alert.fromPersistence({
      id: 'alr-001', patientId: 'pac-001', severity: AlertSeverity.Critical,
      triggerSource: 'vital-sign:vs-005', reason: 'Saturacion en 89 %',
      status: AlertStatus.Resolved, raisedAt: '2026-10-03T22:15:00Z', acknowledgedBy: 'enf-002',
    });
    expect(a.status).toBe(AlertStatus.Resolved);
    expect(a.acknowledgedBy?.value).toBe('enf-002');
    expect(a.pullEvents().length).toBe(0);
  });

  it('Alert reconstruida rechaza quedarse sin el origen que la disparo', () => {
    expect(() => Alert.fromPersistence({
      id: 'alr-002', patientId: 'pac-001', severity: AlertSeverity.Warning,
      triggerSource: '  ', reason: 'x', status: AlertStatus.Open, raisedAt: new Date(),
    })).toThrowError(/sin el origen/);
  });

  it('Handover reconstruido conserva el acuse y rechaza el mismo enfermero en ambos extremos', () => {
    const contenido = SbarContent.of('s', 'b', 'a', 'r');
    const h = Handover.fromPersistence({
      id: 'hvr-001', patientId: 'pac-001', outgoingNurseId: 'enf-002', incomingNurseId: 'enf-001',
      content: contenido, status: HandoverStatus.Acknowledged,
      issuedAt: '2026-10-05T08:00:00Z', acknowledgedAt: '2026-10-05T08:20:00Z',
    });
    expect(h.status).toBe(HandoverStatus.Acknowledged);
    expect(h.isPending).toBeFalse();
    expect(h.pullEvents().length).toBe(0);

    expect(() => Handover.fromPersistence({
      id: 'hvr-002', patientId: 'pac-001', outgoingNurseId: 'enf-001', incomingNurseId: 'enf-001',
      content: contenido, status: HandoverStatus.Issued, issuedAt: new Date(),
    })).toThrowError(/distinto del saliente/);
  });
});
