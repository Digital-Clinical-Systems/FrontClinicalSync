import { InjectionToken } from '@angular/core';
import { AuditLog } from '../model/audit-log.entity';

/**
 * Puerto del repositorio de BC-06. Solo lectura y escritura por anexion: la
 * bitacora no admite modificacion ni borrado.
 */
export interface AuditLogRepository {
  load(): Promise<AuditLog[]>;
  append(log: AuditLog): void;
}
export const AUDIT_LOG_REPOSITORY = new InjectionToken<AuditLogRepository>('AuditLogRepository');
