import { Role } from './role.enum';

/**
 * Sesion abierta por un profesional. Es el resultado de autenticarse contra el
 * API: el identificador que el backend asigno, el usuario con el que inicio
 * sesion, su nombre para mostrar, los roles que ostenta y el token con el que se
 * autorizan las peticiones siguientes.
 */
export interface AuthenticatedUser {
  readonly id: string;
  readonly username: string;
  readonly fullName: string;
  readonly roles: readonly Role[];
  readonly token: string;
}

/** Orden de precedencia para resolver el rol con el que actua un usuario que ostenta varios. */
const PRECEDENCIA: readonly Role[] = [Role.Physician, Role.Nurse, Role.Coordinator, Role.Auditor];

/**
 * Rol con el que actua la sesion. El API admite que un usuario ostente varios
 * roles, mientras que las reglas de autorizacion de la aplicacion se expresan
 * sobre uno; se resuelve por precedencia declarada y no por el orden en que el
 * API los devuelva, para que la misma cuenta se comporte siempre igual.
 */
export function rolDeActuacion(roles: readonly Role[]): Role {
  const encontrado = PRECEDENCIA.find(rol => roles.includes(rol));
  if (!encontrado) {
    throw new Error('La sesion no declara ningun rol reconocido');
  }
  return encontrado;
}
