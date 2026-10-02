/**
 * Value Object BloodPressure (BC-03).
 * Invariantes: la sistolica es mayor que la diastolica y ambas caen dentro del
 * rango fisiologico admitido.
 */
export class BloodPressure {
  static readonly SYSTOLIC_RANGE = { min: 50, max: 260 };
  static readonly DIASTOLIC_RANGE = { min: 30, max: 160 };

  private constructor(readonly systolic: number, readonly diastolic: number) {}

  static of(systolic: number, diastolic: number): BloodPressure {
    if (!Number.isFinite(systolic) || !Number.isFinite(diastolic)) {
      throw new Error('La presion arterial requiere valores numericos');
    }
    const { SYSTOLIC_RANGE: s, DIASTOLIC_RANGE: d } = BloodPressure;
    if (systolic < s.min || systolic > s.max) {
      throw new Error(`Sistolica fuera del rango fisiologico (${s.min}-${s.max} mmHg)`);
    }
    if (diastolic < d.min || diastolic > d.max) {
      throw new Error(`Diastolica fuera del rango fisiologico (${d.min}-${d.max} mmHg)`);
    }
    if (systolic <= diastolic) {
      throw new Error('La sistolica debe ser mayor que la diastolica');
    }
    return new BloodPressure(systolic, diastolic);
  }

  get meanArterialPressure(): number {
    return Math.round((this.systolic + 2 * this.diastolic) / 3);
  }
  toString(): string { return `${this.systolic}/${this.diastolic}`; }
}
