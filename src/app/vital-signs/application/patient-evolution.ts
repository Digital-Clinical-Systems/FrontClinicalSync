import { VitalSignRecord } from '../domain/model/vital-sign-record.entity';

export const EVOLUTION_RANGES = [
  { id: '1h', label: 'Ultima hora', hours: 1 },
  { id: '4h', label: 'Ultimas 4 horas', hours: 4 },
  { id: '12h', label: 'Ultimas 12 horas', hours: 12 },
  { id: 'all', label: 'Todo el turno', hours: null },
] as const;

export type EvolutionRangeId = (typeof EVOLUTION_RANGES)[number]['id'];

export const EVOLUTION_LIMIT = 10;

export function recordsForPatient(
  records: readonly VitalSignRecord[],
  patientId: string,
): VitalSignRecord[] {
  return records.filter(r => r.patientId.value === patientId);
}

export function withinRange(
  records: readonly VitalSignRecord[],
  hours: number | null,
  now: Date,
): VitalSignRecord[] {
  if (hours === null) return [...records];
  const cutoff = new Date(now.getTime() - hours * 60 * 60 * 1000);
  return records.filter(r => r.measuredAt >= cutoff);
}

export function toChronological(records: readonly VitalSignRecord[]): VitalSignRecord[] {
  return [...records].sort((a, b) => a.measuredAt.getTime() - b.measuredAt.getTime());
}

export type Trend = 'up' | 'down' | 'stable' | 'none';

export interface VitalTrends {
  readonly heartRate: Trend;
  readonly oxygenSaturation: Trend;
  readonly systolic: Trend;
  readonly temperature: Trend;
}

export function trendsBetween(current: VitalSignRecord, previous?: VitalSignRecord): VitalTrends {
  if (!previous) {
    return { heartRate: 'none', oxygenSaturation: 'none', systolic: 'none', temperature: 'none' };
  }
  return {
    heartRate: compareTrend(current.heartRate, previous.heartRate),
    oxygenSaturation: compareTrend(current.oxygenSaturation, previous.oxygenSaturation),
    systolic: compareTrend(current.bloodPressure.systolic, previous.bloodPressure.systolic),
    temperature: compareTrend(current.temperature, previous.temperature),
  };
}

function compareTrend(current: number, previous: number): Trend {
  if (current > previous) return 'up';
  if (current < previous) return 'down';
  return 'stable';
}
