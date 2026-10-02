import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { HandoverStore } from '../../application/handover.store';
import { PatientsStore } from '../../../patients/application/patients.store';
import { CurrentUser } from '../../../iam/domain/model/current-user';
import { SbarContent } from '../../domain/model/sbar-content.vo';
import { PatientId, UserId } from '../../../shared/domain/model/identifier';
import { Handover } from '../../domain/model/handover.entity';

@Component({
  selector: 'cs-handover-form',
  standalone: true,
  imports: [FormsModule, DatePipe],
  template: `
    <h1>Traspaso de turno (SBAR)</h1>
    <p class="hint">US-13 &middot; Las cuatro secciones son obligatorias y el enfermero entrante
      debe ser distinto del saliente. Ambas reglas viven en el dominio, no en este formulario.</p>

    <form class="card" (ngSubmit)="submit()" novalidate>
      <label for="patient">Paciente</label>
      <select id="patient" name="patient" [(ngModel)]="patientId" required>
        @for (p of patients.patients(); track p.id.value) {
          <option [value]="p.id.value">{{ p.fullName }} &mdash; {{ p.location.toString() }}</option>
        }
      </select>

      <label for="incoming">Enfermero entrante (ID)</label>
      <input id="incoming" name="incoming" [(ngModel)]="incomingNurse" required />

      <label for="s">Situation &mdash; situacion actual</label>
      <textarea id="s" name="s" rows="2" [(ngModel)]="situation"></textarea>
      <label for="b">Background &mdash; antecedentes</label>
      <textarea id="b" name="b" rows="2" [(ngModel)]="background"></textarea>
      <label for="a">Assessment &mdash; valoracion</label>
      <textarea id="a" name="a" rows="2" [(ngModel)]="assessment"></textarea>
      <label for="r">Recommendation &mdash; recomendacion</label>
      <textarea id="r" name="r" rows="2" [(ngModel)]="recommendation"></textarea>

      @if (error()) { <p class="error" role="alert">{{ error() }}</p> }
      @if (ok()) { <p class="ok" role="status">{{ ok() }}</p> }
      <button type="submit">Emitir traspaso</button>
    </form>

    <h2>Traspasos del turno</h2>
    @if (store.handovers().length === 0) {
      <p class="empty">Sin traspasos emitidos.</p>
    } @else {
      <ul class="list">
        @for (h of store.handovers(); track h.id) {
          <li class="item">
            <div>
              <strong>{{ patients.byId(h.patientId.value)?.fullName ?? h.patientId.value }}</strong>
              <p class="meta">{{ h.issuedAt | date:'HH:mm' }} &middot; de {{ h.outgoingNurseId.value }}
                a {{ h.incomingNurseId.value }} &middot; {{ h.status }}</p>
            </div>
            @if (h.isPending) {
              <button type="button" (click)="acknowledge(h)">Acusar recibo como {{ h.incomingNurseId.value }}</button>
            }
          </li>
        }
      </ul>
    }
  `,
  styleUrl: './handover-form.component.css',
})
export class HandoverFormComponent {
  readonly store = inject(HandoverStore);
  readonly patients = inject(PatientsStore);
  private readonly user = inject(CurrentUser);

  patientId = this.patients.patients()[0]?.id.value ?? '';
  incomingNurse = 'enf-002';
  situation = ''; background = ''; assessment = ''; recommendation = '';
  readonly error = signal(''); readonly ok = signal('');

  submit(): void {
    this.error.set(''); this.ok.set('');
    try {
      this.store.issue(
        PatientId.of(this.patientId), this.user.id(), UserId.of(this.incomingNurse),
        SbarContent.of(this.situation, this.background, this.assessment, this.recommendation),
      );
      this.ok.set('Traspaso emitido. Queda pendiente de acuse por el enfermero entrante.');
      this.situation = this.background = this.assessment = this.recommendation = '';
    } catch (e) { this.error.set((e as Error).message); }
  }

  acknowledge(h: Handover): void {
    this.error.set(''); this.ok.set('');
    try { this.store.acknowledge(h, h.incomingNurseId); this.ok.set('Acuse registrado.'); }
    catch (e) { this.error.set((e as Error).message); }
  }
}
