import { AggregateRoot } from '../../../shared/domain/model/aggregate-root';
import { domainEvent } from '../../../shared/domain/events/domain-event';
import { PatientId } from '../../../shared/domain/model/identifier';
import { BedLocation } from './bed-location.vo';

/**
 * Aggregate Root de BC-02. Directorio maestro: ningun otro contexto crea pacientes.
 * Invariantes: no hay dos admisiones activas; el admitido siempre tiene cama.
 */
export class Patient extends AggregateRoot {
  private _active = true;
  private constructor(
    readonly id: PatientId,
    readonly medicalRecordNumber: string,
    readonly fullName: string,
    readonly admissionDiagnosis: string,
    readonly location: BedLocation,
    readonly admittedAt: Date,
  ) { super(); }

  static admit(
    id: PatientId, medicalRecordNumber: string, fullName: string,
    admissionDiagnosis: string, location: BedLocation,
  ): Patient {
    if (!medicalRecordNumber?.trim()) throw new Error('El numero de historia clinica es obligatorio');
    if (!fullName?.trim()) throw new Error('El nombre del paciente es obligatorio');
    const p = new Patient(id, medicalRecordNumber.trim(), fullName.trim(), admissionDiagnosis, location, new Date());
    p.record(domainEvent('PacienteAdmitido', {
      patientId: id.value, bedLocation: location.toString(),
    }));
    return p;
  }

  discharge(): void {
    if (!this._active) throw new Error('El paciente ya fue dado de alta');
    this._active = false;
    this.record(domainEvent('PacienteDadoDeAlta', { patientId: this.id.value }));
  }
  get isActive(): boolean { return this._active; }
}
