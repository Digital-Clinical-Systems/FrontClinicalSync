import { Injectable, inject } from '@angular/core';
import { ClinicalEventRepository } from '../domain/services/clinical-event.repository';
import { ClinicalEvent } from '../domain/model/clinical-event.entity';
import { ClinicalEventType, ClinicalEventSeverity } from '../domain/model/clinical-event-type.enum';
import { PatientId, UserId } from '../../shared/domain/model/identifier';
import { ClinicalApi } from '../../shared/infrastructure/clinical-api';

interface ClinicalEventDto {
  id: string; patientId: string; recordedBy: string;
  type: ClinicalEventType; severity: ClinicalEventSeverity; description: string;
  medication?: string | null; dose?: string | null;
  relatedOrderId?: string | null; occurredAt: string;
}

@Injectable()
export class ClinicalEventHttpRepository implements ClinicalEventRepository {
  private readonly api = inject(ClinicalApi);

  async load(): Promise<ClinicalEvent[]> {
    const dtos = await this.api.list<ClinicalEventDto>('clinicalEvents');
    return dtos
      .map(dto => ClinicalEvent.fromPersistence({
        patientId: PatientId.of(dto.patientId),
        recordedBy: UserId.of(dto.recordedBy),
        type: dto.type, severity: dto.severity, description: dto.description,
        medication: dto.medication ?? undefined, dose: dto.dose ?? undefined,
        relatedOrderId: dto.relatedOrderId ?? undefined,
      }, dto.id, new Date(dto.occurredAt)))
      .sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());
  }

  save(event: ClinicalEvent): void {
    void this.api.post('clinicalEvents', {
      id: event.id, patientId: event.patientId.value, recordedBy: event.recordedBy.value,
      type: event.type, severity: event.severity, description: event.description,
      medication: event.medication ?? null, dose: event.dose ?? null,
      relatedOrderId: event.relatedOrderId ?? null, occurredAt: event.occurredAt.toISOString(),
    });
  }
}
