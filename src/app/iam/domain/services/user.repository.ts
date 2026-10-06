import { InjectionToken } from '@angular/core';

/** Perfil de un profesional del servicio, tal como lo devuelve el directorio. */
export interface UserProfile {
  readonly id: string;
  readonly fullName: string;
  readonly role: string;
  readonly shift?: string;
  readonly specialty?: string;
}

/** Puerto del directorio de usuarios (Shared Kernel de identidad). */
export interface UserRepository {
  load(): Promise<UserProfile[]>;
}
export const USER_REPOSITORY = new InjectionToken<UserRepository>('UserRepository');
