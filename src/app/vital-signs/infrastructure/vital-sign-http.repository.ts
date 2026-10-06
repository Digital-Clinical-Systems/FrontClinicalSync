import { Injectable, inject } from '@angular/core';
import { VitalSignRepository } from '../domain/services/vital-sign.repository';
import { VitalSignRecord } from '../domain/model/vital-sign-record.entity';
import { BloodPressure } from '../domain/model/blood-pressure.vo';
import { PatientId, UserId } from '../../shared/domain/model/identifier';
import { ClinicalApi } from '../../shared/infrastructure/clinical-api';

interface VitalSignDto {
  id: string; patientId: string; recordedBy: string;
  systolic: number; diastolic: number; heartRate: number;
  oxygenSaturation: number; temperature: number;
  measuredAt: string; correctsRecordId?: string | null;
}

/** Adaptador HTTP de BC-03 contra la fake API. */
@Injectable()
export class VitalSignHttpRepository implements VitalSignRepository {
  private readonly api = inject(ClinicalApi);
  private records: VitalSignRecord[] = [];

  async load(): Promise<void> {
    const dtos = await this.api.list<VitalSignDto>('vitalSigns');
    this.records = dtos
      .map(dto => VitalSignRecord.fromPersistence(
        {
          patientId: PatientId.of(dto.patientId),
          recordedBy: UserId.of(dto.recordedBy),
          bloodPressure: BloodPressure.of(dto.systolic, dto.diastolic),
          heartRate: dto.heartRate,
          oxygenSaturation: dto.oxygenSaturation,
          temperature: dto.temperature,
          corrects: dto.correctsRecordId ?? undefined,
        },
        dto.id, new Date(dto.measuredAt),
      ))
      .sort((a, b) => a.measuredAt.getTime() - b.measuredAt.getTime());
  }

  findAll(): VitalSignRecord[] { return [...this.records].reverse(); }
  findByPatient(id: PatientId): VitalSignRecord[] {
    return this.records.filter(r => r.patientId.equals(id)).reverse();
  }
  save(record: VitalSignRecord): void {
    this.records.push(record);
    void this.api.post('vitalSigns', {
      id: record.id, patientId: record.patientId.value, recordedBy: record.recordedBy.value,
      systolic: record.bloodPressure.systolic, diastolic: record.bloodPressure.diastolic,
      heartRate: record.heartRate, oxygenSaturation: record.oxygenSaturation,
      temperature: record.temperature, measuredAt: record.measuredAt.toISOString(),
      correctsRecordId: record.corrects ?? null,
    });
  }
}
