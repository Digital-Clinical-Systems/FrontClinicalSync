import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { UserRepository, UserProfile } from '../domain/services/user.repository';

/** Cuerpo que devuelve `GET /users` del RESTful API. */
interface UserResourceDto {
  id: number;
  username: string;
  fullName: string;
  role: string;
  roles: string[];
  shift?: string | null;
  specialty?: string | null;
}

/**
 * Directorio de profesionales leido del RESTful API persistente. La peticion
 * viaja firmada con el token de la sesion, de modo que el directorio solo es
 * visible para un profesional autenticado.
 *
 * El perfil se indexa por el identificador que el API asigna a cada usuario,
 * que es el mismo con el que los registros clinicos nombran a las personas. Es
 * lo que permite que una vista traduzca «quien tomo este control» a un nombre
 * propio en lugar de mostrar un numero, que es la correccion que exigieron los
 * Issues #1 y #2.
 */
@Injectable()
export class UserHttpRepository implements UserRepository {
  private readonly http = inject(HttpClient);
  private readonly base = environment.backendBaseUrl;

  async load(): Promise<UserProfile[]> {
    try {
      const dtos = await firstValueFrom(this.http.get<UserResourceDto[]>(`${this.base}/users`));
      return dtos.map(dto => ({
        id: String(dto.id),
        fullName: dto.fullName,
        // La aplicacion razona sobre un rol por profesional; el API expone el
        // principal y ademas la lista completa. Se prefiere el principal y la
        // lista queda como respaldo.
        role: dto.role ?? dto.roles?.[0] ?? '',
        shift: dto.shift ?? undefined,
        specialty: dto.specialty ?? undefined,
      }));
    } catch (error) {
      // Sin directorio las vistas muestran el identificador en lugar del
      // nombre, que es una degradacion visible pero no impide operar.
      console.error('[UserHttpRepository] no se pudo leer el directorio', error);
      return [];
    }
  }
}
