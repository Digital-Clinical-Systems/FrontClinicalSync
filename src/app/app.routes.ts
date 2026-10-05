import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'pacientes' },
  {
    path: 'pacientes',
    title: 'Mis pacientes | ClinicalSync',
    loadComponent: () => import('./patients/presentation/patient-list/patient-list.component')
      .then(m => m.PatientListComponent),
  },
  {
    path: 'prioridad',
    title: 'Pacientes por prioridad | ClinicalSync',
    loadComponent: () => import('./patients/presentation/patient-priority/patient-priority.component')
      .then(m => m.PatientPriorityComponent),
  },
  {
    path: 'signos-vitales',
    title: 'Signos vitales | ClinicalSync',
    loadComponent: () => import('./vital-signs/presentation/vital-signs-dashboard/vital-signs-dashboard.component')
      .then(m => m.VitalSignsDashboardComponent),
  },
  {
<<<<<<< HEAD
    path: 'indicaciones',
    title: 'Indicaciones medicas | ClinicalSync',
    loadComponent: () => import('./medical-orders/presentation/medical-order-form/medical-order-form.component')
      .then(m => m.MedicalOrderFormComponent),
=======
    path: 'resumen-paciente',
    title: 'Resumen del paciente | ClinicalSync',
    loadComponent: () => import('./vital-signs/presentation/patient-summary/patient-summary.component')
      .then(m => m.PatientSummaryComponent),
>>>>>>> origin/feature/us-26-vista-consolidada
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
