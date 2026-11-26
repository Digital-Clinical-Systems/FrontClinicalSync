import { InjectionToken } from '@angular/core';
import { AuditLog } from '../model/audit-log.entity';

/**
 * Puerto del repositorio de BC-06, de solo lectura.
 *
 * La bitacora no admite escritura desde la aplicacion: las entradas las deriva
 * el servidor de los eventos de dominio de cada contexto. Si la aplicacion
 * pudiera anotar, la bitacora dejaria de ser prueba de lo que ocurrio.
 */
export interface AuditLogRepository {
  load(): Promise<AuditLog[]>;
}
export const AUDIT_LOG_REPOSITORY = new InjectionToken<AuditLogRepository>('AuditLogRepository');
