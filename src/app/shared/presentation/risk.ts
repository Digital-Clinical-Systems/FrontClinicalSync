import { ChipTone } from './risk-chip.component';

/** Traduccion unica de nivel de riesgo a tono y etiqueta, usada por toda la interfaz. */
export const RISK_TONE: Record<string, ChipTone> = {
  NORMAL: 'normal', WARNING: 'warning', CRITICAL: 'critical',
};
export const RISK_LABEL: Record<string, string> = {
  NORMAL: 'Normal', WARNING: 'En alerta', CRITICAL: 'Critico',
};
export const ALERT_STATUS_LABEL: Record<string, string> = {
  OPEN: 'Abierta', ACKNOWLEDGED: 'Atendida', RESOLVED: 'Resuelta',
};
export const ALERT_STATUS_TONE: Record<string, ChipTone> = {
  OPEN: 'critical', ACKNOWLEDGED: 'warning', RESOLVED: 'normal',
};
export const HANDOVER_STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Borrador', ISSUED: 'Pendiente de acuse', ACKNOWLEDGED: 'Acusado',
};
export const HANDOVER_STATUS_TONE: Record<string, ChipTone> = {
  DRAFT: 'neutral', ISSUED: 'warning', ACKNOWLEDGED: 'normal',
};
