import { Injectable, inject } from '@angular/core';
import { AlertRepository } from '../domain/services/alert.repository';
import { Alert } from '../domain/model/alert.entity';
import { AlertSeverity, AlertStatus } from '../domain/model/alert-status.enum';
import { ClinicalApi } from '../../shared/infrastructure/clinical-api';

interface AlertDto {
  id: string; patientId: string; severity: AlertSeverity; triggerSource: string;
  reason: string; status: AlertStatus; raisedAt: string; acknowledgedBy?: string | null;
}

/**
 * Adaptador HTTP de BC-04.
 *
 * El API no expone un alta de alertas, y es correcto que no lo haga: una alerta
 * no se declara, se deriva. La politica vive en el servidor y se dispara con los
 * eventos de signos vitales y de eventos clinicos, de modo que este adaptador
 * solo lee y transiciona lo que la politica ya levanto.
 */
@Injectable()
export class AlertHttpRepository implements AlertRepository {
  private readonly api = inject(ClinicalApi);

  private desde(dto: AlertDto): Alert { return Alert.fromPersistence(dto); }

  async load(): Promise<Alert[]> {
    const dtos = await this.api.list<AlertDto>('alerts');
    return dtos.map(dto => this.desde(dto))
      .sort((a, b) => b.raisedAt.getTime() - a.raisedAt.getTime());
  }

  /**
   * El ciclo de vida se expresa con transiciones explicitas y no con una
   * actualizacion de estado: acusar y resolver son operaciones distintas, cada
   * una comprueba sus propias reglas, y quien actua sale del token.
   */
  async acknowledge(alert: Alert): Promise<Alert> {
    return this.desde(await this.api.action<AlertDto>('alerts', alert.id, 'acknowledge'));
  }

  async resolve(alert: Alert): Promise<Alert> {
    return this.desde(await this.api.action<AlertDto>('alerts', alert.id, 'resolve'));
  }
}
