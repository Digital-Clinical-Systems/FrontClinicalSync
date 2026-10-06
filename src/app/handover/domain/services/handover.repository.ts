import { InjectionToken } from '@angular/core';
import { Handover } from '../model/handover.entity';

/** Puerto del repositorio de BC-05. */
export interface HandoverRepository {
  load(): Promise<Handover[]>;
  save(handover: Handover): void;
}
export const HANDOVER_REPOSITORY = new InjectionToken<HandoverRepository>('HandoverRepository');
