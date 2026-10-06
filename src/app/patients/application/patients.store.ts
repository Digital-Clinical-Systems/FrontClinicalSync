import { Injectable, inject, signal, computed } from '@angular/core';
import { PATIENT_REPOSITORY } from '../domain/services/patient.repository';
import { Patient } from '../domain/model/patient.entity';

@Injectable({ providedIn: 'root' })
export class PatientsStore {
  private readonly repo = inject(PATIENT_REPOSITORY);
  readonly patients = signal<Patient[]>([]);
  readonly count = computed(() => this.patients().length);

  async load(): Promise<void> {
    await this.repo.load();
    this.patients.set(this.repo.findAll());
  }

  byId(id: string): Patient | undefined {
    return this.patients().find(p => p.id.value === id);
  }
  nameOf(id: string): string {
    return this.byId(id)?.fullName ?? 'Paciente no identificado';
  }
}
