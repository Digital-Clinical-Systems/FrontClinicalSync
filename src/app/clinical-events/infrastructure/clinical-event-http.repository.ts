import { Injectable, inject } from '@angular/core';
import { ClinicalEventRepository } from '../domain/services/clinical-event.repository';
import { ClinicalEvent } from '../domain/model/clinical-event.entity';
import { ClinicalEventType, ClinicalEventSeverity } from '../domain/model/clinical-event-type.enum';
import { PatientId, UserId } from '../../shared/domain/model/identifier';
import { ClinicalApi, comoIdDelApi, comoReferenciaDelApi } from '../../shared/infrastructure/clinical-api';

interface ClinicalEventDto {
  id: string; patientId: string; recordedBy: string;
  type: ClinicalEventType; severity: ClinicalEventSeverity; description: string;
  medication?: string | null; dose?: string | null;
  relatedOrderId?: string | null; occurredAt: string;
}

/**
 * Adaptador HTTP de BC-08. Quien anota y cuando salen del API: el autor del
 * token y el sello del servidor. La anotacion que vuelve es la definitiva.
 */
@Injectable()
export class ClinicalEventHttpRepository implements ClinicalEventRepository {
  private readonly api = inject(ClinicalApi);

  private desde(dto: ClinicalEventDto): ClinicalEvent {
    return ClinicalEvent.fromPersistence({
      patientId: PatientId.of(dto.patientId),
      recordedBy: UserId.of(dto.recordedBy),
      type: dto.type, severity: dto.severity, description: dto.description,
      medication: dto.medication ?? undefined, dose: dto.dose ?? undefined,
      relatedOrderId: dto.relatedOrderId ?? undefined,
    }, dto.id, new Date(dto.occurredAt));
  }

  async load(): Promise<ClinicalEvent[]> {
    const dtos = await this.api.list<ClinicalEventDto>('clinical-events');
    return dtos.map(dto => this.desde(dto))
      .sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());
  }

  async save(event: ClinicalEvent): Promise<ClinicalEvent> {
    const dto = await this.api.post<ClinicalEventDto>('clinical-events', {
      patientId: comoIdDelApi(event.patientId.value),
      type: event.type, severity: event.severity, description: event.description,
      medication: event.medication ?? null, dose: event.dose ?? null,
      relatedOrderId: comoReferenciaDelApi(event.relatedOrderId),
    });
    return this.desde(dto);
  }
}
