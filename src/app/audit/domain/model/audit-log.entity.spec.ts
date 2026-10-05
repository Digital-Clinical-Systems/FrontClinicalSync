import { AuditLog } from './audit-log.entity';

describe('AuditLog (BC-06) — issue #2: el recurso afectado es el paciente', () => {
  it('registra el paciente cuando el evento lo trae', () => {
    const log = AuditLog.from('AlertaAtendida', new Date(), {
      alertId: '0b77d3cc-ec81-4426-a7ab-a2075dda4a52',
      patientId: 'pac-001',
      acknowledgedBy: 'enf-001',
    });
    expect(log.affectedResource).toBe('pac-001');
    expect(log.actorId).toBe('enf-001');
  });

  it('no expone identificadores internos cuando falta el paciente', () => {
    const log = AuditLog.from('AlertaResuelta', new Date(), {
      alertId: '0b77d3cc-ec81-4426-a7ab-a2075dda4a52',
      resolvedBy: 'enf-001',
    });
    expect(log.affectedResource).toBe('-');
    expect(log.affectedResource).not.toContain('0b77d3cc');
  });

  it('conserva el identificador tecnico en metadata para la trazabilidad', () => {
    const log = AuditLog.from('AlertaAtendida', new Date(), {
      alertId: 'abc-123', patientId: 'pac-002', acknowledgedBy: 'enf-001',
    });
    expect(log.metadata['alertId']).toBe('abc-123');
  });

  it('exige el tipo de accion', () => {
    expect(() => AuditLog.from('', new Date(), {})).toThrowError(/tipo de accion/);
  });
});
