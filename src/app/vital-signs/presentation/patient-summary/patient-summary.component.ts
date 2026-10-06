import { Component, inject, input, signal, computed } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { PatientsStore } from '../../../patients/application/patients.store';
import { VitalSignsStore } from '../../application/vital-signs.store';
import { AlertsStore } from '../../../alerts/application/alerts.store';
import { MedicalOrdersStore } from '../../../medical-orders/application/medical-orders.store';
import { HandoverStore } from '../../../handover/application/handover.store';
import { ClinicalEventsStore } from '../../../clinical-events/application/clinical-events.store';
import { DirectoryStore } from '../../../iam/application/directory.store';
import { AlertStatus } from '../../../alerts/domain/model/alert-status.enum';
import {
  EVOLUTION_RANGES, EvolutionRangeId, EVOLUTION_LIMIT,
  recordsForPatient, withinRange, toChronological, trendsBetween, Trend, VitalTrends,
} from '../../application/patient-evolution';
import { VitalSignRecord } from '../../domain/model/vital-sign-record.entity';
import { ChipComponent } from '../../../shared/presentation/risk-chip.component';
import { EmptyStateComponent } from '../../../shared/presentation/empty-state.component';
import { SparklineComponent, SeriesPoint } from '../../../shared/presentation/sparkline.component';
import { RISK_TONE, RISK_LABEL, ALERT_STATUS_LABEL, ALERT_STATUS_TONE } from '../../../shared/presentation/risk';

