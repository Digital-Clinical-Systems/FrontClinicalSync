import { Injectable, inject, signal, computed } from '@angular/core';
import { DomainEventBus } from '../../shared/domain/events/event-bus';
import { CLINICAL_EVENT_REPOSITORY } from '../domain/services/clinical-event.repository';
import { ClinicalEvent, ClinicalEventInput } from '../domain/model/clinical-event.entity';
import { ClinicalEventType } from '../domain/model/clinical-event-type.enum';

@Injectable({ providedIn: 'root' })
export class ClinicalEventsStore {
  private readonly bus = inject(DomainEventBus);
  private readonly repo = inject(CLINICAL_EVENT_REPOSITORY);

  readonly events = signal<ClinicalEvent[]>([]);
  readonly medicationCount = computed(
    () => this.events().filter(e => e.type === ClinicalEventType.MedicationAdministration).length);

  async load(): Promise<void> { this.events.set(await this.repo.load()); }

  forPatient(patientId: string): ClinicalEvent[] {
    return this.events().filter(e => e.patientId.value === patientId);
  }
  /** Anotaciones del paciente posteriores al instante indicado. */
  forPatientSince(patientId: string, since: Date): ClinicalEvent[] {
    return this.forPatient(patientId).filter(e => e.occurredAt >= since);
  }

  /**
   * La anotacion que queda es la que confirma el API, con su identificador y su
   * sello de tiempo. Los eventos publicados son los del agregado local y solo
   * avisan del cambio: la alerta critica la levanta la politica del servidor.
   */
  async record(input: ClinicalEventInput): Promise<ClinicalEvent> {
    const local = ClinicalEvent.record_(input);   // las invariantes se validan aqui
    const guardado = await this.repo.save(local);
    this.events.update(list => [guardado, ...list]);
    for (const e of local.pullEvents()) this.bus.publish(e);
    return guardado;
  }
}
