import { Injectable, inject } from '@angular/core';
import { HandoverRepository } from '../domain/services/handover.repository';
import { Handover } from '../domain/model/handover.entity';
import { SbarContent } from '../domain/model/sbar-content.vo';
import { HandoverStatus } from '../domain/model/handover-status.enum';
import { ClinicalApi } from '../../shared/infrastructure/clinical-api';

interface HandoverDto {
  id: string; patientId: string; outgoingNurseId: string; incomingNurseId: string;
  situation: string; background: string; assessment: string; recommendation: string;
  status: HandoverStatus; issuedAt: string; acknowledgedAt?: string | null;
}

@Injectable()
export class HandoverHttpRepository implements HandoverRepository {
  private readonly api = inject(ClinicalApi);

  async load(): Promise<Handover[]> {
    const dtos = await this.api.list<HandoverDto>('handovers');
    return dtos
      .map(dto => Handover.fromPersistence({
        ...dto,
        content: SbarContent.of(dto.situation, dto.background, dto.assessment, dto.recommendation),
      }))
      .sort((a, b) => b.issuedAt.getTime() - a.issuedAt.getTime());
  }

  save(handover: Handover): void {
    void this.api.post('handovers', {
      id: handover.id, patientId: handover.patientId.value,
      outgoingNurseId: handover.outgoingNurseId.value, incomingNurseId: handover.incomingNurseId.value,
      situation: handover.content.situation, background: handover.content.background,
      assessment: handover.content.assessment, recommendation: handover.content.recommendation,
      status: handover.status, issuedAt: handover.issuedAt.toISOString(),
      acknowledgedAt: handover.acknowledgedAt?.toISOString() ?? null,
    });
  }
}
