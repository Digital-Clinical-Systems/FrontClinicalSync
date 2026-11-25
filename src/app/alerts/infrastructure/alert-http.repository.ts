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

  /**
   * El API expresa el ciclo de vida de la alerta con transiciones explicitas y
   * no con una actualizacion de estado: acusar y resolver son operaciones
   * distintas, cada una comprueba sus propias reglas, y el profesional que
   * actua sale del token y no del cuerpo de la peticion.
   */
  save(alert: Alert): void {
    if (alert.status === AlertStatus.Acknowledged) {
      void this.api.action('alerts', alert.id, 'acknowledge');
    } else if (alert.status === AlertStatus.Resolved) {
      void this.api.action('alerts', alert.id, 'resolve');
    }
  }
}
