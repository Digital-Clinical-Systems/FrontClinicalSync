import { Injectable, inject } from '@angular/core';
import { HandoverRepository } from '../domain/services/handover.repository';
import { Handover } from '../domain/model/handover.entity';
import { SbarContent } from '../domain/model/sbar-content.vo';
import { HandoverStatus } from '../domain/model/handover-status.enum';
import { ClinicalApi, comoIdDelApi } from '../../shared/infrastructure/clinical-api';

interface HandoverDto {
  id: string; patientId: string; outgoingNurseId: string; incomingNurseId: string;
  situation: string; background: string; assessment: string; recommendation: string;
  status: HandoverStatus; issuedAt: string; acknowledgedAt?: string | null;
}

/**
 * Adaptador HTTP de BC-05.
 *
 * El enfermero saliente no viaja en el cuerpo: es el autor del token. El acuse
 * tampoco es una actualizacion de estado sino una operacion propia, que el API
 * comprueba contra el enfermero entrante que guardo al emitir el traspaso.
 */
@Injectable()
export class HandoverHttpRepository implements HandoverRepository {
  private readonly api = inject(ClinicalApi);

  private desde(dto: HandoverDto): Handover {
    return Handover.fromPersistence({
      ...dto,
      content: SbarContent.of(dto.situation, dto.background, dto.assessment, dto.recommendation),
    });
  }

  async load(): Promise<Handover[]> {
    const dtos = await this.api.list<HandoverDto>('handovers');
    return dtos.map(dto => this.desde(dto))
      .sort((a, b) => b.issuedAt.getTime() - a.issuedAt.getTime());
  }

  async save(handover: Handover): Promise<Handover> {
    const dto = await this.api.post<HandoverDto>('handovers', {
      patientId: comoIdDelApi(handover.patientId.value),
      incomingNurseId: comoIdDelApi(handover.incomingNurseId.value),
      situation: handover.content.situation,
      background: handover.content.background,
      assessment: handover.content.assessment,
      recommendation: handover.content.recommendation,
    });
    return this.desde(dto);
  }

  async acknowledge(handover: Handover): Promise<Handover> {
    const dto = await this.api.action<HandoverDto>('handovers', handover.id, 'acknowledge');
    return this.desde(dto);
  }
}
