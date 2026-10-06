import { Injectable, inject, signal } from '@angular/core';
import { USER_REPOSITORY, UserProfile } from '../domain/services/user.repository';

/**
 * Directorio del servicio. Traduce identificadores de usuario a nombres legibles
 * para que ninguna vista muestre un identificador tecnico al profesional
 * clinico, que es la correccion que exigieron los Issues #1 y #2.
 */
@Injectable({ providedIn: 'root' })
export class DirectoryStore {
  private readonly repo = inject(USER_REPOSITORY);
  readonly users = signal<UserProfile[]>([]);

  async load(): Promise<void> { this.users.set(await this.repo.load()); }

  nameOf(userId: string | undefined | null): string {
    if (!userId) return 'No registrado';
    if (userId === 'sistema') return 'Sistema';
    return this.users().find(u => u.id === userId)?.fullName ?? userId;
  }

  nursesOtherThan(userId: string): UserProfile[] {
    return this.users().filter(u => u.role === 'NURSE' && u.id !== userId);
  }
}
