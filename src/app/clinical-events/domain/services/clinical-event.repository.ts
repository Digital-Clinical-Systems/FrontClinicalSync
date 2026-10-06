import { InjectionToken } from '@angular/core';
import { ClinicalEvent } from '../model/clinical-event.entity';

/** Puerto del repositorio de BC-08. Append-only, como la bitacora. */
export interface ClinicalEventRepository {
  load(): Promise<ClinicalEvent[]>;
  save(event: ClinicalEvent): void;
}
export const CLINICAL_EVENT_REPOSITORY = new InjectionToken<ClinicalEventRepository>('ClinicalEventRepository');
