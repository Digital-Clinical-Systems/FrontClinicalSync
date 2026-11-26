import { Injectable, inject, signal, computed } from '@angular/core';
import { VITAL_SIGN_REPOSITORY } from '../domain/services/vital-sign.repository';
import { VitalSignRecord, VitalSignInput } from '../domain/model/vital-sign-record.entity';
import { DomainEventBus } from '../../shared/domain/events/event-bus';
import { RiskLevel } from '../domain/model/risk-level.enum';

/**
 * Capa de aplicacion de BC-03. Confirma el cambio en el repositorio y recien
 * entonces publica los eventos del agregado: la reaccion de Alerts ocurre en
 * una transaccion posterior (consistencia eventual, seccion 4.6.6).
 *
 * Con el API de por medio la confirmacion es remota, de modo que registrar pasa
 * a ser una operacion asincrona y el registro que vale es el que devuelve el
 * repositorio, con su identificador definitivo. Los eventos que se publican son
 * los del agregado local: su unica funcion ahora es avisar a los contextos que
 * reaccionan de que el estado cambio, y ninguno lee su contenido, porque la
 * alerta y la entrada de bitacora las derivo el servidor en la misma
 * transaccion que el alta.
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

  /**
   * Las invariantes se comprueban antes de salir a la red: un registro
   * imposible no merece un viaje al servidor, y el profesional recibe el motivo
   * de inmediato. Si el API rechaza el alta, el error se propaga sin tocar el
   * estado en pantalla.
   */
  async register(input: VitalSignInput): Promise<VitalSignRecord> {
    const local = VitalSignRecord.register(input);
    const guardado = await this.repo.save(local);
    this.records.set(this.repo.findAll());
    for (const event of local.pullEvents()) this.bus.publish(event);
    return guardado;
  }
}
