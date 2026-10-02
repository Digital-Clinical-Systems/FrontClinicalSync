import { Handover } from './handover.entity';
import { SbarContent } from './sbar-content.vo';
import { HandoverStatus } from './handover-status.enum';
import { PatientId, UserId } from '../../../shared/domain/model/identifier';

const content = () => SbarContent.of('Paciente estable', 'IAM hace 2 dias', 'Hemodinamia conservada', 'Continuar monitoreo');
const patient = PatientId.of('pac-001');
const saliente = UserId.of('enf-001');
const entrante = UserId.of('enf-002');

describe('SbarContent (BC-05) — invariante de secciones completas', () => {
  it('rechaza el traspaso con cualquier seccion vacia', () => {
    expect(() => SbarContent.of('', 'b', 'a', 'r')).toThrowError(/Situation/);
    expect(() => SbarContent.of('s', 'b', 'a', '   ')).toThrowError(/Recommendation/);
  });
});

describe('Handover (BC-05) — invariantes del agregado', () => {
  it('impide que un enfermero se entregue el turno a si mismo', () => {
    expect(() => Handover.issue(patient, saliente, saliente, content()))
      .toThrowError(/distinto del saliente/);
  });

  it('solo admite acuse del enfermero entrante', () => {
    const h = Handover.issue(patient, saliente, entrante, content());
    expect(() => h.acknowledge(saliente)).toThrowError(/Solo el enfermero entrante/);
    h.acknowledge(entrante);
    expect(h.status).toBe(HandoverStatus.Acknowledged);
  });

  it('no admite un segundo acuse', () => {
    const h = Handover.issue(patient, saliente, entrante, content());
    h.acknowledge(entrante);
    expect(() => h.acknowledge(entrante)).toThrowError(/ya fue acusado/);
  });
});
