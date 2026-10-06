import { Injectable, inject } from '@angular/core';
import { AuditLogRepository } from '../domain/services/audit-log.repository';
import { AuditLog } from '../domain/model/audit-log.entity';
import { ClinicalApi } from '../../shared/infrastructure/clinical-api';

interface AuditLogDto {
  id: string; actionType: string; occurredAt: string;
  affectedResource: string; actorId: string; metadata?: Record<string, unknown>;
}

@Injectable()
export class AuditLogHttpRepository implements AuditLogRepository {
  private readonly api = inject(ClinicalApi);

  async load(): Promise<AuditLog[]> {
    const dtos = await this.api.list<AuditLogDto>('auditLogs');
    return dtos
      .map(dto => AuditLog.fromPersistence(dto))
      .sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());
  }

  append(log: AuditLog): void {
    void this.api.post('auditLogs', {
      id: log.id, actionType: log.actionType, occurredAt: log.occurredAt.toISOString(),
      affectedResource: log.affectedResource, actorId: log.actorId, metadata: log.metadata,
    });
  }
}
