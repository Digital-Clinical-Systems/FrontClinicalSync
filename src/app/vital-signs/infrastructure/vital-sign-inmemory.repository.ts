import { Injectable } from '@angular/core';
import { VitalSignRepository } from '../domain/services/vital-sign.repository';
import { VitalSignRecord } from '../domain/model/vital-sign-record.entity';
import { PatientId } from '../../shared/domain/model/identifier';

@Injectable()
export class VitalSignInMemoryRepository implements VitalSignRepository {
  private readonly records: VitalSignRecord[] = [];
  findAll(): VitalSignRecord[] { return [...this.records].reverse(); }
  findByPatient(id: PatientId): VitalSignRecord[] {
    return this.records.filter(r => r.patientId.equals(id)).reverse();
  }
  save(record: VitalSignRecord): void { this.records.push(record); }
}
