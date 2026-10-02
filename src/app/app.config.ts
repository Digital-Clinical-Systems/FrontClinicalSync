import { ApplicationConfig, provideZoneChangeDetection, inject, provideAppInitializer } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { routes } from './app.routes';
import { PATIENT_REPOSITORY } from './patients/domain/services/patient.repository';
import { PatientInMemoryRepository } from './patients/infrastructure/patient-inmemory.repository';
import { VITAL_SIGN_REPOSITORY } from './vital-signs/domain/services/vital-sign.repository';
import { VitalSignInMemoryRepository } from './vital-signs/infrastructure/vital-sign-inmemory.repository';
import { AlertsStore } from './alerts/application/alerts.store';
import { AuditStore } from './audit/application/audit.store';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withComponentInputBinding()),

    // Adaptadores en memoria: se sustituyen por adaptadores HTTP cuando exista el API.
    { provide: PATIENT_REPOSITORY, useClass: PatientInMemoryRepository },
    { provide: VITAL_SIGN_REPOSITORY, useClass: VitalSignInMemoryRepository },

    // Alerts y Audit deben existir desde el arranque para no perder eventos.
    provideAppInitializer(() => { inject(AlertsStore); inject(AuditStore); }),
  ],
};
