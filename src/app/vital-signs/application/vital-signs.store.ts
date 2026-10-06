import { Injectable, inject, signal, computed } from '@angular/core';
import { VITAL_SIGN_REPOSITORY } from '../domain/services/vital-sign.repository';
import { VitalSignRecord, VitalSignInput } from '../domain/model/vital-sign-record.entity';
import { DomainEventBus } from '../../shared/domain/events/event-bus';
import { RiskLevel } from '../domain/model/risk-level.enum';

/**
 * Capa de aplicacion de BC-03. Confirma el cambio en el repositorio y recien
 * entonces publica los eventos del agregado: la reaccion de Alerts ocurre en
 * una transaccion posterior (consistencia eventual, seccion 4.6.6).
 */
@Injectable({ providedIn: 'root' })
export class VitalSignsStore {
  private readonly repo = inject(VITAL_SIGN_REPOSITORY);
  private readonly bus = inject(DomainEventBus);

  readonly records = signal<VitalSignRecord[]>([]);
  readonly criticalCount = computed(
    () => this.records().filter(r => r.riskLevel === RiskLevel.Critical).length);

  /**
   * Carga el historial. No publica los eventos de los registros leidos: al
   * reconstruirse desde persistencia el agregado no los emite, de modo que
   * leer el historial no regenera alertas ni entradas de bitacora.
   */
  async load(): Promise<void> {
    await this.repo.load();
    this.records.set(this.repo.findAll());
  }

  forPatient(patientId: string): VitalSignRecord[] {
    return this.records().filter(r => r.patientId.value === patientId);
  }

  latestFor(patientId: string): VitalSignRecord | undefined {
    return this.forPatient(patientId)
      .reduce<VitalSignRecord | undefined>(
        (last, r) => (!last || r.measuredAt > last.measuredAt ? r : last), undefined);
  }

  register(input: VitalSignInput): VitalSignRecord {
    const record = VitalSignRecord.register(input);   // las invariantes se validan aqui
    this.repo.save(record);
    this.records.set(this.repo.findAll());
    for (const event of record.pullEvents()) this.bus.publish(event);
    return record;
  }
}
