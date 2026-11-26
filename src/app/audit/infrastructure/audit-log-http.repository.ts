import { Injectable, inject } from '@angular/core';
import { AuditLogRepository } from '../domain/services/audit-log.repository';
import { AuditLog } from '../domain/model/audit-log.entity';
import { ClinicalApi } from '../../shared/infrastructure/clinical-api';

interface AuditLogDto {
  id: string; actionType: string; occurredAt: string;
  affectedResource: string; actorId: string; metadata?: Record<string, unknown>;
}

/**
 * Adaptador HTTP de BC-06, de solo lectura.
 *
 * El API no expone un alta de bitacora, y es la garantia que se esperaria de
 * una bitacora: si el cliente pudiera anotar, la bitacora dejaria de ser prueba
 * de lo que paso y pasaria a ser prueba de lo que el cliente dijo que paso. Las
 * entradas las genera el servidor a partir de los eventos de dominio de cada
 * contexto, en la misma transaccion que los produjo.
 */
@Injectable()
export class AuditLogHttpRepository implements AuditLogRepository {
  private readonly api = inject(ClinicalApi);

  async load(): Promise<AuditLog[]> {
    const dtos = await this.api.list<AuditLogDto>('audit-logs');
    return dtos
      .map(dto => AuditLog.fromPersistence(dto))
      .sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());
  }
}
