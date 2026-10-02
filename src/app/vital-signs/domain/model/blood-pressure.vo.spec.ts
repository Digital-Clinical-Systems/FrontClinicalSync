import { BloodPressure } from './blood-pressure.vo';

describe('BloodPressure (BC-03) — invariantes del Value Object', () => {
  it('acepta una medicion fisiologicamente valida', () => {
    const bp = BloodPressure.of(120, 80);
    expect(bp.toString()).toBe('120/80');
  });

  it('rechaza sistolica menor o igual que la diastolica', () => {
    expect(() => BloodPressure.of(80, 120)).toThrowError(/mayor que la diastolica/);
    expect(() => BloodPressure.of(90, 90)).toThrowError(/mayor que la diastolica/);
  });

  it('rechaza valores fuera del rango fisiologico', () => {
    expect(() => BloodPressure.of(300, 80)).toThrowError(/Sistolica fuera del rango/);
    expect(() => BloodPressure.of(120, 10)).toThrowError(/Diastolica fuera del rango/);
  });

  it('calcula la presion arterial media', () => {
    expect(BloodPressure.of(120, 60).meanArterialPressure).toBe(80);
  });
});
