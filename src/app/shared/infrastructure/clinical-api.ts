import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
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
 * Identificador del dominio en la forma que espera el API: la conversion
 * inversa de `normalizar`.
 *
 * Un identificador que no es un entero positivo no viene del backend: es el
 * provisional que el agregado se asigna al construirse, antes de que el alta
 * quede confirmada. Enviarlo escribiria una referencia a un registro que no
 * existe, de modo que se rechaza aqui, en la frontera, en vez de dejar pasar
 * una referencia que el API aceptaria como numero y no resolveria.
 */
export function comoIdDelApi(valor: string): number {
  const numero = Number(valor);
  if (!Number.isInteger(numero) || numero <= 0) {
    throw new Error(`La referencia ${valor} no esta confirmada por el servidor`);
  }
  return numero;
}

/** Igual que `comoIdDelApi`, para una referencia que el API admite ausente. */
export function comoReferenciaDelApi(valor?: string | null): number | null {
  return valor ? comoIdDelApi(valor) : null;
}

/**
 * Traduce el fallo de una escritura al motivo que el profesional puede leer.
 *
 * El API responde los rechazos de dominio con el mensaje de la regla que no se
 * cumplio, y los de validacion con la forma de ProblemDetail. Se prefiere ese
 * texto sobre el del transporte porque es el unico que explica que corregir.
 */
function mensajeDelApi(error: unknown): string {
  if (!(error instanceof HttpErrorResponse)) return 'No se pudo completar la operacion';
  if (error.status === 0) return 'No hay conexion con el servidor. Reintenta en unos segundos.';
  if (error.status === 403) return 'Tu rol no tiene permiso para esta operacion';
  const cuerpo = error.error as unknown;
  if (typeof cuerpo === 'string' && cuerpo.trim()) return cuerpo;
  if (cuerpo && typeof cuerpo === 'object') {
    const campos = cuerpo as Record<string, unknown>;
    for (const clave of ['message', 'detail', 'error']) {
      const valor = campos[clave];
      if (typeof valor === 'string' && valor.trim()) return valor;
    }
  }
  return `El servidor rechazo la operacion (${error.status})`;
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

  /**
   * Alta de un recurso. A diferencia de la lectura, una escritura que falla no
   * se puede absorber: si el API rechaza el alta y la aplicacion continuara, el
   * profesional veria su registro en pantalla y el registro no existiria. El
   * error se propaga para que la vista lo muestre con el motivo que dio el API.
   *
   * La respuesta es el recurso creado, con el identificador que le asigno el
   * backend: ese identificador, y no el provisional del cliente, es el que vale
   * para cualquier operacion posterior.
   */
  async post<T>(resource: string, body: unknown): Promise<T> {
    try {
      const respuesta = await firstValueFrom(this.http.post<unknown>(`${this.base}/${resource}`, body));
      return normalizar<T>(respuesta);
    } catch (error) {
      throw new Error(mensajeDelApi(error));
    }
  }

  /**
   * Transicion de estado de un recurso: `POST /recurso/{id}/{accion}`.
   *
   * El API expresa el ciclo de vida con operaciones explicitas y no con una
   * actualizacion de estado, de modo que cada transicion comprueba sus propias
   * reglas y el profesional que actua sale del token. Devuelve el recurso ya
   * transicionado, que es el que queda en pantalla.
   */
  async action<T>(resource: string, id: string, accion: string, body?: unknown): Promise<T> {
    try {
      const respuesta = await firstValueFrom(
        this.http.post<unknown>(`${this.base}/${resource}/${id}/${accion}`, body ?? {}));
      return normalizar<T>(respuesta);
    } catch (error) {
      throw new Error(mensajeDelApi(error));
    }
  }
}
