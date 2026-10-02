import { Injectable, inject, signal } from '@angular/core';
import { PATIENT_REPOSITORY } from '../domain/services/patient.repository';
import { Patient } from '../domain/model/patient.entity';

@Injectable({ providedIn: 'root' })
export class PatientsStore {
  private readonly repo = inject(PATIENT_REPOSITORY);
  readonly patients = signal<Patient[]>([]);
  constructor() { this.patients.set(this.repo.findAll()); }
  byId(id: string): Patient | undefined {
    return this.patients().find(p => p.id.value === id);
  }
}
