import { Component, input } from '@angular/core';

export type ChipTone = 'normal' | 'warning' | 'critical' | 'neutral';

/**
 * Distintivo de estado. El color nunca va solo: lleva siempre su etiqueta de
 * texto, de modo que la informacion llega igual a un lector de pantalla, a una
 * impresion en blanco y negro y a quien tiene deficiencia de vision cromatica.
 */
@Component({
  selector: 'cs-chip',
  standalone: true,
  template: `
    <span class="chip chip--{{ tone() }}">
      <span class="chip__dot" aria-hidden="true"></span>{{ label() }}
    </span>
  `,
})
export class ChipComponent {
  readonly tone = input<ChipTone>('neutral');
  readonly label = input.required<string>();
}
