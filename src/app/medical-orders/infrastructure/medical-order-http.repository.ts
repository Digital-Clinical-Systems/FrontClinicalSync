import { Injectable, inject } from '@angular/core';
import { MedicalOrderRepository } from '../domain/services/medical-order.repository';
import { MedicalOrder } from '../domain/model/medical-order.entity';
import { Dosage } from '../domain/model/dosage.vo';
import { OrderStatus } from '../domain/model/order-status.enum';
import { ClinicalApi, comoIdDelApi, comoReferenciaDelApi } from '../../shared/infrastructure/clinical-api';

interface MedicalOrderDto {
  id: string; patientId: string; prescribedBy: string;
  medication: string; dose: string; route: string; frequency: string;
  status: OrderStatus; prescribedAt: string;
  replacesOrderId?: string | null; supersededBy?: string | null;
  fulfilledAt?: string | null; fulfilledBy?: string | null;
}

/**
 * Adaptador HTTP de BC-07.
 *
 * Quien prescribe sale del token. El reemplazo se declara con la referencia a
 * la indicacion anterior y es el API el que la deja reemplazada: una emision
 * con reemplazo cambia dos agregados, de modo que quien la ordena vuelve a leer
 * la coleccion en vez de deducir el nuevo estado de la anterior.
 */
@Injectable()
export class MedicalOrderHttpRepository implements MedicalOrderRepository {
  private readonly api = inject(ClinicalApi);

  private desde(dto: MedicalOrderDto): MedicalOrder {
    return MedicalOrder.fromPersistence({
      ...dto,
      dosage: Dosage.of(dto.medication, dto.dose, dto.route, dto.frequency),
    });
  }

  async load(): Promise<MedicalOrder[]> {
    const dtos = await this.api.list<MedicalOrderDto>('medical-orders');
    return dtos.map(dto => this.desde(dto))
      .sort((a, b) => b.prescribedAt.getTime() - a.prescribedAt.getTime());
  }

  async save(order: MedicalOrder): Promise<MedicalOrder> {
    const dto = await this.api.post<MedicalOrderDto>('medical-orders', {
      patientId: comoIdDelApi(order.patientId.value),
      medication: order.dosage.medication, dose: order.dosage.dose,
      route: order.dosage.route, frequency: order.dosage.frequency,
      replacesOrderId: comoReferenciaDelApi(order.replacesOrderId),
    });
    return this.desde(dto);
  }

  async fulfill(order: MedicalOrder): Promise<MedicalOrder> {
    const dto = await this.api.action<MedicalOrderDto>('medical-orders', order.id, 'fulfill');
    return this.desde(dto);
  }
}
