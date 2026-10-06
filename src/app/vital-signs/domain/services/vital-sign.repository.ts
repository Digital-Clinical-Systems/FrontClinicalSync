import { InjectionToken } from '@angular/core';
import { VitalSignRecord } from '../model/vital-sign-record.entity';
import { PatientId } from '../../../shared/domain/model/identifier';

export interface VitalSignRepository {
  load(): Promise<void>;
  findByPatient(id: PatientId): VitalSignRecord[];
  findAll(): VitalSignRecord[];
  save(record: VitalSignRecord): void;
}
export const VITAL_SIGN_REPOSITORY = new InjectionToken<VitalSignRepository>('VitalSignRepository');
