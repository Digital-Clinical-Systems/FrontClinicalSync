import { Component, input } from '@angular/core';

export type IconName =
  | 'pacientes' | 'prioridad' | 'pendientes' | 'signos' | 'registros'
  | 'indicaciones' | 'traspasos' | 'resumen' | 'alertas' | 'bitacora'
  | 'colapsar' | 'expandir';

/**
 * Iconografia de la navegacion. Trazo uniforme de 1.75 y color heredado, para
 * que el icono acompane al texto sin competir con el y cambie de color junto a
 * el cuando la seccion esta activa.
 *
 * Es decorativa: cada icono va siempre junto a su etiqueta, y lleva
 * aria-hidden para que un lector de pantalla no lea dos veces lo mismo. Cuando
 * la barra se colapsa, la etiqueta no desaparece del arbol de accesibilidad,
 * solo deja de verse.
 */
@Component({
  selector: 'cs-icon',
  standalone: true,
  template: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"
         stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
      @switch (name()) {
        @case ('pacientes') {
          <path d="M16 20v-1.5a3 3 0 0 0-3-3H6a3 3 0 0 0-3 3V20" />
          <circle cx="9.5" cy="7.5" r="3.2" />
          <path d="M18 10.5h4M20 8.5v4" />
        }
        @case ('prioridad') {
          <path d="M4 7h11M4 12h7M4 17h4" />
          <path d="M17.5 9.5v9M14.5 15.5l3 3 3-3" />
        }
        @case ('pendientes') {
          <rect x="5" y="4" width="14" height="17" rx="2" />
          <path d="M9 4.5h6v2H9z" />
          <path d="M8.5 12.5l2 2 4-4" />
        }
        @case ('signos') {
          <path d="M3 12h3.5l2-5 3 10 2.5-7 1.5 2H21" />
        }
        @case ('registros') {
          <rect x="3.5" y="9" width="10" height="7" rx="3.5" transform="rotate(-40 8.5 12.5)" />
          <path d="M8 8.5l5 5" />
          <path d="M17 15v6M14 18h6" />
        }
        @case ('indicaciones') {
          <path d="M6 3.5h8l4 4V20a1.5 1.5 0 0 1-1.5 1.5h-10A1.5 1.5 0 0 1 5 20V5A1.5 1.5 0 0 1 6.5 3.5z" />
          <path d="M13.5 3.5V8h4.5M8.5 13h7M8.5 16.5h5" />
        }
        @case ('traspasos') {
          <path d="M4 9h12l-3-3M20 15H8l3 3" />
        }
        @case ('resumen') {
          <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
          <path d="M3.5 12h4l1.5-3 2.5 6 2-4 1 1h6" />
        }
        @case ('alertas') {
          <path d="M18 9a6 6 0 1 0-12 0c0 5-2 6-2 6h16s-2-1-2-6z" />
          <path d="M10.3 20a2 2 0 0 0 3.4 0" />
        }
        @case ('bitacora') {
          <circle cx="12" cy="12" r="8.5" />
          <path d="M12 7v5.5l3.5 2" />
        }
        @case ('colapsar') { <path d="M15 5l-7 7 7 7" /> }
        @case ('expandir') { <path d="M9 5l7 7-7 7" /> }
      }
    </svg>
  `,
  styles: [`
    :host { display:inline-flex; }
    svg { width:1.15rem; height:1.15rem; flex:0 0 auto; }
  `],
})
export class IconComponent {
  readonly name = input.required<IconName>();
}
