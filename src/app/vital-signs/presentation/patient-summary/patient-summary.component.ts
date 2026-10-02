import { Component, inject, signal, computed } from '@angular/core';
import { DatePipe } from '@angular/common';
import { PatientsStore } from '../../../patients/application/patients.store';
import { VitalSignsStore } from '../../../vital-signs/application/vital-signs.store';

/**
 * US-26 y US-27 — Vista consolidada del paciente (BG-03).
 *
 * CONTEXTO
 * El medico especialista hoy consulta entre tres y cuatro fuentes distintas y
 * tarda entre 10 y 15 minutos por paciente (Entrevista 1 del segmento de
 * medicos, seccion 2.2.2 del informe). Esta pantalla existe para que esa
 * informacion este en un solo lugar.
 *
 * QUE DEBE MOSTRAR
 *  1. Selector de paciente (reutiliza patients.patients() como en las otras pantallas).
 *  2. Datos del paciente: nombre, numero de historia clinica, cama, diagnostico.
 *  3. Ultimo registro de signos vitales con su nivel de riesgo destacado.
 *  4. Evolucion reciente: los ultimos 5 registros en orden cronologico,
 *     para que se vea la tendencia y no solo el valor actual.
 *
 * DE DONDE SALEN LOS DATOS
 *  - patients.byId(id)                        -> datos del paciente
 *  - vitalSigns.records()                     -> todos los registros
 *    filtrados por r.patientId.value === id   -> los de este paciente
 *  Ya vienen ordenados del mas reciente al mas antiguo.
 *
 * REGLA QUE NO HAY QUE ROMPER
 * Este componente vive en vital-signs/presentation/. Puede leer de la capa
 * application/ de otros contextos (como hace vital-signs-dashboard con
 * PatientsStore), pero nunca de su infrastructure/. Antes de hacer el PR corre:
 *     npm run check:boundaries
 *
 * COMO VERLO MIENTRAS TRABAJAS
 *  1. Agrega la ruta en src/app/app.routes.ts siguiendo el patron de las otras.
 *  2. Agrega el enlace en src/app/layout/shell.component.ts.
 *  3. npm start  ->  http://localhost:4200
 */
@Component({
  selector: 'cs-patient-summary',
  standalone: true,
  imports: [DatePipe],
  template: `
    <h1>Resumen del paciente</h1>
    <!-- TODO: selector de paciente -->
    <!-- TODO: tarjeta con los datos del paciente -->
    <!-- TODO: ultimo registro con su nivel de riesgo -->
    <!-- TODO: tabla o lista con los ultimos 5 registros -->
  `,
  styles: [`
    h1 { color: var(--cs-navy); font-size: 1.4rem; margin: 0 0 1rem; }
  `],
})
export class PatientSummaryComponent {
  private readonly patients = inject(PatientsStore);
  private readonly vitalSigns = inject(VitalSignsStore);

  readonly selectedId = signal(this.patients.patients()[0]?.id.value ?? '');

  readonly patient = computed(() => this.patients.byId(this.selectedId()));

  /** Los 5 registros mas recientes de este paciente. */
  readonly recentRecords = computed(() =>
    this.vitalSigns.records()
      .filter(r => r.patientId.value === this.selectedId())
      .slice(0, 5),
  );

  // TODO: un computed que devuelva solo el ultimo registro (recentRecords()[0])
}
