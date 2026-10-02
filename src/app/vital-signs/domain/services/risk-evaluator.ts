import { RiskLevel } from '../model/risk-level.enum';
import { BloodPressure } from '../model/blood-pressure.vo';

interface Measurements {
  bloodPressure: BloodPressure;
  heartRate: number;
  oxygenSaturation: number;
  temperature: number;
}

/**
 * Servicio de dominio de BC-03: deriva el nivel de riesgo de los valores medidos.
 * Umbrales de referencia para unidades cardiovasculares; deben revisarse con el
 * personal clinico antes de usarse en operacion real.
 */
export function evaluateRisk(m: Measurements): RiskLevel {
  const critical =
    m.oxygenSaturation < 90 ||
    m.heartRate < 40 || m.heartRate > 130 ||
    m.bloodPressure.systolic < 90 || m.bloodPressure.systolic > 180 ||
    m.bloodPressure.meanArterialPressure < 65 ||
    m.temperature < 35 || m.temperature >= 39;
  if (critical) return RiskLevel.Critical;

  const warning =
    m.oxygenSaturation < 94 ||
    m.heartRate < 50 || m.heartRate > 110 ||
    m.bloodPressure.systolic < 100 || m.bloodPressure.systolic > 160 ||
    m.temperature >= 38;
  return warning ? RiskLevel.Warning : RiskLevel.Normal;
}
