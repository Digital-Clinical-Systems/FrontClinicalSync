import { Injectable, inject } from '@angular/core';
import { PatientRepository } from '../domain/services/patient.repository';
import { Patient } from '../domain/model/patient.entity';
import { PatientId } from '../../shared/domain/model/identifier';
import { ClinicalApi } from '../../shared/infrastructure/clinical-api';

interface PatientDto {
  id: string; medicalRecordNumber: string; fullName: string; admissionDiagnosis: string;
  unit: string; bed: string; admittedAt: string; active: boolean; age?: number;
}

/**
 * Adaptador HTTP de BC-02 contra la fake API. Implementa el mismo puerto que el
 * adaptador en memoria al que sustituye: el dominio y la capa de aplicacion no
 * se enteran del cambio. Al existir el backend con base de datos, solo cambia la
 * URL base del cliente.
 */
@Injectable()
export class PatientHttpRepository implements PatientRepository {
  private readonly api = inject(ClinicalApi);
  private readonly store = new Map<string, Patient>();

  async load(): Promise<void> {
    const dtos = await this.api.list<PatientDto>('patients');
    this.store.clear();
    for (const dto of dtos) this.store.set(dto.id, Patient.fromPersistence(dto));
  }

  findAll(): Patient[] { return [...this.store.values()].filter(p => p.isActive); }
  findById(id: PatientId): Patient | undefined { return this.store.get(id.value); }
  save(patient: Patient): void {
    this.store.set(patient.id.value, patient);
    void this.api.post('patients', { id: patient.id.value, fullName: patient.fullName });
  }
}
