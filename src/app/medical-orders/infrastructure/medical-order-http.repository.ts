import { Injectable, inject } from '@angular/core';
import { MedicalOrderRepository } from '../domain/services/medical-order.repository';
import { MedicalOrder } from '../domain/model/medical-order.entity';
import { Dosage } from '../domain/model/dosage.vo';
import { OrderStatus } from '../domain/model/order-status.enum';
import { ClinicalApi } from '../../shared/infrastructure/clinical-api';

interface MedicalOrderDto {
  id: string; patientId: string; prescribedBy: string;
  medication: string; dose: string; route: string; frequency: string;
  status: OrderStatus; prescribedAt: string;
  replacesOrderId?: string | null; supersededBy?: string | null;
  fulfilledAt?: string | null; fulfilledBy?: string | null;
}

@Injectable()
export class MedicalOrderHttpRepository implements MedicalOrderRepository {
  private readonly api = inject(ClinicalApi);

  async load(): Promise<MedicalOrder[]> {
    const dtos = await this.api.list<MedicalOrderDto>('medicalOrders');
    return dtos
      .map(dto => MedicalOrder.fromPersistence({
        ...dto,
        dosage: Dosage.of(dto.medication, dto.dose, dto.route, dto.frequency),
      }))
      .sort((a, b) => b.prescribedAt.getTime() - a.prescribedAt.getTime());
  }

  save(order: MedicalOrder): void {
    void this.api.post('medicalOrders', {
      id: order.id, patientId: order.patientId.value, prescribedBy: order.prescribedBy.value,
      medication: order.dosage.medication, dose: order.dosage.dose,
      route: order.dosage.route, frequency: order.dosage.frequency,
      status: order.status, prescribedAt: order.prescribedAt.toISOString(),
      replacesOrderId: order.replacesOrderId ?? null, supersededBy: order.supersededBy ?? null,
      fulfilledAt: order.fulfilledAt?.toISOString() ?? null,
      fulfilledBy: order.fulfilledBy?.value ?? null,
    });
  }
}
