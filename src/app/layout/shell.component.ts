import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { CurrentUser, DEMO_ROLES, DemoRole } from '../iam/domain/model/current-user';
import { AlertsStore } from '../alerts/application/alerts.store';
import { HandoverStore } from '../handover/application/handover.store';
import { MedicalOrdersStore } from '../medical-orders/application/medical-orders.store';

@Component({
  selector: 'cs-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <a class="skip-link" href="#contenido">Saltar al contenido principal</a>
    <header class="topbar">
      <span class="brand">ClinicalSync</span>
      <span class="user">
        {{ user.displayName() }} &middot; {{ user.role() }}
        <label class="role-switch">
          <span class="sr-only">Rol de demostracion</span>
          <select [value]="user.role()" (change)="switchRole($any($event.target).value)">
            @for (r of roles; track r) {
              <option [value]="r">{{ r === 'PHYSICIAN' ? 'Medico' : 'Enfermero' }}</option>
            }
          </select>
        </label>
      </span>
    </header>
    <div class="shell">
      <nav class="sidebar" aria-label="Navegacion principal">
        <a routerLink="/pacientes" routerLinkActive="active">Mis pacientes</a>
        <a routerLink="/prioridad" routerLinkActive="active">Por prioridad</a>
        <a routerLink="/signos-vitales" routerLinkActive="active">Signos vitales</a>
        <a routerLink="/indicaciones" routerLinkActive="active">
          Indicaciones
          @if (orders.activeCount() > 0) { <span class="badge">{{ orders.activeCount() }}</span> }
        </a>
        <a routerLink="/traspasos" routerLinkActive="active">
          Traspasos SBAR
          @if (handovers.pendingCount() > 0) { <span class="badge">{{ handovers.pendingCount() }}</span> }
        </a>
        <a routerLink="/alertas" routerLinkActive="active">
          Alertas
          @if (alerts.openCount() > 0) { <span class="badge badge--alert">{{ alerts.openCount() }}</span> }
        </a>
        <a routerLink="/auditoria" routerLinkActive="active">Auditoria</a>
      </nav>
      <main id="contenido" class="content"><router-outlet /></main>
    </div>
  `,
  styleUrl: './shell.component.css',
})
export class ShellComponent {
  readonly user = inject(CurrentUser);
  readonly alerts = inject(AlertsStore);
  readonly handovers = inject(HandoverStore);
  readonly orders = inject(MedicalOrdersStore);
  readonly roles = DEMO_ROLES;

  switchRole(role: DemoRole): void { this.user.switchTo(role); }
}
