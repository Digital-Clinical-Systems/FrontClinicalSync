/** Shared Kernel: identificador tipado comun a todos los Bounded Contexts. */
export abstract class Identifier {
  protected constructor(public readonly value: string) {
    if (!value || !value.trim()) {
      throw new Error('Un identificador no puede ser vacio');
    }
  }
  equals(other: Identifier): boolean {
    return other?.constructor === this.constructor && other.value === this.value;
  }
  toString(): string { return this.value; }
}

export class UserId extends Identifier {
  static of(value: string): UserId { return new UserId(value); }
}
export class PatientId extends Identifier {
  static of(value: string): PatientId { return new PatientId(value); }
}
