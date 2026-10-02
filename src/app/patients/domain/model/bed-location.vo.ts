export class BedLocation {
  private constructor(readonly unit: string, readonly bed: string) { Object.freeze(this); }
  static of(unit: string, bed: string): BedLocation {
    if (!unit?.trim() || !bed?.trim()) {
      throw new Error('Un paciente admitido requiere unidad y cama asignadas');
    }
    return new BedLocation(unit.trim(), bed.trim());
  }
  toString(): string { return `${this.unit} - ${this.bed}`; }
}
