import { Injectable, inject, signal, computed } from '@angular/core';
import { DomainEventBus } from '../../shared/domain/events/event-bus';
import { HANDOVER_REPOSITORY } from '../domain/services/handover.repository';
import { Handover } from '../domain/model/handover.entity';
import { SbarContent } from '../domain/model/sbar-content.vo';
import { PatientId, UserId } from '../../shared/domain/model/identifier';
import { Role } from '../../iam/domain/model/role.enum';

@Injectable({ providedIn: 'root' })
export class HandoverStore {
  private readonly bus = inject(DomainEventBus);
  private readonly repo = inject(HANDOVER_REPOSITORY);

  readonly handovers = signal<Handover[]>([]);
  readonly pendingCount = computed(() => this.handovers().filter(h => h.isPending).length);

  async load(): Promise<void> { this.handovers.set(await this.repo.load()); }

  /** US-14: traspasos dirigidos al enfermero indicado. */
  receivedBy(userId: string): Handover[] {
    return this.handovers().filter(h => h.incomingNurseId.value === userId);
  }
  forPatient(patientId: string): Handover[] {
    return this.handovers().filter(h => h.patientId.value === patientId);
  }
  lastFor(patientId: string): Handover | undefined {
    return this.forPatient(patientId)[0];
  }

  async issue(
    patientId: PatientId, outgoing: UserId, outgoingRole: Role,
    incoming: UserId, content: SbarContent,
  ): Promise<Handover> {
    const local = Handover.issue(patientId, outgoing, outgoingRole, incoming, content);
    const guardado = await this.repo.save(local);
    this.handovers.update(l => [guardado, ...l]);
    for (const e of local.pullEvents()) this.bus.publish(e);
    return guardado;
  }

  /**
   * La regla se comprueba dos veces y en los dos lados tiene sentido: aqui para
   * que el enfermero sepa en el acto por que no puede acusar, y en el API porque
   * es el unico lugar donde la comprobacion no se puede saltar.
   */
  async acknowledge(h: Handover, by: UserId): Promise<Handover> {
    h.acknowledge(by);
    const guardado = await this.repo.acknowledge(h);
    this.handovers.update(l => l.map(x => (x.id === guardado.id ? guardado : x)));
    for (const e of h.pullEvents()) this.bus.publish(e);
    return guardado;
  }
}