@Component({
  selector: 'cs-patient-summary',
  standalone: true,
  imports: [DatePipe, ChipComponent, EmptyStateComponent, SparklineComponent],
  template: `
    <header class="page-head">
      <div class="page-head__row">
        <div>
          <h1>Resumen del paciente</h1>
          <p class="lead" style="margin-bottom:0">
            US-26 y US-27. Estado actual y evolucion reciente en una sola pantalla. El nivel
            de riesgo lo deriva el dominio de signos vitales; esta vista solo lo lee.
          </p>
        </div>
        <div class="field" style="margin:0;min-width:260px">
          <label for="sel-paciente">Paciente</label>
          <select id="sel-paciente" [value]="selectedId()" (change)="onSelect($any($event.target).value)">
            @for (p of allPatients(); track p.id.value) {
              <option [value]="p.id.value" [selected]="p.id.value === selectedId()">
                {{ p.fullName }} &mdash; {{ p.location.toString() }}
              </option>
            }
          </select>
        </div>
      </div>
    </header>

    @if (allPatients().length === 0) {
      <section class="card"><cs-empty title="No hay pacientes en el turno" /></section>
    } @else {
      @if (patient(); as p) {

      <section class="card">
        <div class="card__head">
          <h2 style="margin:0">{{ p.fullName }}</h2>
          @if (latest(); as l) { <cs-chip [tone]="tono(l.riskLevel)" [label]="etiqueta(l.riskLevel)" /> }
          @else { <cs-chip tone="neutral" label="Sin medicion" /> }
        </div>
        <dl class="facts">
          <div><dt>Historia clinica</dt><dd>{{ p.medicalRecordNumber }}</dd></div>
          <div><dt>Ubicacion</dt><dd>{{ p.location.toString() }}</dd></div>
          <div><dt>Diagnostico de ingreso</dt><dd>{{ p.admissionDiagnosis }}</dd></div>
          <div><dt>Admitido</dt><dd>{{ p.admittedAt | date:'dd/MM/yyyy HH:mm' }}</dd></div>
          <div><dt>Ultimo control</dt>
            <dd>@if (latest(); as l) { {{ l.measuredAt | date:'dd/MM HH:mm' }} &middot;
                  {{ directory.nameOf(l.recordedBy.value) }} } @else { Sin registros }</dd></div>
          <div><dt>Indicaciones vigentes</dt><dd>{{ orders.activeFor(selectedId()).length }}</dd></div>
        </dl>
      </section>

      @if (latest(); as l) {
        <section class="card">
          <div class="card__head">
            <h2 style="margin:0">Evolucion reciente</h2>
            <div class="field" style="margin:0;min-width:200px">
              <label for="rango" class="sr-only">Rango de tiempo</label>
              <select id="rango" [value]="range()" (change)="range.set($any($event.target).value)">
                @for (r of ranges; track r.id) {
                  <option [value]="r.id" [selected]="r.id === range()">{{ r.label }}</option>
                }
              </select>
            </div>
          </div>
          <p class="muted" style="font-size:.8rem;margin-top:-.4rem">
            Una magnitud por grafico: superponerlas obligaria a dos escalas verticales distintas
            y eso permite sugerir relaciones que los datos no sostienen. La linea es neutra; el
            color marca el estado de cada medicion y va acompanado de la tabla de abajo.
          </p>
          <div class="grid grid--charts">
            <cs-sparkline title="Frecuencia cardiaca" unit=" lpm"
                          [points]="serie('hr')" [normalRange]="[50, 110]" />
            <cs-sparkline title="Saturacion de oxigeno" unit=" %"
                          [points]="serie('spo2')" [normalRange]="[94, 100]" />
            <cs-sparkline title="Presion sistolica" unit=" mmHg"
                          [points]="serie('sys')" [normalRange]="[100, 160]" />
            <cs-sparkline title="Temperatura" unit=" C" [decimals]="1"
                          [points]="serie('temp')" [normalRange]="[36, 38]" />
          </div>
        </section>

        <section class="card card--flush">
          <div class="card__head"><h2 style="margin:0">Mediciones del rango</h2></div>
          <div class="table-wrap">
            <table class="data">
              <caption>Hasta {{ limite }} mediciones, de la mas antigua a la mas reciente. La flecha compara con la medicion anterior.</caption>
              <thead>
                <tr>
                  <th scope="col">Momento</th>
                  <th scope="col" class="num">PA (mmHg)</th>
                  <th scope="col" class="num">FC (lpm)</th>
                  <th scope="col" class="num">SpO2 (%)</th>
                  <th scope="col" class="num">T (C)</th>
                  <th scope="col">Estado</th>
                  <th scope="col">Responsable</th>
                </tr>
              </thead>
              <tbody>
                @for (row of evolution(); track row.record.id) {
                  <tr>
                    <td class="mono">{{ row.record.measuredAt | date:'dd/MM HH:mm' }}</td>
                    <td class="num">{{ row.record.bloodPressure.toString() }}
                      <span [attr.aria-label]="flechaTexto(row.trends.systolic)">{{ flecha(row.trends.systolic) }}</span></td>
                    <td class="num">{{ row.record.heartRate }}
                      <span [attr.aria-label]="flechaTexto(row.trends.heartRate)">{{ flecha(row.trends.heartRate) }}</span></td>
                    <td class="num">{{ row.record.oxygenSaturation }}
                      <span [attr.aria-label]="flechaTexto(row.trends.oxygenSaturation)">{{ flecha(row.trends.oxygenSaturation) }}</span></td>
                    <td class="num">{{ row.record.temperature }}
                      <span [attr.aria-label]="flechaTexto(row.trends.temperature)">{{ flecha(row.trends.temperature) }}</span></td>
                    <td><cs-chip [tone]="tono(row.record.riskLevel)" [label]="etiqueta(row.record.riskLevel)" /></td>
                    <td class="muted">{{ directory.nameOf(row.record.recordedBy.value) }}</td>
                  </tr>
                } @empty {
                  <tr><td colspan="7"><cs-empty title="Sin mediciones en este rango"
                        detail="Amplia el rango de tiempo para ver registros anteriores." /></td></tr>
                }
              </tbody>
            </table>
          </div>
        </section>
      } @else {
        <section class="card">
          <cs-empty title="Este paciente no tiene mediciones"
                    detail="Registra signos vitales para que aparezcan el estado y la evolucion." />
        </section>
      }

      <div class="grid grid--2">
        <section class="card">
          <h2>Alertas sin cerrar</h2>
          @for (a of alertasAbiertas(); track a.id) {
            <div class="mini">
              <div class="mini__head">
                <cs-chip [tone]="tonoEstado(a.status)" [label]="etiquetaEstado(a.status)" />
                <span class="muted" style="font-size:.78rem">{{ a.raisedAt | date:'dd/MM HH:mm' }}</span>
              </div>
              <p class="mini__text">{{ a.reason }}</p>
              <p class="muted" style="font-size:.76rem;margin:0">Origen: {{ a.originLabel }}</p>
            </div>
          } @empty {
            <cs-empty title="Sin alertas abiertas" detail="No hay nada pendiente de atender para este paciente." />
          }
        </section>

        <section class="card">
          <h2>Indicaciones vigentes</h2>
          @for (o of orders.activeFor(selectedId()); track o.id) {
            <div class="mini">
              <div class="mini__head">
                <strong>{{ o.dosage.medication }} {{ o.dosage.dose }}</strong>
                @if (o.fulfilledAt) { <cs-chip tone="normal" label="Cumplida" /> }
                @else { <cs-chip tone="warning" label="Pendiente" /> }
              </div>
              <p class="mini__text">{{ o.dosage.route }} &middot; {{ o.dosage.frequency }}</p>
              <p class="muted" style="font-size:.76rem;margin:0">
                Prescrita por {{ directory.nameOf(o.prescribedBy.value) }} el {{ o.prescribedAt | date:'dd/MM HH:mm' }}
              </p>
            </div>
          } @empty {
            <cs-empty title="Sin indicaciones vigentes" />
          }
        </section>
      </div>

      <section class="card">
        <h2>Anotaciones del turno</h2>
        @for (e of events.forPatient(selectedId()).slice(0, 8); track e.id) {
          <div class="mini">
            <div class="mini__head">
              <span class="mono muted" style="font-size:.78rem">{{ e.occurredAt | date:'dd/MM HH:mm' }}</span>
              @if (e.isMedication) { <strong>{{ e.medication }} {{ e.dose }}</strong> }
            </div>
            <p class="mini__text">{{ e.description }}</p>
            <p class="muted" style="font-size:.76rem;margin:0">{{ directory.nameOf(e.recordedBy.value) }}</p>
          </div>
        } @empty {
          <cs-empty title="Sin anotaciones" detail="Los medicamentos administrados y los eventos del turno apareceran aqui." />
        }
      </section>
      }
    }
  `,
  styles: [`
    .facts { display:grid; grid-template-columns:repeat(auto-fit,minmax(190px,1fr)); gap:.8rem; margin:0; }
    .facts dt { font-size:.72rem; text-transform:uppercase; letter-spacing:.05em; color:var(--cs-ink-3); font-weight:600; }
    .facts dd { margin:.15rem 0 0; font-size:.88rem; }
    .mini { border-left:3px solid var(--cs-border-strong); padding-left:.75rem; margin-bottom:.8rem; }
    .mini:last-child { margin-bottom:0; }
    .mini__head { display:flex; flex-wrap:wrap; align-items:center; gap:.5rem; margin-bottom:.2rem; }
    .mini__text { font-size:.85rem; margin:0 0 .15rem; }
  `],
})
export class PatientSummaryComponent {
  private readonly patients = inject(PatientsStore);
  private readonly vitalSigns = inject(VitalSignsStore);
  private readonly alertsStore = inject(AlertsStore);
  private readonly router = inject(Router);
  readonly orders = inject(MedicalOrdersStore);
  readonly handovers = inject(HandoverStore);
  readonly events = inject(ClinicalEventsStore);
  readonly directory = inject(DirectoryStore);

