import { InjectionToken } from '@angular/core';
import { Patient } from '../model/patient.entity';
import { PatientId } from '../../../shared/domain/model/identifier';

/** Puerto del repositorio: el dominio no conoce la infraestructura que lo implementa. */
export interface PatientRepository {
  findAll(): Patient[];
  findById(id: PatientId): Patient | undefined;
  save(patient: Patient): void;
}
export const PATIENT_REPOSITORY = new InjectionToken<PatientRepository>('PatientRepository');
