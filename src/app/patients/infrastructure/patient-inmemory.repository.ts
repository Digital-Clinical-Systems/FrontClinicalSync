import { Injectable } from '@angular/core';
import { PatientRepository } from '../domain/services/patient.repository';
import { Patient } from '../domain/model/patient.entity';
import { PatientId } from '../../shared/domain/model/identifier';
import { BedLocation } from '../domain/model/bed-location.vo';

/**
 * Adaptador en memoria. Sustituye al RESTful API mientras TS-02 no este
 * implementado: al existir el backend se reemplaza esta clase por un adaptador
 * HTTP sin tocar el dominio ni la capa de aplicacion.
 */
@Injectable()
export class PatientInMemoryRepository implements PatientRepository {
  private readonly store = new Map<string, Patient>();

  constructor() { this.seed(); }

  findAll(): Patient[] { return [...this.store.values()].filter(p => p.isActive); }
  findById(id: PatientId): Patient | undefined { return this.store.get(id.value); }
  save(patient: Patient): void { this.store.set(patient.id.value, patient); }

  private seed(): void {
    const demo: Array<[string, string, string, string, string]> = [
      ['pac-001', 'HC-48201', 'Paciente demo 1', 'Infarto agudo de miocardio', 'Cama 1'],
      ['pac-002', 'HC-48207', 'Paciente demo 2', 'Insuficiencia cardiaca descompensada', 'Cama 2'],
      ['pac-003', 'HC-48219', 'Paciente demo 3', 'Post operado de revascularizacion', 'Cama 3'],
    ];
    for (const [id, hc, name, dx, bed] of demo) {
      const p = Patient.admit(PatientId.of(id), hc, name, dx, BedLocation.of('UCI Cardiovascular', bed));
      p.pullEvents();
      this.store.set(id, p);
    }
  }
}