  readonly paciente = input<string>();
  readonly limite = EVOLUTION_LIMIT;
  private readonly manualSelection = signal<string | null>(null);
  protected readonly allPatients = this.patients.patients;

  readonly selectedId = computed(() => {
    const manual = this.manualSelection();
    if (manual && this.patients.byId(manual)) return manual;
    const fromRoute = this.paciente();
    if (fromRoute && this.patients.byId(fromRoute)) return fromRoute;
    return this.patients.patients()[0]?.id.value ?? '';
  });

  readonly patient = computed(() => this.patients.byId(this.selectedId()));
  readonly patientRecords = computed(() => recordsForPatient(this.vitalSigns.records(), this.selectedId()));
  readonly latest = computed(() => this.patientRecords()[0] as VitalSignRecord | undefined);
  readonly previous = computed(() => this.patientRecords()[1] as VitalSignRecord | undefined);

  readonly latestTrends = computed((): VitalTrends => {
    const l = this.latest();
    return l ? trendsBetween(l, this.previous())
      : { heartRate: 'none', oxygenSaturation: 'none', systolic: 'none', temperature: 'none' };
  });

  readonly range = signal<EvolutionRangeId>('all');
  protected readonly ranges = EVOLUTION_RANGES;

  readonly evolution = computed(() => {
    const cfg = EVOLUTION_RANGES.find(r => r.id === this.range())!;
    const chrono = toChronological(withinRange(this.patientRecords(), cfg.hours, new Date()).slice(0, EVOLUTION_LIMIT));
    return chrono.map((record, i) => ({ record, trends: trendsBetween(record, i > 0 ? chrono[i - 1] : undefined) }));
  });

  /** Serie de una magnitud, con el estado del registro completo en cada punto. */
  serie(metric: 'hr' | 'spo2' | 'sys' | 'temp'): SeriesPoint[] {
    return this.evolution().map(({ record }) => ({
      at: record.measuredAt,
      status: record.riskLevel,
      value: metric === 'hr' ? record.heartRate
        : metric === 'spo2' ? record.oxygenSaturation
        : metric === 'sys' ? record.bloodPressure.systolic
        : record.temperature,
    }));
  }

  readonly alertasAbiertas = computed(() =>
    this.alertsStore.alerts()
      .filter(a => a.patientId.value === this.selectedId() && a.status !== AlertStatus.Resolved)
      .sort((a, b) => b.raisedAt.getTime() - a.raisedAt.getTime()));

  onSelect(id: string): void {
    this.manualSelection.set(id);
    this.router.navigate([], { queryParams: { paciente: id }, replaceUrl: true });
  }

  tono(r: string) { return RISK_TONE[r] ?? 'neutral'; }
  etiqueta(r: string) { return RISK_LABEL[r] ?? r; }
  tonoEstado(s: string) { return ALERT_STATUS_TONE[s] ?? 'neutral'; }
  etiquetaEstado(s: string) { return ALERT_STATUS_LABEL[s] ?? s; }

  flecha(t: Trend): string {
    return t === 'up' ? '↑' : t === 'down' ? '↓' : t === 'stable' ? '→' : '';
  }
  flechaTexto(t: Trend): string {
    return t === 'up' ? 'subio respecto de la medicion anterior'
      : t === 'down' ? 'bajo respecto de la medicion anterior'
      : t === 'stable' ? 'estable respecto de la medicion anterior'
      : 'sin medicion previa para comparar';
  }
}
