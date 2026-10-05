/**
 * Value Object Dosage (BC-07).
 * Invariante: medicamento, dosis, via y frecuencia son obligatorios para que
 * enfermeria pueda ejecutar la indicacion sin consultar al medico.
 */
export class Dosage {
  private constructor(
    readonly medication: string,
    readonly dose: string,
    readonly route: string,
    readonly frequency: string,
  ) { Object.freeze(this); }

  static of(medication: string, dose: string, route: string, frequency: string): Dosage {
    const fields: Array<[string, string]> = [
      ['Medicamento', medication], ['Dosis', dose], ['Via', route], ['Frecuencia', frequency],
    ];
    const empty = fields.filter(([, v]) => !v || !v.trim()).map(([k]) => k);
    if (empty.length) {
      throw new Error(`La indicacion no puede emitirse con datos vacios: ${empty.join(', ')}`);
    }
    return new Dosage(medication.trim(), dose.trim(), route.trim(), frequency.trim());
  }

  toString(): string {
    return `${this.medication} ${this.dose} · ${this.route} · ${this.frequency}`;
  }
}
