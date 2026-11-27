import { Injectable, inject, signal } from '@angular/core';
import { DirectoryStore } from '../iam/application/directory.store';
import { PatientsStore } from '../patients/application/patients.store';
import { VitalSignsStore } from '../vital-signs/application/vital-signs.store';
import { MedicalOrdersStore } from '../medical-orders/application/medical-orders.store';
import { HandoverStore } from '../handover/application/handover.store';
import { AlertsStore } from '../alerts/application/alerts.store';
import { ClinicalEventsStore } from '../clinical-events/application/clinical-events.store';
import { AuditStore } from '../audit/application/audit.store';

/**
 * Carga inicial del estado clinico.
 *
 * Vive en la capa de disposicion y no dentro de un Bounded Context porque
 * compone todos: es el unico punto del codigo que conoce la lista completa de
 * contextos, igual que la configuracion de la aplicacion.
 *
 * Antes esta carga ocurria al arrancar la aplicacion. Con sesion ya no puede:
 * las peticiones viajan firmadas, de modo que se dispara cuando el armazon se
 * monta, lo que solo sucede una vez superada la guarda de sesion.
 */
@Injectable({ providedIn: 'root' })
export class DataBootstrap {
  private readonly directory = inject(DirectoryStore);
  private readonly patients = inject(PatientsStore);
  private readonly vitalSigns = inject(VitalSignsStore);
  private readonly orders = inject(MedicalOrdersStore);
  private readonly handovers = inject(HandoverStore);
  private readonly events = inject(ClinicalEventsStore);
  // Alertas y bitacora se resuelven primero para que ningun evento se pierda.
  private readonly alerts = inject(AlertsStore);
  private readonly audit = inject(AuditStore);

  private enCurso: Promise<void> | null = null;
  readonly cargando = signal(false);

  /**
   * Idempotente: varias llamadas comparten la misma carga. El armazon se puede
   * volver a montar sin repetir ocho peticiones.
   */
  cargar(): Promise<void> {
    if (this.enCurso) return this.enCurso;
    this.cargando.set(true);
    // La carga es independiente entre contextos: ninguno necesita el estado de
    // otro para reconstruirse, porque lo unico que cruza la frontera son
    // identificadores. Por eso se resuelven en paralelo.
    // La bitacora se carga para todos los roles. El API la expone a cualquier
    // usuario autenticado, y la aplicacion ofrece su vista en el menu de los
    // cuatro perfiles, de modo que condicionar la carga por rol dejaria la
    // pantalla vacia a quien el servidor si le responde.
    const cargas = [
      this.directory.load(), this.patients.load(), this.vitalSigns.load(),
      this.orders.load(), this.handovers.load(), this.events.load(),
      this.alerts.load(), this.audit.load(),
    ];
    this.enCurso = Promise.all(cargas).then(() => undefined).finally(() => this.cargando.set(false));
    return this.enCurso;
  }

  /** Olvida la carga previa, para que la proxima sesion parta de cero. */
  reiniciar(): void {
    this.enCurso = null;
  }
}
