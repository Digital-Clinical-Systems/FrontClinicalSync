import { InjectionToken } from '@angular/core';
import { MedicalOrder } from '../model/medical-order.entity';

/** Puerto del repositorio de BC-07. */
export interface MedicalOrderRepository {
  load(): Promise<MedicalOrder[]>;
  save(order: MedicalOrder): void;
}
export const MEDICAL_ORDER_REPOSITORY = new InjectionToken<MedicalOrderRepository>('MedicalOrderRepository');
