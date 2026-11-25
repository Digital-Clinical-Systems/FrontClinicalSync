import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

/**
 * Campos que el API expresa como numero y la aplicacion como texto.
 *
 * El dominio identifica cada registro con un `Identifier`, que es una cadena no
 * vacia: un identificador es una referencia, no una cantidad, y nada en la
 * aplicacion suma ni ordena por el. El backend, en cambio, los asigna como
 * enteros autoincrementales. La conversion ocurre aqui, en la frontera, para
 * que ningun contexto tenga que saberlo.
 */
const CAMPOS_IDENTIFICADOR = new Set([
  'id', 'patientId', 'recordedBy', 'acknowledgedBy', 'resolvedBy',
  'outgoingNurseId', 'incomingNurseId', 'prescribedBy', 'fulfilledBy',
  'correctsRecordId', 'replacesOrderId', 'supersededBy', 'relatedOrderId',
]);

function normalizar<T>(recurso: unknown): T {
  if (recurso === null || typeof recurso !== 'object') return recurso as T;
  const salida: Record<string, unknown> = { ...(recurso as Record<string, unknown>) };
  for (const campo of Object.keys(salida)) {
    const valor = salida[campo];
    if (CAMPOS_IDENTIFICADOR.has(campo) && typeof valor === 'number') {
      salida[campo] = String(valor);
    }
  }
  return salida as T;
}

/**
 * Cliente HTTP compartido contra el RESTful API de ClinicalSync. Es el unico
 * punto del codigo que conoce la URL base y la unica frontera donde se traduce
 * la forma del transporte: los adaptadores de cada Bounded Context dependen de
 * este servicio y no del protocolo.
 *
 * Las peticiones viajan firmadas con el token de la sesion, que adjunta el
 * interceptor de IAM. Una respuesta 401 cierra la sesion y devuelve al ingreso,
 * de modo que aqui no hay nada que manejar al respecto.
 */
@Injectable({ providedIn: 'root' })
export class ClinicalApi {
  private readonly http = inject(HttpClient);
  private readonly base = environment.backendBaseUrl;

  async list<T>(resource: string): Promise<T[]> {
    try {
      const respuesta = await firstValueFrom(this.http.get<unknown[]>(`${this.base}/${resource}`));
      // Una respuesta que no es una coleccion significa que la peticion no llego
      // al recurso: tipicamente una regla de reescritura que devolvio el HTML de
      // la aplicacion. Se registra de forma explicita porque el sintoma visible
      // seria una pantalla vacia sin ningun error, que es el fallo mas caro de
      // diagnosticar.
      if (!Array.isArray(respuesta)) {
        console.error(
          `[ClinicalApi] ${this.base}/${resource} no devolvio una coleccion. `
          + 'Revise que la reescritura de /api/v1 llegue al backend.', respuesta);
        return [];
      }
      return respuesta.map(elemento => normalizar<T>(elemento));
    } catch (error) {
      console.error(`[ClinicalApi] no se pudo leer ${resource}`, error);
      return [];
    }
  }

  async post<T>(resource: string, body: unknown): Promise<T | null> {
    try {
      const respuesta = await firstValueFrom(this.http.post<unknown>(`${this.base}/${resource}`, body));
      return normalizar<T>(respuesta);
    } catch (error) {
      console.error(`[ClinicalApi] no se pudo escribir en ${resource}`, error);
      return null;
    }
  }

  /** Transicion de estado de un recurso: `POST /recurso/{id}/{accion}`. */
  async action<T>(resource: string, id: string, accion: string, body?: unknown): Promise<T | null> {
    try {
      const respuesta = await firstValueFrom(
        this.http.post<unknown>(`${this.base}/${resource}/${id}/${accion}`, body ?? {}));
      return normalizar<T>(respuesta);
    } catch (error) {
      console.error(`[ClinicalApi] no se pudo ejecutar ${accion} sobre ${resource}/${id}`, error);
      return null;
    }
  }
}
