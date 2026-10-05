/**
 * BC-06. Clase inmutable, almacenamiento append-only: no admite modificacion ni
 * borrado. La entrada la genera el sistema al consumir un evento, nunca el usuario.
 */
export class AuditLog {
  private constructor(
    readonly id: string,
    readonly actionType: string,
    readonly occurredAt: Date,
    readonly affectedResource: string,
    readonly actorId: string,
    readonly metadata: Readonly<Record<string, unknown>>,
  ) { Object.freeze(this); }

  static from(actionType: string, occurredAt: Date, payload: Record<string, unknown>): AuditLog {
    const actorId = String(
      payload['recordedBy'] ?? payload['acknowledgedBy'] ?? payload['resolvedBy'] ??
      payload['prescribedBy'] ?? payload['outgoingNurseId'] ?? payload['by'] ?? 'sistema');
    const affectedResource = String(payload['patientId'] ?? payload['alertId'] ?? payload['handoverId'] ?? '-');
    if (!actionType?.trim()) throw new Error('Toda entrada de auditoria requiere tipo de accion');
    return new AuditLog(crypto.randomUUID(), actionType, occurredAt, affectedResource, actorId, Object.freeze({ ...payload }));
  }
}
