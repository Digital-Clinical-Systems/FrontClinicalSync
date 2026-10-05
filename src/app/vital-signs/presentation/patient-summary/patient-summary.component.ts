import { Component, inject, input, signal, computed } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { PatientsStore } from '../../../patients/application/patients.store';
import { VitalSignsStore } from '../../application/vital-signs.store';
import { AlertsStore } from '../../../alerts/application/alerts.store';
import { AlertStatus } from '../../../alerts/domain/model/alert-status.enum';
import {
  recordsForPatient, trendsBetween,
  Trend, VitalTrends,
} from '../../application/patient-evolution';
import { VitalSignRecord } from '../../domain/model/vital-sign-record.entity';

@Component({
  selector: 'cs-patient-summary',
  standalone: true,
  imports: [DatePipe, RouterLink],
  template: `
    <h1>Resumen del paciente</h1>
    <p class="hint">US-26 y US-27 &middot; Vista consolidada para el medico: estado actual y
      evolucion reciente en una sola pantalla. El riesgo lo deriva el dominio de
      Vital Signs; esta vista solo lo lee.</p>

    @if (allPatients().length === 0) {
      <p class="empty">No hay pacientes registrados en el turno.</p>
    } @else {
      <div class="patient-select">
        <label for="patient-selector">Paciente</label>
        <select id="patient-selector"
                [value]="selectedId()"
                (change)="onSelect($any($event.target).value)">
          @for (p of allPatients(); track p.id.value) {
            <option [value]="p.id.value">{{ p.fullName }} &mdash; {{ p.location.toString() }}</option>
          }
        </select>
      </div>

      @if (patient(); as p) {
        <section class="summary-card" [attr.aria-label]="'Datos de ' + p.fullName">
          <h2 class="summary-card__title">{{ p.fullName }}</h2>
          <p class="summary-card__meta">HC: {{ p.medicalRecordNumber }} &middot; {{ p.location.toString() }}</p>
          <p class="summary-card__meta">Diagnostico de ingreso: {{ p.admissionDiagnosis }}</p>
          <p class="summary-card__meta">Admitido el {{ p.admittedAt | date:'dd/MM/yyyy HH:mm' }}</p>
        </section>
      }

      @if (latest(); as last) {
        <section class="summary-card"
                 [class.summary-card--critical]="last.riskLevel === 'CRITICAL'"
                 aria-label="Ultimo registro de signos vitales">
          <h2 class="summary-card__title">Ultimo registro</h2>
          @if (last.riskLevel === 'CRITICAL') {
            <p class="summary-card__critical-label">Riesgo critico</p>
          }
          <div class="latest-header">
            <span class="latest-header__time">{{ last.measuredAt | date:'HH:mm' }}</span>
            <span class="tag" [class]="'tag--' + last.riskLevel.toLowerCase()">{{ last.riskLevel }}</span>
            <span class="latest-header__by">Registrado por {{ last.recordedBy.value }}</span>
          </div>
          <div class="metrics-grid">
            <div class="metric">
              <div class="metric__label">PA (PAM)</div>
              <div class="metric__value">
                {{ last.bloodPressure.toString() }}
                ({{ last.bloodPressure.meanArterialPressure }})
                <span class="metric__trend"
                      [attr.aria-label]="trendLabel(latestTrends().systolic)">{{ trendArrow(latestTrends().systolic) }}</span>
              </div>
            </div>
            <div class="metric">
              <div class="metric__label">FC (lpm)</div>
              <div class="metric__value">
                {{ last.heartRate }}
                <span class="metric__trend"
                      [attr.aria-label]="trendLabel(latestTrends().heartRate)">{{ trendArrow(latestTrends().heartRate) }}</span>
              </div>
            </div>
            <div class="metric">
              <div class="metric__label">SpO2 (%)</div>
              <div class="metric__value">
                {{ last.oxygenSaturation }}
                <span class="metric__trend"
                      [attr.aria-label]="trendLabel(latestTrends().oxygenSaturation)">{{ trendArrow(latestTrends().oxygenSaturation) }}</span>
              </div>
            </div>
            <div class="metric">
              <div class="metric__label">T (&deg;C)</div>
              <div class="metric__value">
                {{ last.temperature }}
                <span class="metric__trend"
                      [attr.aria-label]="trendLabel(latestTrends().temperature)">{{ trendArrow(latestTrends().temperature) }}</span>
              </div>
            </div>
          </div>
        </section>
      } @else {
        <section class="summary-card">
          <p class="empty">Este paciente aun no tiene registros de signos vitales en el turno.</p>
          <a class="empty-link" routerLink="/signos-vitales">Registrar signos vitales</a>
        </section>
      }

      <section aria-label="Alertas abiertas del paciente">
        <h2>Alertas abiertas</h2>
        @if (openAlerts().length === 0) {
          <p class="empty">Sin alertas abiertas.</p>
        } @else {
          <ul class="alert-list">
            @for (a of openAlerts(); track a.id) {
              <li class="alert-item">
                <div>
                  <span class="tag" [class]="'tag--' + a.severity.toLowerCase()">{{ a.severity }}</span>
                  <span class="alert-item__reason">{{ a.reason }}</span>
                </div>
                <span class="alert-item__time">{{ a.raisedAt | date:'HH:mm' }}</span>
              </li>
            }
          </ul>
          <a class="alert-link" routerLink="/alertas">Ir a alertas</a>
        }
      </section>
    }
  `,
  styleUrl: './patient-summary.component.css',
})
export class PatientSummaryComponent {
  private readonly patients = inject(PatientsStore);
  private readonly vitalSigns = inject(VitalSignsStore);
  private readonly alertsStore = inject(AlertsStore);
  private readonly router = inject(Router);

  readonly paciente = input<string>();

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

  readonly patientRecords = computed(() =>
    recordsForPatient(this.vitalSigns.records(), this.selectedId()),
  );

  readonly latest = computed(() => this.patientRecords()[0] as VitalSignRecord | undefined);
  readonly previous = computed(() => this.patientRecords()[1] as VitalSignRecord | undefined);

  readonly latestTrends = computed((): VitalTrends => {
    const l = this.latest();
    return l ? trendsBetween(l, this.previous()) : { heartRate: 'none', oxygenSaturation: 'none', systolic: 'none', temperature: 'none' };
  });

  readonly openAlerts = computed(() =>
    this.alertsStore.alerts()
      .filter(a => a.patientId.value === this.selectedId() && a.status === AlertStatus.Open)
      .sort((a, b) => b.raisedAt.getTime() - a.raisedAt.getTime()),
  );

  onSelect(id: string): void {
    this.manualSelection.set(id);
    this.router.navigate([], { queryParams: { paciente: id }, replaceUrl: true });
  }

  protected trendArrow(trend: Trend): string {
    switch (trend) {
      case 'up': return '↑';
      case 'down': return '↓';
      case 'stable': return '→';
      case 'none': return '';
    }
  }

  protected trendLabel(trend: Trend): string {
    switch (trend) {
      case 'up': return 'subio respecto del registro anterior';
      case 'down': return 'bajo respecto del registro anterior';
      case 'stable': return 'estable respecto del registro anterior';
      case 'none': return 'sin registro previo para comparar';
    }
  }
}
