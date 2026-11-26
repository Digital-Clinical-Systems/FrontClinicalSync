import { Injectable, inject } from '@angular/core';
import { VitalSignRepository } from '../domain/services/vital-sign.repository';
import { VitalSignRecord } from '../domain/model/vital-sign-record.entity';
import { BloodPressure } from '../domain/model/blood-pressure.vo';
import { PatientId, UserId } from '../../shared/domain/model/identifier';
import { ClinicalApi, comoIdDelApi, comoReferenciaDelApi } from '../../shared/infrastructure/clinical-api';

interface VitalSignDto {
  id: string; patientId: string; recordedBy: string;
  systolic: number; diastolic: number; heartRate: number;
  oxygenSaturation: number; temperature: number;
  measuredAt: string; correctsRecordId?: string | null;
}

/**
 * Adaptador HTTP de BC-03 contra el RESTful API de ClinicalSync.
 *
 * El alta no envia ni el identificador ni quien registra ni el instante: el
 * API asigna el primero, toma el segundo del token de la sesion y sella el
 * tercero. Lo que vuelve es el registro ya persistido, y ese es el que queda en
 * memoria: el provisional que el agregado se asigno al construirse se descarta.
 */
@Injectable()
export class VitalSignHttpRepository implements VitalSignRepository {
  private readonly api = inject(ClinicalApi);
  private records: VitalSignRecord[] = [];

  /** Unico traductor del transporte, compartido por la lectura y por el alta. */
  private desde(dto: VitalSignDto): VitalSignRecord {
    return VitalSignRecord.fromPersistence(
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
    );
  }

  async load(): Promise<void> {
    const dtos = await this.api.list<VitalSignDto>('vital-signs');
    this.records = dtos.map(dto => this.desde(dto))
      .sort((a, b) => a.measuredAt.getTime() - b.measuredAt.getTime());
  }

  findAll(): VitalSignRecord[] { return [...this.records].reverse(); }
  findByPatient(id: PatientId): VitalSignRecord[] {
    return this.records.filter(r => r.patientId.equals(id)).reverse();
  }

  async save(record: VitalSignRecord): Promise<VitalSignRecord> {
    const dto = await this.api.post<VitalSignDto>('vital-signs', {
      patientId: comoIdDelApi(record.patientId.value),
      systolic: record.bloodPressure.systolic,
      diastolic: record.bloodPressure.diastolic,
      heartRate: record.heartRate,
      oxygenSaturation: record.oxygenSaturation,
      temperature: record.temperature,
      correctsRecordId: comoReferenciaDelApi(record.corrects),
    });
    const guardado = this.desde(dto);
    this.records.push(guardado);
    this.records.sort((a, b) => a.measuredAt.getTime() - b.measuredAt.getTime());
    return guardado;
  }
}
