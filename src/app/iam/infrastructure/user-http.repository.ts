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
  roles: string[];
  active: boolean;
}

/**
 * Directorio de profesionales leido del RESTful API persistente.
 *
 * Primer contexto migrado del servicio de datos de demostracion al API: la
 * peticion viaja firmada con el token de la sesion, de modo que el directorio
 * solo es visible para un profesional autenticado.
 *
 * El API identifica a cada usuario con un numero y expone aparte el usuario con
 * el que inicia sesion. La aplicacion usa ese nombre de usuario como
 * identificador en todos sus contextos —es el que aparece en los registros
 * clinicos—, de modo que la traduccion ocurre aqui, en el adaptador, y el
 * dominio no se entera.
 */
@Injectable()
export class UserHttpRepository implements UserRepository {
  private readonly http = inject(HttpClient);
  private readonly base = environment.backendBaseUrl;

  async load(): Promise<UserProfile[]> {
    try {
      const dtos = await firstValueFrom(this.http.get<UserResourceDto[]>(`${this.base}/users`));
      return dtos
        .filter(dto => dto.active)
        .map(dto => ({
          id: dto.username,
          fullName: dto.fullName,
          // La aplicacion razona sobre un rol por profesional; el API admite
          // varios. Se toma el primero declarado, que es el que el backend
          // devuelve de forma estable para las cuentas del servicio.
          role: dto.roles[0] ?? '',
        }));
    } catch (error) {
      // Sin directorio las vistas muestran el identificador en lugar del
      // nombre, que es una degradacion visible pero no impide operar.
      console.error('[UserHttpRepository] no se pudo leer el directorio', error);
      return [];
    }
  }
}
