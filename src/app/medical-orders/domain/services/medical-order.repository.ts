import { InjectionToken } from '@angular/core';
import { MedicalOrder } from '../model/medical-order.entity';

/**
 * Puerto del repositorio de BC-07. El cumplimiento es una operacion propia:
 * tiene sus propias reglas de rol y de estado y no es guardar una indicacion.
 */
export interface MedicalOrderRepository {
  load(): Promise<MedicalOrder[]>;
  save(order: MedicalOrder): Promise<MedicalOrder>;
  fulfill(order: MedicalOrder): Promise<MedicalOrder>;
}
export const MEDICAL_ORDER_REPOSITORY = new InjectionToken<MedicalOrderRepository>('MedicalOrderRepository');
