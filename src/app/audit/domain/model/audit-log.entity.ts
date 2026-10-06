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
    // El recurso afectado se expresa como el paciente sobre el que ocurrio la
    // accion. Los identificadores internos del evento permanecen en metadata
    // para la trazabilidad, pero no se muestran al profesional clinico.
    const affectedResource = String(payload['patientId'] ?? '-');
    if (!actionType?.trim()) throw new Error('Toda entrada de auditoria requiere tipo de accion');
    return new AuditLog(crypto.randomUUID(), actionType, occurredAt, affectedResource, actorId, Object.freeze({ ...payload }));
  }

  /**
   * Reconstruye una entrada ya escrita. Conserva su identificador y su fecha
   * originales: una bitacora append-only pierde su valor probatorio si al
   * releerla cambia el momento en que ocurrio la accion.
   */
  static fromPersistence(snapshot: {
    id: string; actionType: string; occurredAt: string | Date;
    affectedResource: string; actorId: string; metadata?: Record<string, unknown>;
  }): AuditLog {
    return new AuditLog(
      snapshot.id, snapshot.actionType, new Date(snapshot.occurredAt),
      snapshot.affectedResource, snapshot.actorId, Object.freeze({ ...(snapshot.metadata ?? {}) }),
    );
  }
}
