import { InjectionToken } from '@angular/core';
import { VitalSignRecord } from '../model/vital-sign-record.entity';
import { PatientId } from '../../../shared/domain/model/identifier';

/**
 * Puerto del repositorio de BC-03.
 *
 * `save` devuelve el registro confirmado y no el que recibio: la persistencia
 * le asigna su identificador definitivo, de modo que el agregado que vale a
 * partir de ahi es el que vuelve. Quien guarda y no adopta ese resultado se
 * queda con una referencia que no existe en el sistema.
 */
export interface VitalSignRepository {
  load(): Promise<void>;
  findByPatient(id: PatientId): VitalSignRecord[];
  findAll(): VitalSignRecord[];
  save(record: VitalSignRecord): Promise<VitalSignRecord>;
}
export const VITAL_SIGN_REPOSITORY = new InjectionToken<VitalSignRepository>('VitalSignRepository');
