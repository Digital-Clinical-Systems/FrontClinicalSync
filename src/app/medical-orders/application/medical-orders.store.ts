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

  issue(
    patientId: PatientId, prescriber: UserId, role: Role, dosage: Dosage, replacesOrderId?: string,
  ): MedicalOrder {
    const previous = replacesOrderId ? this.orders().find(o => o.id === replacesOrderId) : undefined;
    if (replacesOrderId && !previous) throw new Error('La indicacion a reemplazar no existe');

    const order = MedicalOrder.issue(patientId, prescriber, role, dosage, replacesOrderId);
    previous?.supersede(order);

    this.orders.update(l => [order, ...l]);
    this.repo.save(order);
    if (previous) this.repo.save(previous);
    for (const e of [...order.pullEvents(), ...(previous?.pullEvents() ?? [])]) this.bus.publish(e);
    return order;
  }

  /** US-24. */
  fulfill(order: MedicalOrder, by: UserId, byRole: Role): void {
    order.fulfill(by, byRole);
    this.orders.update(l => [...l]);
    this.repo.save(order);
    for (const e of order.pullEvents()) this.bus.publish(e);
  }
}
