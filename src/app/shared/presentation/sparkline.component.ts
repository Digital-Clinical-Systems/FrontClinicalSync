import { Component, input, signal, computed } from '@angular/core';
import { DatePipe } from '@angular/common';

export interface SeriesPoint {
  /** Momento de la medicion. */
  readonly at: Date;
  readonly value: number;
  /** NORMAL | WARNING | CRITICAL — pinta el punto, nunca la linea. */
  readonly status: string;
}

const STATUS_COLOR: Record<string, string> = {
  NORMAL: 'var(--cs-normal)', WARNING: 'var(--cs-warning)', CRITICAL: 'var(--cs-critical)',
};
const STATUS_LABEL: Record<string, string> = {
  NORMAL: 'Normal', WARNING: 'En alerta', CRITICAL: 'Critico',
};

/**
 * Grafico de evolucion de una sola magnitud.
 *
 * Decisiones de diseno, en el orden en que se tomaron:
 *  - *Forma*: la pregunta es como cambio un valor en el tiempo, de modo que es una
 *    linea y no barras.
 *  - *Una magnitud por grafico*: la frecuencia cardiaca, la saturacion y la
 *    temperatura viven en escalas distintas. Superponerlas obligaria a dos ejes
 *    verticales, que es el error mas comun en graficos clinicos porque permite
 *    sugerir cualquier correlacion eligiendo las escalas. Se usan multiplos
 *    pequenos: un grafico por magnitud, cada uno con su propio eje.
 *  - *Color*: la linea es tinta neutra. El color se reserva para el estado de cada
 *    punto, y nunca viaja solo: el punto fuera de rango es mas grande, la tabla de
 *    abajo repite el dato y el resumen accesible lo describe en texto.
 */
@Component({
  selector: 'cs-sparkline',
  standalone: true,
  imports: [DatePipe],
  template: `
    <figure class="spark">
      <figcaption>
        <span class="spark__title">{{ title() }}</span>
        <span class="spark__now" [style.color]="colorUltimo()">
          {{ formatted(last()?.value) }}<span class="spark__unit">{{ unit() }}</span>
        </span>
      </figcaption>

      @if (points().length > 1) {
        <svg [attr.viewBox]="'0 0 ' + W + ' ' + H" role="img"
             [attr.aria-label]="resumen()" (mouseleave)="hover.set(null)">
          <!-- Banda de referencia: el rango que el servicio considera normal. -->
          @if (band(); as b) {
            <rect x="0" [attr.y]="b.y" [attr.width]="W" [attr.height]="b.h"
                  fill="var(--cs-normal-bg)" />
          }
          <line x1="0" [attr.y1]="H - PAD" [attr.x2]="W" [attr.y2]="H - PAD"
                stroke="var(--cs-border)" stroke-width="1" />
          <polyline [attr.points]="path()" fill="none" stroke="var(--cs-ink-2)"
                    stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />
          @for (p of placed(); track p.i) {
            <circle [attr.cx]="p.x" [attr.cy]="p.y" [attr.r]="p.status === 'NORMAL' ? 3.5 : 5"
                    [attr.fill]="color(p.status)" stroke="var(--cs-card)" stroke-width="2" />
          }
          @if (hovered(); as p) {
            <line [attr.x1]="p.x" y1="0" [attr.x2]="p.x" [attr.y2]="H"
                  stroke="var(--cs-border-strong)" stroke-width="1" stroke-dasharray="3 3" />
            <circle [attr.cx]="p.x" [attr.cy]="p.y" r="7" fill="none"
                    [attr.stroke]="color(p.status)" stroke-width="2" />
          }
          <!-- Zonas de activacion generosas, independientes del tamano del punto. -->
          @for (p of placed(); track p.i) {
            <rect [attr.x]="p.x - slot() / 2" y="0" [attr.width]="slot()" [attr.height]="H"
                  fill="transparent" (mouseenter)="hover.set(p.i)" />
          }
        </svg>

        @if (hovered(); as p) {
          <p class="spark__tip" role="status">
            {{ p.at | date:'dd/MM HH:mm' }} &middot;
            <strong>{{ formatted(p.value) }}{{ unit() }}</strong> &middot;
            {{ estado(p.status) }}
          </p>
        } @else {
          <p class="spark__tip spark__tip--idle">
            {{ points().length }} mediciones &middot; pasa el cursor para ver cada una
          </p>
        }
      } @else {
        <p class="spark__empty">Se necesitan al menos dos mediciones para dibujar la evolucion.</p>
      }
    </figure>
  `,
  styles: [`
    .spark { margin:0; background:var(--cs-card); border:1px solid var(--cs-border);
      border-radius:var(--cs-radius); padding:.8rem .9rem; }
    figcaption { display:flex; align-items:baseline; justify-content:space-between; gap:.5rem; margin-bottom:.4rem; }
    .spark__title { font-size:.78rem; font-weight:600; color:var(--cs-ink-2); }
    .spark__now { font-size:1.1rem; font-weight:700; font-variant-numeric:tabular-nums; }
    .spark__unit { font-size:.72rem; font-weight:600; margin-left:.12rem; color:var(--cs-ink-3); }
    svg { width:100%; height:64px; display:block; overflow:visible; }
    .spark__tip { font-size:.74rem; color:var(--cs-ink-2); margin:.45rem 0 0; min-height:1.1em; }
    .spark__tip--idle { color:var(--cs-ink-3); }
    .spark__empty { font-size:.78rem; color:var(--cs-ink-3); margin:.4rem 0 0; }
  `],
})
export class SparklineComponent {
  readonly title = input.required<string>();
  readonly unit = input('');
  readonly points = input.required<readonly SeriesPoint[]>();
  /** Rango considerado normal, para dibujar la banda de referencia. */
  readonly normalRange = input<readonly [number, number] | null>(null);
  readonly decimals = input(0);

