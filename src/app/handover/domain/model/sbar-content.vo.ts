/**
 * Value Object SbarContent (BC-05).
 * Invariante: ninguna de las cuatro secciones del modelo SBAR puede ir vacia.
 */
export class SbarContent {
  private constructor(
    readonly situation: string,
    readonly background: string,
    readonly assessment: string,
    readonly recommendation: string,
  ) { Object.freeze(this); }

  static of(situation: string, background: string, assessment: string, recommendation: string): SbarContent {
    const sections: Array<[string, string]> = [
      ['Situation', situation], ['Background', background],
      ['Assessment', assessment], ['Recommendation', recommendation],
    ];
    const empty = sections.filter(([, v]) => !v || !v.trim()).map(([k]) => k);
    if (empty.length) {
      throw new Error(`El traspaso SBAR no puede emitirse con secciones vacias: ${empty.join(', ')}`);
    }
    return new SbarContent(situation.trim(), background.trim(), assessment.trim(), recommendation.trim());
  }
}
