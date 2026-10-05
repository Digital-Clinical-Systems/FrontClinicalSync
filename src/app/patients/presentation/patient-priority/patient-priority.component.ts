import { Component, inject, computed } from '@angular/core';
import { DatePipe } from '@angular/common';
import { PatientsStore } from '../../application/patients.store';
import { VitalSignsStore } from '../../../vital-signs/application/vital-signs.store';
import { AlertsStore } from '../../../alerts/application/alerts.store';
import { RiskLevel } from '../../../vital-signs/domain/model/risk-level.enum';
import { AlertStatus } from '../../../alerts/domain/model/alert-status.enum';

const ORDEN: Record<string, number> = {
  [RiskLevel.Critical]: 0,
  [RiskLevel.Warning]: 1,
  [RiskLevel.Normal]: 2,
  'SIN_DATOS': 3,
};

/**
 * US-28 y US-29 — Priorizacion de pacientes por riesgo (BG-03).
 *
 * Responde al hallazgo H-I de la seccion 2.2.3: la medica entrevistada relato
 * que en guardias de madrugada debe decidir a quien atender primero con
 * informacion incompleta. Esta vista ordena por el riesgo derivado del ultimo
 * registro de signos vitales y no por el orden de admision.
 *
 * El orden es una proyeccion de lectura: no toca el dominio de Vital Signs ni
 * el de Alerts, solo lee sus capas de aplicacion.
 */
@Component({
  selector: 'cs-patient-priority',
  standalone: true,
  imports: [DatePipe],
  template: `
    <h1>Pacientes por prioridad</h1>
    <p class="hint">
      Ordenados por el nivel de riesgo del ultimo registro de signos vitales, no por
      orden de admision. Un paciente sin registros en el turno aparece al final y se
      marca como tal: la ausencia de dato no es lo mismo que un dato normal.
    </p>

    <ol class="list">
      @for (fila of priorizados(); track fila.patientId) {
        <li class="item" [class]="'item--' + fila.riesgo.toLowerCase()">
          <span class="pos">{{ $index + 1 }}</span>
          <div class="info">
            <strong>{{ fila.nombre }}</strong>
            <p class="meta">{{ fila.cama }} &middot; {{ fila.diagnostico }}</p>
            @if (fila.ultimaMedicion) {
              <p class="meta">
                Ultimo registro {{ fila.ultimaMedicion | date:'HH:mm' }} &middot;
                PA {{ fila.presion }} &middot; FC {{ fila.frecuencia }} &middot; SpO2 {{ fila.saturacion }}%
              </p>
            } @else {
              <p class="meta meta--sin-datos">Sin registros en este turno</p>
            }
          </div>
          <div class="estado">
            <span class="tag" [class]="'tag--' + fila.riesgo.toLowerCase()">{{ etiqueta(fila.riesgo) }}</span>
            @if (fila.alertasAbiertas > 0) {
              <span class="alertas">{{ fila.alertasAbiertas }} alerta(s) abierta(s)</span>
            }
          </div>
        </li>
      }
    </ol>
  `,
  styleUrl: './patient-priority.component.css',
})
export class PatientPriorityComponent {
  private readonly patients = inject(PatientsStore);
  private readonly vitalSigns = inject(VitalSignsStore);
  private readonly alerts = inject(AlertsStore);

  readonly priorizados = computed(() => {
    const registros = this.vitalSigns.records();
    const abiertas = this.alerts.alerts().filter(a => a.status === AlertStatus.Open);

    return this.patients.patients()
      .map(p => {
        const ultimo = registros.find(r => r.patientId.value === p.id.value);
        return {
          patientId: p.id.value,
          nombre: p.fullName,
          cama: p.location.toString(),
          diagnostico: p.admissionDiagnosis,
          riesgo: ultimo ? ultimo.riskLevel : 'SIN_DATOS',
          ultimaMedicion: ultimo?.measuredAt,
          presion: ultimo?.bloodPressure.toString() ?? '-',
          frecuencia: ultimo?.heartRate ?? '-',
          saturacion: ultimo?.oxygenSaturation ?? '-',
          alertasAbiertas: abiertas.filter(a => a.patientId.value === p.id.value).length,
        };
      })
      .sort((a, b) => {
        const porRiesgo = ORDEN[a.riesgo] - ORDEN[b.riesgo];
        if (porRiesgo !== 0) return porRiesgo;
        // a igual riesgo, primero quien tiene mas alertas abiertas
        return b.alertasAbiertas - a.alertasAbiertas;
      });
  });

  etiqueta(riesgo: string): string {
    return riesgo === 'SIN_DATOS' ? 'SIN DATOS' : riesgo;
  }
}
