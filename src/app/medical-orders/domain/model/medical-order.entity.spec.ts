import { MedicalOrder } from './medical-order.entity';
import { Dosage } from './dosage.vo';
import { OrderStatus } from './order-status.enum';
import { PatientId, UserId } from '../../../shared/domain/model/identifier';
import { Role } from '../../../iam/domain/model/role.enum';

const dosage = () => Dosage.of('Enoxaparina', '40 mg', 'Subcutanea', 'Cada 24 h');
const patient = PatientId.of('pac-001');
const medico = UserId.of('med-001');

describe('Dosage (BC-07) — invariante de datos completos', () => {
  it('rechaza la indicacion con cualquier dato vacio', () => {
    expect(() => Dosage.of('', '40 mg', 'IV', 'c/8h')).toThrowError(/Medicamento/);
    expect(() => Dosage.of('Aspirina', '100 mg', '  ', 'c/24h')).toThrowError(/Via/);
  });
});

describe('MedicalOrder (BC-07) — invariantes del agregado', () => {
  it('solo un medico puede emitirla', () => {
    expect(() => MedicalOrder.issue(patient, UserId.of('enf-001'), Role.Nurse, dosage()))
      .toThrowError(/Solo un medico/);
  });

  it('nace vigente y publica NuevaIndicacionMedicaRegistrada', () => {
    const o = MedicalOrder.issue(patient, medico, Role.Physician, dosage());
    expect(o.status).toBe(OrderStatus.Active);
    expect(o.pullEvents().map(e => e.name)).toEqual(['NuevaIndicacionMedicaRegistrada']);
  });

  it('al reemplazar, la anterior queda en el historial como Superseded', () => {
    const old = MedicalOrder.issue(patient, medico, Role.Physician, dosage());
    const next = MedicalOrder.issue(patient, medico, Role.Physician, dosage(), old.id);
    old.supersede(next);
    expect(old.status).toBe(OrderStatus.Superseded);
    expect(old.supersededBy).toBe(next.id);
    expect(next.isActive).toBeTrue();
  });

  it('no admite reemplazar una indicacion ya reemplazada', () => {
    const old = MedicalOrder.issue(patient, medico, Role.Physician, dosage());
    const next = MedicalOrder.issue(patient, medico, Role.Physician, dosage(), old.id);
    old.supersede(next);
    expect(() => old.supersede(next)).toThrowError(/vigente/);
  });

  it('no admite reemplazar una indicacion de otro paciente', () => {
    const old = MedicalOrder.issue(patient, medico, Role.Physician, dosage());
    const other = MedicalOrder.issue(PatientId.of('pac-002'), medico, Role.Physician, dosage());
    expect(() => old.supersede(other)).toThrowError(/mismo paciente/);
  });
});

describe('MedicalOrder — registro de cumplimiento (US-24)', () => {
  const paciente = PatientId.of('pac-001');
  const medico = UserId.of('med-001');
  const enfermera = UserId.of('enf-001');
  const dosis = Dosage.of('Furosemida', '20 mg', 'Via endovenosa', 'Cada 8 horas');
  const emitir = () => MedicalOrder.issue(paciente, medico, Role.Physician, dosis);

  it('registra el cumplimiento y publica el evento correspondiente', () => {
    const o = emitir(); o.pullEvents();
    o.fulfill(enfermera, Role.Nurse);
    expect(o.fulfilledBy?.value).toBe('enf-001');
    expect(o.pullEvents().map(e => e.name)).toContain('IndicacionMedicaCumplida');
  });

  it('no admite un segundo registro de cumplimiento', () => {
    const o = emitir();
    o.fulfill(enfermera, Role.Nurse);
    expect(() => o.fulfill(enfermera, Role.Nurse)).toThrowError(/ya tiene registrado su cumplimiento/);
  });

  it('impide que un medico registre un cumplimiento: lo administra enfermeria', () => {
    const o = emitir();
    expect(() => o.fulfill(medico, Role.Physician)).toThrowError(/personal de enfermeria que la administra/);
  });

  it('impide que quien prescribe registre su propio cumplimiento aunque sea enfermeria', () => {
    const propia = MedicalOrder.issue(paciente, UserId.of('enf-001'), Role.Physician, dosis);
    expect(() => propia.fulfill(enfermera, Role.Nurse))
      .toThrowError(/no puede registrar el cumplimiento de una indicacion que tu|propio cumplimiento/i);
  });

  it('una indicacion reemplazada ya no admite cumplimiento', () => {
    const primera = emitir();
    const segunda = MedicalOrder.issue(paciente, medico, Role.Physician,
      Dosage.of('Furosemida', '40 mg', 'Via endovenosa', 'Cada 8 horas'));
    primera.supersede(segunda);
    expect(() => primera.fulfill(enfermera, Role.Nurse)).toThrowError(/vigente/);
  });

  it('US-25: esta pendiente mientras sea vigente y nadie haya registrado su ejecucion', () => {
    const o = emitir();
    expect(o.isPending).toBeTrue();
    o.fulfill(enfermera, Role.Nurse);
    expect(o.isPending).toBeFalse();
  });
});
