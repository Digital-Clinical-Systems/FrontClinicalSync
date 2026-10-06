import { Injectable, inject } from '@angular/core';
import { UserRepository, UserProfile } from '../domain/services/user.repository';
import { ClinicalApi } from '../../shared/infrastructure/clinical-api';

@Injectable()
export class UserHttpRepository implements UserRepository {
  private readonly api = inject(ClinicalApi);
  load(): Promise<UserProfile[]> { return this.api.list<UserProfile>('users'); }
}
