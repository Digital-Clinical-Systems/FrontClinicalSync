import { Injectable, inject, signal, computed } from '@angular/core';
import { DomainEventBus } from '../../shared/domain/events/event-bus';
import { Handover } from '../domain/model/handover.entity';
import { SbarContent } from '../domain/model/sbar-content.vo';
import { PatientId, UserId } from '../../shared/domain/model/identifier';

@Injectable({ providedIn: 'root' })
export class HandoverStore {
  private readonly bus = inject(DomainEventBus);
  readonly handovers = signal<Handover[]>([]);
  readonly pendingCount = computed(() => this.handovers().filter(h => h.isPending).length);

  issue(patientId: PatientId, outgoing: UserId, incoming: UserId, content: SbarContent): Handover {
    const h = Handover.issue(patientId, outgoing, incoming, content);
    this.handovers.update(l => [h, ...l]);
    for (const e of h.pullEvents()) this.bus.publish(e);
    return h;
  }
  acknowledge(h: Handover, by: UserId): void {
    h.acknowledge(by);
    this.handovers.update(l => [...l]);
    for (const e of h.pullEvents()) this.bus.publish(e);
  }
}
