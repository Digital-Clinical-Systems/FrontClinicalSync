import { Injectable, inject, signal } from '@angular/core';
import { DirectoryStore } from '../iam/application/directory.store';
import { PatientsStore } from '../patients/application/patients.store';
import { VitalSignsStore } from '../vital-signs/application/vital-signs.store';
import { MedicalOrdersStore } from '../medical-orders/application/medical-orders.store';
import { HandoverStore } from '../handover/application/handover.store';
import { AlertsStore } from '../alerts/application/alerts.store';
import { ClinicalEventsStore } from '../clinical-events/application/clinical-events.store';
import { AuditStore } from '../audit/application/audit.store';
import { CurrentUser } from '../iam/domain/model/current-user';
import { Role } from '../iam/domain/model/role.enum';

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
  private readonly usuario = inject(CurrentUser);

  /** La bitacora solo es legible por coordinacion y auditoria (TS-06). */
  private static readonly LEEN_BITACORA: readonly Role[] = [Role.Coordinator, Role.Auditor];

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
    const cargas = [
      this.directory.load(), this.patients.load(), this.vitalSigns.load(),
      this.orders.load(), this.handovers.load(), this.events.load(), this.alerts.load(),
    ];
    // El API aplica los roles de verdad: pedir la bitacora con un rol que no la
    // lee devolveria 403. Se omite en lugar de provocar un error que el
    // profesional no puede resolver.
    if (DataBootstrap.LEEN_BITACORA.includes(this.usuario.role())) {
      cargas.push(this.audit.load());
    }
    this.enCurso = Promise.all(cargas).then(() => undefined).finally(() => this.cargando.set(false));
    return this.enCurso;
  }

  /** Olvida la carga previa, para que la proxima sesion parta de cero. */
  reiniciar(): void {
    this.enCurso = null;
  }
}
