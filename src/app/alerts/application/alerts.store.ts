import { Injectable, inject, signal, computed } from '@angular/core';
import { DomainEventBus } from '../../shared/domain/events/event-bus';
import { ALERT_REPOSITORY } from '../domain/services/alert.repository';
import { Alert } from '../domain/model/alert.entity';
import { AlertSeverity, AlertStatus } from '../domain/model/alert-status.enum';
import { UserId } from '../../shared/domain/model/identifier';

/**
 * Capa de aplicacion de BC-04. Reacciona a los eventos publicados por BC-03 y
 * BC-08 sin conocer sus clases: ninguno de los dos sabe que existen las alertas.
 *
 * La politica -- un valor fuera de umbral o un evento clinico critico generan
 * una alerta -- vive en el servidor, que la aplica en la misma transaccion que
 * registra el dato de origen. Este contexto ya no la duplica: lo que llega por
 * el bus solo dice que algo cambio, y la reaccion es volver a leer lo que la
 * politica decidio. Asi la alerta que se muestra es la que existe en el sistema
 * y no una copia que el cliente calculo en paralelo, que es la unica forma de
 * que las dos no puedan discrepar.
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
    this.bus.on('NivelDeRiesgoClinicoEvaluado').subscribe(() => this.releer());
    this.subscribeToClinicalEvents();
  }

  private relecturaPendiente = false;

  /**
   * Un alta publica varios eventos a la vez, y los publica de forma sincrona.
   * Agrupar la relectura en una microtarea deja una sola peticion por escritura
   * sin introducir un temporizador, que haria la reaccion dificil de probar.
   */
  private releer(): void {
    if (this.relecturaPendiente) return;
    this.relecturaPendiente = true;
    queueMicrotask(() => {
      this.relecturaPendiente = false;
      void this.load();
    });
  }

  /** Carga las alertas ya generadas sin volver a dispararlas ni notificarlas. */
  async load(): Promise<void> { this.alerts.set(await this.repo.load()); }

  openFor(patientId: string): Alert[] {
    return this.alerts().filter(a => a.patientId.value === patientId && a.status !== AlertStatus.Resolved);
  }

  /**
   * Segunda fuente de alertas (BC-08). La politica es la misma y cambia el
   * origen: `Alert.originLabel` distingue ambos prefijos para que la vista
   * muestre de donde salio la alerta sin exponer el identificador tecnico.
   */
  private subscribeToClinicalEvents(): void {
    this.bus.on('EventoClinicoCriticoRegistrado').subscribe(() => this.releer());
  }

  /**
   * Atender y resolver se comprueban aqui para que el profesional vea el motivo
   * en el acto, y el API las vuelve a comprobar porque es donde la regla no se
   * puede saltar. La alerta que queda en pantalla es la que devuelve el API,
   * con quien actuo tomado del token y no del formulario.
   */
  async acknowledge(alert: Alert, by: UserId): Promise<Alert> {
    alert.acknowledge(by);
    const guardada = await this.repo.acknowledge(alert);
    this.reemplazar(guardada);
    for (const e of alert.pullEvents()) this.bus.publish(e);
    return guardada;
  }

  async resolve(alert: Alert, by: UserId): Promise<Alert> {
    alert.resolve(by);
    const guardada = await this.repo.resolve(alert);
    this.reemplazar(guardada);
    for (const e of alert.pullEvents()) this.bus.publish(e);
    return guardada;
  }

  private reemplazar(alerta: Alert): void {
    this.alerts.update(l => l.map(a => (a.id === alerta.id ? alerta : a)));
  }
}
