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
