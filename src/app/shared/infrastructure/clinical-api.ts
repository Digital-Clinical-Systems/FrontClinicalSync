import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

/**
 * Cliente HTTP compartido contra la fake API. Es el unico punto del codigo que
 * conoce la URL base: los adaptadores de cada Bounded Context dependen de este
 * servicio y no del transporte.
 *
 * Las escrituras no son criticas para el recorrido de la aplicacion: el estado
 * de la sesion vive en los stores. Por eso `post` registra el fallo y continua
 * en lugar de interrumpir la operacion del usuario cuando la fake API no
 * responde; el dato ya fue validado por las invariantes del dominio.
 */
@Injectable({ providedIn: 'root' })
export class ClinicalApi {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  async list<T>(resource: string): Promise<T[]> {
    try {
      return await firstValueFrom(this.http.get<T[]>(`${this.base}/${resource}`));
    } catch (error) {
      console.error(`[ClinicalApi] no se pudo leer ${resource}`, error);
      return [];
    }
  }

  async post<T>(resource: string, body: unknown): Promise<T | null> {
    try {
      return await firstValueFrom(this.http.post<T>(`${this.base}/${resource}`, body));
    } catch (error) {
      console.error(`[ClinicalApi] no se pudo escribir en ${resource}`, error);
      return null;
    }
  }

  async patch<T>(resource: string, id: string, body: unknown): Promise<T | null> {
    try {
      return await firstValueFrom(this.http.patch<T>(`${this.base}/${resource}/${id}`, body));
    } catch (error) {
      console.error(`[ClinicalApi] no se pudo actualizar ${resource}/${id}`, error);
      return null;
    }
  }
}