  readonly W = 240; readonly H = 64; readonly PAD = 8;
  readonly hover = signal<number | null>(null);

  readonly last = computed<SeriesPoint | undefined>(() => this.points().at(-1));
  readonly slot = computed(() => this.W / Math.max(this.points().length, 1));

  private readonly scale = computed(() => {
    const vs = this.points().map(p => p.value);
    const range = this.normalRange();
    const lo = Math.min(...vs, range ? range[0] : Infinity);
    const hi = Math.max(...vs, range ? range[1] : -Infinity);
    const pad = (hi - lo) * 0.15 || 1;
    return { lo: lo - pad, hi: hi + pad };
  });

  private y(v: number): number {
    const { lo, hi } = this.scale();
    const t = (v - lo) / (hi - lo || 1);
    return this.H - this.PAD - t * (this.H - this.PAD * 2);
  }

  readonly placed = computed(() => this.points().map((p, i) => ({
    i, x: this.slot() * (i + 0.5), y: this.y(p.value),
    value: p.value, status: p.status, at: p.at,
  })));
  readonly path = computed(() => this.placed().map(p => `${p.x},${p.y}`).join(' '));
  readonly hovered = computed(() => {
    const i = this.hover();
    return i === null ? null : this.placed()[i] ?? null;
  });

  readonly band = computed(() => {
    const r = this.normalRange();
    if (!r) return null;
    const top = this.y(r[1]); const bottom = this.y(r[0]);
    return { y: top, h: Math.max(bottom - top, 1) };
  });

  color(s: string): string { return STATUS_COLOR[s] ?? 'var(--cs-ink-3)'; }
  estado(s: string): string { return STATUS_LABEL[s] ?? s; }
  colorUltimo(): string { return this.color(this.last()?.status ?? 'NORMAL'); }
  formatted(v: number | undefined): string {
    return v === undefined ? '—' : v.toFixed(this.decimals());
  }

  /** Texto alternativo: la misma informacion que el dibujo, para quien no lo ve. */
  readonly resumen = computed(() => {
    const ps = this.points();
    if (ps.length < 2) return `${this.title()}: sin datos suficientes.`;
    const first = ps[0]; const last = ps[ps.length - 1];
    const dir = last.value > first.value ? 'en ascenso'
      : last.value < first.value ? 'en descenso' : 'estable';
    const fuera = ps.filter(p => p.status !== 'NORMAL').length;
    return `${this.title()}: ${ps.length} mediciones, ${dir}, de `
      + `${first.value.toFixed(this.decimals())} a ${last.value.toFixed(this.decimals())} ${this.unit()}. `
      + (fuera ? `${fuera} fuera de rango.` : 'Todas dentro de rango.');
  });
}
