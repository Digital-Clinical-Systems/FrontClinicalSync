import { Injectable, inject, signal, computed } from '@angular/core';
import { DomainEventBus } from '../../shared/domain/events/event-bus';
import { PatientId, UserId } from '../../shared/domain/model/identifier';
import { Role } from '../../iam/domain/model/role.enum';
import { MedicalOrder } from '../domain/model/medical-order.entity';
import { Dosage } from '../domain/model/dosage.vo';

@Injectable({ providedIn: 'root' })
export class MedicalOrdersStore {
  private readonly bus = inject(DomainEventBus);
  readonly orders = signal<MedicalOrder[]>([]);
  readonly activeCount = computed(() => this.orders().filter(o => o.isActive).length);

  activeFor(patientId: string): MedicalOrder[] {
    return this.orders().filter(o => o.isActive && o.patientId.value === patientId);
  }

  issue(
    patientId: PatientId, prescriber: UserId, role: Role, dosage: Dosage, replacesOrderId?: string,
  ): MedicalOrder {
    const previous = replacesOrderId ? this.orders().find(o => o.id === replacesOrderId) : undefined;
    if (replacesOrderId && !previous) throw new Error('La indicacion a reemplazar no existe');

    const order = MedicalOrder.issue(patientId, prescriber, role, dosage, replacesOrderId);
    previous?.supersede(order);

    this.orders.update(l => [order, ...l]);
    for (const e of [...order.pullEvents(), ...(previous?.pullEvents() ?? [])]) this.bus.publish(e);
    return order;
  }
}
