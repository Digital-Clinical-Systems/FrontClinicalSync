import { ApplicationConfig, provideZoneChangeDetection, inject, provideAppInitializer } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { routes } from './app.routes';

import { PATIENT_REPOSITORY } from './patients/domain/services/patient.repository';
import { PatientHttpRepository } from './patients/infrastructure/patient-http.repository';
import { VITAL_SIGN_REPOSITORY } from './vital-signs/domain/services/vital-sign.repository';
import { VitalSignHttpRepository } from './vital-signs/infrastructure/vital-sign-http.repository';
import { ALERT_REPOSITORY } from './alerts/domain/services/alert.repository';
import { AlertHttpRepository } from './alerts/infrastructure/alert-http.repository';
import { HANDOVER_REPOSITORY } from './handover/domain/services/handover.repository';
import { HandoverHttpRepository } from './handover/infrastructure/handover-http.repository';
import { MEDICAL_ORDER_REPOSITORY } from './medical-orders/domain/services/medical-order.repository';
import { MedicalOrderHttpRepository } from './medical-orders/infrastructure/medical-order-http.repository';
import { AUDIT_LOG_REPOSITORY } from './audit/domain/services/audit-log.repository';
import { AuditLogHttpRepository } from './audit/infrastructure/audit-log-http.repository';
import { USER_REPOSITORY } from './iam/domain/services/user.repository';
import { UserHttpRepository } from './iam/infrastructure/user-http.repository';

import { DirectoryStore } from './iam/application/directory.store';
import { PatientsStore } from './patients/application/patients.store';
import { VitalSignsStore } from './vital-signs/application/vital-signs.store';
import { MedicalOrdersStore } from './medical-orders/application/medical-orders.store';
import { HandoverStore } from './handover/application/handover.store';
import { AlertsStore } from './alerts/application/alerts.store';
import { AuditStore } from './audit/application/audit.store';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withFetch()),

    // Adaptadores HTTP contra la fake API. Cada token es el unico punto que hay
    // que tocar cuando exista el backend con base de datos: el dominio y la capa
    // de aplicacion no cambian. Los adaptadores en memoria siguen implementando
    // los mismos puertos y pueden reemplazar a estos sin otra modificacion.
    { provide: PATIENT_REPOSITORY, useClass: PatientHttpRepository },
    { provide: VITAL_SIGN_REPOSITORY, useClass: VitalSignHttpRepository },
    { provide: ALERT_REPOSITORY, useClass: AlertHttpRepository },
    { provide: HANDOVER_REPOSITORY, useClass: HandoverHttpRepository },
    { provide: MEDICAL_ORDER_REPOSITORY, useClass: MedicalOrderHttpRepository },
    { provide: AUDIT_LOG_REPOSITORY, useClass: AuditLogHttpRepository },
    { provide: USER_REPOSITORY, useClass: UserHttpRepository },

    provideAppInitializer(() => {
      // Alerts y Audit se instancian primero para que ningun evento se pierda.
      const alerts = inject(AlertsStore);
      const audit = inject(AuditStore);
      const directory = inject(DirectoryStore);
      const patients = inject(PatientsStore);
      const vitalSigns = inject(VitalSignsStore);
      const orders = inject(MedicalOrdersStore);
      const handovers = inject(HandoverStore);

      // La carga es independiente entre contextos: ninguno necesita el estado de
      // otro para reconstruirse, porque lo unico que cruza la frontera son
      // identificadores. Por eso se resuelven en paralelo.
      return Promise.all([
        directory.load(), patients.load(), vitalSigns.load(),
        orders.load(), handovers.load(), alerts.load(), audit.load(),
      ]).then(() => undefined);
    }),
  ],
};
