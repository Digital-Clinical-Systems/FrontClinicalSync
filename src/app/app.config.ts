import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
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
import { CLINICAL_EVENT_REPOSITORY } from './clinical-events/domain/services/clinical-event.repository';
import { ClinicalEventHttpRepository } from './clinical-events/infrastructure/clinical-event-http.repository';
import { USER_REPOSITORY } from './iam/domain/services/user.repository';
import { UserHttpRepository } from './iam/infrastructure/user-http.repository';
import { AUTH_REPOSITORY } from './iam/domain/services/auth.repository';
import { AuthHttpRepository } from './iam/infrastructure/auth-http.repository';
import { authInterceptor } from './iam/infrastructure/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withComponentInputBinding()),

    // El interceptor firma con el token de la sesion toda peticion dirigida al
    // backend propio, y cierra la sesion si el API la rechaza.
    provideHttpClient(withFetch(), withInterceptors([authInterceptor])),

    // Autenticacion contra el RESTful API de ClinicalSync.
    { provide: AUTH_REPOSITORY, useClass: AuthHttpRepository },

    // Adaptadores HTTP de los datos clinicos. Cada token es el unico punto que
    // hay que tocar para migrar un contexto del servicio de demostracion al API
    // persistente: el dominio y la capa de aplicacion no cambian. Los
    // adaptadores en memoria implementan los mismos puertos y pueden reemplazar
    // a estos sin otra modificacion.
    { provide: PATIENT_REPOSITORY, useClass: PatientHttpRepository },
    { provide: VITAL_SIGN_REPOSITORY, useClass: VitalSignHttpRepository },
    { provide: ALERT_REPOSITORY, useClass: AlertHttpRepository },
    { provide: HANDOVER_REPOSITORY, useClass: HandoverHttpRepository },
    { provide: MEDICAL_ORDER_REPOSITORY, useClass: MedicalOrderHttpRepository },
    { provide: CLINICAL_EVENT_REPOSITORY, useClass: ClinicalEventHttpRepository },
    { provide: AUDIT_LOG_REPOSITORY, useClass: AuditLogHttpRepository },
    { provide: USER_REPOSITORY, useClass: UserHttpRepository },

    // La carga del estado clinico ya no ocurre al arrancar: la dispara el
    // armazon, que solo se monta con sesion iniciada. Vease DataBootstrap.
  ],
};
