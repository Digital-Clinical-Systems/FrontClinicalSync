import { InjectionToken } from '@angular/core';
import { Handover } from '../model/handover.entity';

/**
 * Puerto del repositorio de BC-05.
 *
 * El acuse es una operacion propia y no una variante de `save`, porque no
 * guarda un traspaso cualquiera: comprueba que quien acusa sea el enfermero
 * entrante que se declaro al emitirlo. Expresarla aparte evita que la capa de
 * aplicacion pueda pedir un acuse guardando un estado.
 */
export interface HandoverRepository {
  load(): Promise<Handover[]>;
  save(handover: Handover): Promise<Handover>;
  acknowledge(handover: Handover): Promise<Handover>;
}
export const HANDOVER_REPOSITORY = new InjectionToken<HandoverRepository>('HandoverRepository');
