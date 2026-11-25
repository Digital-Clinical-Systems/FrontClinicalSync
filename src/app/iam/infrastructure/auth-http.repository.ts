import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthRepository, FalloDeAutenticacion } from '../domain/services/auth.repository';
import { AuthenticatedUser } from '../domain/model/authenticated-user';
import { Role } from '../domain/model/role.enum';

/** Cuerpo que devuelve `POST /authentication/sign-in`. */
interface AuthenticatedUserDto {
  id: number;
  username: string;
  fullName: string;
  roles: string[];
  token: string;
}

/**
 * Adaptador de autenticacion contra el RESTful API de ClinicalSync.
 *
 * A diferencia de las lecturas de datos clinicos, un fallo aqui no se puede
 * silenciar: si no hay sesion no hay nada que mostrar, de modo que el error se
 * traduce a un motivo que la pantalla sabe explicar y se propaga.
 */
@Injectable()
export class AuthHttpRepository implements AuthRepository {
  private readonly http = inject(HttpClient);
  private readonly base = environment.backendBaseUrl;

  async signIn(username: string, password: string): Promise<AuthenticatedUser> {
    try {
      const dto = await firstValueFrom(this.http.post<AuthenticatedUserDto>(
        `${this.base}/authentication/sign-in`, { username, password }));
      return {
        id: String(dto.id),
        username: dto.username,
        fullName: dto.fullName,
        roles: dto.roles.map(nombre => nombre as Role),
        token: dto.token,
      };
    } catch (error) {
      throw this.traducir(error);
    }
  }

  private traducir(error: unknown): FalloDeAutenticacion {
    if (!(error instanceof HttpErrorResponse)) {
      return new FalloDeAutenticacion('servicio', 'No se pudo completar el inicio de sesion.');
    }
    // status 0 significa que la peticion no llego a obtener respuesta: el
    // servicio esta caido, sin red, o el navegador la bloqueo.
    if (error.status === 0) {
      return new FalloDeAutenticacion('red', 'No se pudo contactar al servicio. Revise su conexion.');
    }
    if (error.status === 401) {
      return new FalloDeAutenticacion('credenciales', 'Usuario o contrasena incorrectos.');
    }
    if (error.status === 400) {
      return new FalloDeAutenticacion('credenciales', 'Complete el usuario y la contrasena.');
    }
    return new FalloDeAutenticacion('servicio', 'El servicio no respondio correctamente. Intente de nuevo.');
  }
}
