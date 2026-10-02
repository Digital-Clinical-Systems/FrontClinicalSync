import { Routes } from '@angular/router';

/** Una ruta por modulo del dashboard clinico definido en la seccion 4.4 del informe. */
export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'pacientes' },
  {
    path: 'pacientes',
    title: 'Mis pacientes | ClinicalSync',
    loadComponent: () => import('./patients/presentation/patient-list/patient-list.component')
      .then(m => m.PatientListComponent),
  },
  {
    path: 'signos-vitales',
    title: 'Signos vitales | ClinicalSync',
    loadComponent: () => import('./vital-signs/presentation/vital-signs-dashboard/vital-signs-dashboard.component')
      .then(m => m.VitalSignsDashboardComponent),
  },
  {
    path: 'traspasos',
    title: 'Traspasos SBAR | ClinicalSync',
    loadComponent: () => import('./handover/presentation/handover-form/handover-form.component')
      .then(m => m.HandoverFormComponent),
  },
  {
    path: 'alertas',
    title: 'Alertas | ClinicalSync',
    loadComponent: () => import('./alerts/presentation/alert-list/alert-list.component')
      .then(m => m.AlertListComponent),
  },
  {
    path: 'auditoria',
    title: 'Auditoria | ClinicalSync',
    loadComponent: () => import('./audit/presentation/audit-log-list/audit-log-list.component')
      .then(m => m.AuditLogListComponent),
  },
  { path: '**', redirectTo: 'pacientes' },
];
