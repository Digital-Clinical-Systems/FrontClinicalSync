import { Component, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { AlertsStore } from '../../application/alerts.store';
import { PatientsStore } from '../../../patients/application/patients.store';
import { CurrentUser } from '../../../iam/domain/model/current-user';
import { Alert } from '../../domain/model/alert.entity';
import { AlertStatus } from '../../domain/model/alert-status.enum';

@Component({
  selector: 'cs-alert-list',
  standalone: true,
  imports: [DatePipe],
  template: `
    <h1>Alertas clinicas</h1>
    <p class="hint">
      Generadas automaticamente por la politica de dominio: un signo vital fuera de umbral
      produce una alerta. BC-04 reacciona al evento de BC-03 sin conocer sus clases.
    </p>

    @if (store.alerts().length === 0) {
      <p class="empty">No hay alertas. Registre signos vitales fuera de rango para verlas aparecer.</p>
    } @else {
      <ul class="list">
        @for (a of store.alerts(); track a.id) {
          <li class="item" [class.item--critical]="a.severity === 'CRITICAL'">
            <div>
              <strong>{{ patients.byId(a.patientId.value)?.fullName ?? a.patientId.value }}</strong>
              <span class="sev">{{ a.severity }}</span>
              <p class="reason">{{ a.reason }}</p>
              <p class="meta">{{ a.raisedAt | date:'HH:mm:ss' }} &middot; origen: {{ a.triggerSource }}</p>
            </div>
            <div class="actions">
              <span class="status">{{ a.status }}</span>
              @if (a.status === Open) {
                <button type="button" (click)="acknowledge(a)">Atender</button>
              }
              @if (a.status === Acknowledged) {
                <button type="button" (click)="resolve(a)">Resolver</button>
              }
            </div>
          </li>
        }
      </ul>
    }
  `,
  styleUrl: './alert-list.component.css',
})
export class AlertListComponent {
  readonly store = inject(AlertsStore);
  readonly patients = inject(PatientsStore);
  private readonly user = inject(CurrentUser);
  protected readonly Open = AlertStatus.Open;
  protected readonly Acknowledged = AlertStatus.Acknowledged;

  acknowledge(a: Alert): void { this.store.acknowledge(a, this.user.id()); }
  resolve(a: Alert): void { this.store.resolve(a, this.user.id()); }
}
