import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PatientsStore } from '../../application/patients.store';

@Component({
  selector: 'cs-patient-list',
  standalone: true,
  imports: [RouterLink],
  template: `
    <h1>Mis pacientes</h1>
    <p class="hint">Pacientes asignados al turno. Datos de demostracion: BC-02 Patients actua
      como directorio maestro y ningun otro contexto crea pacientes.</p>
    <ul class="list">
      @for (p of store.patients(); track p.id.value) {
        <li class="item">
          <div>
            <strong>{{ p.fullName }}</strong>
            <p class="meta">{{ p.medicalRecordNumber }} &middot; {{ p.location.toString() }}</p>
          </div>
          <span class="dx">{{ p.admissionDiagnosis }}</span>
          <a class="summary-link" [routerLink]="['/resumen-paciente']" [queryParams]="{ paciente: p.id.value }">Ver resumen</a>
        </li>
      }
    </ul>
  `,
  styles: [`
    h1 { color:var(--cs-navy); font-size:1.4rem; margin:0 0 .25rem; }
    .hint { color:var(--cs-slate); font-size:.85rem; margin:0 0 1.25rem; max-width:60ch; }
    .list { list-style:none; margin:0; padding:0; display:grid; gap:.6rem; max-width:720px; }
    .item { display:flex; justify-content:space-between; gap:1rem; align-items:center;
      background:#fff; border:1px solid var(--cs-border); border-radius:12px; padding:.9rem 1rem; }
    .meta { margin:.2rem 0 0; font-size:.8rem; color:var(--cs-slate); }
    .dx { font-size:.8rem; color:var(--cs-navy); text-align:right; max-width:22ch; }
    .summary-link { font-size:.8rem; color:var(--cs-emerald-dark); text-decoration:none; font-weight:600; white-space:nowrap; }
    .summary-link:hover { text-decoration:underline; }
    .summary-link:focus-visible { outline:3px solid var(--cs-emerald-dark); outline-offset:2px; }
  `],
})
export class PatientListComponent { readonly store = inject(PatientsStore); }
