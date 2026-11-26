import { Injectable, inject, signal, computed } from '@angular/core';
import { DomainEventBus } from '../../shared/domain/events/event-bus';
import { MEDICAL_ORDER_REPOSITORY } from '../domain/services/medical-order.repository';
import { PatientId, UserId } from '../../shared/domain/model/identifier';
import { Role } from '../../iam/domain/model/role.enum';
import { MedicalOrder } from '../domain/model/medical-order.entity';
import { Dosage } from '../domain/model/dosage.vo';

@Injectable({ providedIn: 'root' })
export class MedicalOrdersStore {
  private readonly bus = inject(DomainEventBus);
  private readonly repo = inject(MEDICAL_ORDER_REPOSITORY);

  readonly orders = signal<MedicalOrder[]>([]);
  readonly activeCount = computed(() => this.orders().filter(o => o.isActive).length);
  /** US-25: vigentes sin cumplimiento registrado. */
  readonly pendingCount = computed(() => this.orders().filter(o => o.isPending).length);

  async load(): Promise<void> { this.orders.set(await this.repo.load()); }

  activeFor(patientId: string): MedicalOrder[] {
    return this.orders().filter(o => o.isActive && o.patientId.value === patientId);
  }
  forPatient(patientId: string): MedicalOrder[] {
    return this.orders().filter(o => o.patientId.value === patientId);
  }
  pending(): MedicalOrder[] { return this.orders().filter(o => o.isPending); }

  /**
   * Emitir con reemplazo cambia dos agregados: la indicacion nueva nace vigente
   * y la anterior queda reemplazada. El API lo resuelve en una sola operacion a
   * partir de la referencia, de modo que en lugar de deducir aqui el estado de
   * la anterior se vuelve a leer la coleccion: el reemplazo que queda en
   * pantalla es el que quedo registrado.
   */
  async issue(
    patientId: PatientId, prescriber: UserId, role: Role, dosage: Dosage, replacesOrderId?: string,
  ): Promise<MedicalOrder> {
    const previous = replacesOrderId ? this.orders().find(o => o.id === replacesOrderId) : undefined;
    if (replacesOrderId && !previous) throw new Error('La indicacion a reemplazar no existe');

    const local = MedicalOrder.issue(patientId, prescriber, role, dosage, replacesOrderId);
    const guardado = await this.repo.save(local);
    if (previous) {
      previous.supersede(guardado);   // comprueba la regla y deja el evento listo
      await this.load();
    } else {
      this.orders.update(l => [guardado, ...l]);
    }
    for (const e of [...local.pullEvents(), ...(previous?.pullEvents() ?? [])]) this.bus.publish(e);
    return guardado;
  }

  /** US-24. El rol y el estado se comprueban aqui y los vuelve a exigir el API. */
  async fulfill(order: MedicalOrder, by: UserId, byRole: Role): Promise<MedicalOrder> {
    order.fulfill(by, byRole);
    const guardado = await this.repo.fulfill(order);
    this.orders.update(l => l.map(o => (o.id === guardado.id ? guardado : o)));
    for (const e of order.pullEvents()) this.bus.publish(e);
    return guardado;
  }
}
