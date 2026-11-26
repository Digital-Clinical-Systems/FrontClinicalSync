import { InjectionToken } from '@angular/core';
import { Alert } from '../model/alert.entity';

/**
 * Puerto del repositorio de BC-04. No hay alta: una alerta no se declara, se
 * deriva de la politica a partir de lo que otros contextos registraron. El
 * puerto solo lee y transiciona, y las transiciones son explicitas porque cada
 * una comprueba reglas distintas.
 */
export interface AlertRepository {
  load(): Promise<Alert[]>;
  acknowledge(alert: Alert): Promise<Alert>;
  resolve(alert: Alert): Promise<Alert>;
}
export const ALERT_REPOSITORY = new InjectionToken<AlertRepository>('AlertRepository');
