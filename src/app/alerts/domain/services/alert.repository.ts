import { InjectionToken } from '@angular/core';
import { Alert } from '../model/alert.entity';

/** Puerto del repositorio de BC-04. */
export interface AlertRepository {
  load(): Promise<Alert[]>;
  save(alert: Alert): void;
}
export const ALERT_REPOSITORY = new InjectionToken<AlertRepository>('AlertRepository');
