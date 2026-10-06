/**
 * BC-08. Dos clases de registro comparten agregado porque comparten invariantes
 * y ciclo de vida: ambos son anotaciones inmutables hechas por quien atiende al
 * paciente, fechadas y atribuidas.
 */
export enum ClinicalEventType {
  /** US-19: constancia de un medicamento administrado. */
  MedicationAdministration = 'MEDICATION_ADMINISTRATION',
  /** US-20: evento clinico relevante ocurrido durante el turno. */
  ClinicalObservation = 'CLINICAL_OBSERVATION',
}

/** Gravedad declarada por quien registra. Un evento critico genera alerta en BC-04. */
export enum ClinicalEventSeverity {
  Routine = 'ROUTINE',
  Notable = 'NOTABLE',
  Critical = 'CRITICAL',
}

export const CLINICAL_EVENT_TYPE_LABEL: Record<ClinicalEventType, string> = {
  [ClinicalEventType.MedicationAdministration]: 'Medicamento administrado',
  [ClinicalEventType.ClinicalObservation]: 'Evento clinico',
};

export const CLINICAL_EVENT_SEVERITY_LABEL: Record<ClinicalEventSeverity, string> = {
  [ClinicalEventSeverity.Routine]: 'Rutinario',
  [ClinicalEventSeverity.Notable]: 'A vigilar',
  [ClinicalEventSeverity.Critical]: 'Critico',
};
