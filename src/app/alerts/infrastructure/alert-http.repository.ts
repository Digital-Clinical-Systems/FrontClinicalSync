import { Injectable, inject } from '@angular/core';
import { AlertRepository } from '../domain/services/alert.repository';
import { Alert } from '../domain/model/alert.entity';
import { AlertSeverity, AlertStatus } from '../domain/model/alert-status.enum';
import { ClinicalApi } from '../../shared/infrastructure/clinical-api';

interface AlertDto {
  id: string; patientId: string; severity: AlertSeverity; triggerSource: string;
  reason: string; status: AlertStatus; raisedAt: string; acknowledgedBy?: string | null;
}

@Injectable()
export class AlertHttpRepository implements AlertRepository {
  private readonly api = inject(ClinicalApi);

  async load(): Promise<Alert[]> {
    const dtos = await this.api.list<AlertDto>('alerts');
    return dtos
      .map(dto => Alert.fromPersistence(dto))
      .sort((a, b) => b.raisedAt.getTime() - a.raisedAt.getTime());
  }

  save(alert: Alert): void {
    void this.api.patch('alerts', alert.id, {
      status: alert.status, acknowledgedBy: alert.acknowledgedBy?.value ?? null,
    });
  }
}
