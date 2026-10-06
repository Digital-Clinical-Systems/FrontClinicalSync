import { Injectable, inject, signal, computed } from '@angular/core';
import { DomainEventBus } from '../../shared/domain/events/event-bus';
import { ALERT_REPOSITORY } from '../domain/services/alert.repository';
import { Alert } from '../domain/model/alert.entity';
import { AlertSeverity, AlertStatus } from '../domain/model/alert-status.enum';
import { PatientId, UserId } from '../../shared/domain/model/identifier';

/**
 * Capa de aplicacion de BC-04. Reacciona al evento publicado por BC-03 sin
 * conocer sus clases: Vital Signs no sabe que existen las alertas.
 * Politica: un signo vital fuera de umbral genera una alerta.
 */
@Injectable({ providedIn: 'root' })
export class AlertsStore {
  private readonly bus = inject(DomainEventBus);
  private readonly repo = inject(ALERT_REPOSITORY);

  readonly alerts = signal<Alert[]>([]);
  readonly openCount = computed(() => this.alerts().filter(a => a.status === AlertStatus.Open).length);
  readonly criticalOpenCount = computed(
    () => this.alerts().filter(a => a.status === AlertStatus.Open && a.severity === AlertSeverity.Critical).length);

  constructor() {
    this.bus.on('NivelDeRiesgoClinicoEvaluado').subscribe(event => {
      const level = String(event.payload['riskLevel']);
      if (level !== 'CRITICAL' && level !== 'WARNING') return;
      const alert = Alert.raise(
        PatientId.of(String(event.payload['patientId'])),
        level === 'CRITICAL' ? AlertSeverity.Critical : AlertSeverity.Warning,
        String(event.payload['triggerSource']),
        `Nivel de riesgo evaluado como ${level}`,
      );
      this.alerts.update(list => [alert, ...list]);
      this.repo.save(alert);
      for (const e of alert.pullEvents()) this.bus.publish(e);
    });
  }

  /** Carga las alertas ya generadas sin volver a dispararlas ni notificarlas. */
  async load(): Promise<void> { this.alerts.set(await this.repo.load()); }

  openFor(patientId: string): Alert[] {
    return this.alerts().filter(a => a.patientId.value === patientId && a.status !== AlertStatus.Resolved);
  }

  acknowledge(alert: Alert, by: UserId): void {
    alert.acknowledge(by);
    this.alerts.update(l => [...l]);
    this.repo.save(alert);
    for (const e of alert.pullEvents()) this.bus.publish(e);
  }
  resolve(alert: Alert, by: UserId): void {
    alert.resolve(by);
    this.alerts.update(l => [...l]);
    this.repo.save(alert);
    for (const e of alert.pullEvents()) this.bus.publish(e);
  }
}
