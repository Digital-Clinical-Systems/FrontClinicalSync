import { ClinicalEvent } from './clinical-event.entity';
import { ClinicalEventType, ClinicalEventSeverity } from './clinical-event-type.enum';
import { PatientId, UserId } from '../../../shared/domain/model/identifier';

const base = {
  patientId: PatientId.of('pac-001'),
  recordedBy: UserId.of('enf-001'),
  type: ClinicalEventType.ClinicalObservation,
  severity: ClinicalEventSeverity.Routine,
  description: 'Paciente estable durante el turno.',
};

describe('ClinicalEvent (BC-08) — invariantes del agregado', () => {

  it('rechaza una anotacion sin descripcion', () => {
    expect(() => ClinicalEvent.record_({ ...base, description: '   ' }))
      .toThrowError(/requiere una descripcion/);
  });

  it('exige medicamento y dosis cuando se registra una administracion', () => {
    expect(() => ClinicalEvent.record_({
      ...base, type: ClinicalEventType.MedicationAdministration,
    })).toThrowError(/Medicamento, Dosis/);
  });

  it('acepta la administracion cuando el medicamento y la dosis estan completos', () => {
    const e = ClinicalEvent.record_({
      ...base, type: ClinicalEventType.MedicationAdministration,
      medication: 'Furosemida', dose: '20 mg',
    });
    expect(e.isMedication).toBeTrue();
    expect(e.medication).toBe('Furosemida');
  });

  it('publica un evento adicional cuando la anotacion es critica, para que BC-04 levante la alerta', () => {
    const nombres = ClinicalEvent.record_({ ...base, severity: ClinicalEventSeverity.Critical })
      .pullEvents().map(e => e.name);
    expect(nombres).toContain('EventoClinicoRegistrado');
    expect(nombres).toContain('EventoClinicoCriticoRegistrado');
  });

  it('no publica el evento critico cuando la anotacion es rutinaria', () => {
    const nombres = ClinicalEvent.record_(base).pullEvents().map(e => e.name);
    expect(nombres).not.toContain('EventoClinicoCriticoRegistrado');
  });

  it('el origen declarado es el que la alerta traduce para la vista', () => {
    const e = ClinicalEvent.record_({ ...base, severity: ClinicalEventSeverity.Critical });
    const critico = e.pullEvents().find(x => x.name === 'EventoClinicoCriticoRegistrado')!;
    expect(String(critico.payload['triggerSource'])).toBe(`clinical-event:${e.id}`);
  });

  it('es inmutable una vez creado', () => {
    expect(Object.isFrozen(ClinicalEvent.record_(base))).toBeTrue();
  });

  it('reconstruido desde persistencia conserva id y fecha y no publica ningun evento', () => {
    const cuando = new Date('2026-10-01T10:00:00Z');
    const e = ClinicalEvent.fromPersistence(
      { ...base, severity: ClinicalEventSeverity.Critical }, 'cev-001', cuando);
    expect(e.id).toBe('cev-001');
    expect(e.occurredAt).toEqual(cuando);
    expect(e.pullEvents().length).toBe(0);
  });

  it('reconstruido desde persistencia revalida las invariantes', () => {
    expect(() => ClinicalEvent.fromPersistence(
      { ...base, description: '' }, 'cev-002', new Date())).toThrowError(/descripcion/);
  });
});
