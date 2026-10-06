import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { CurrentUser, DEMO_ROLES, DemoRole } from '../iam/domain/model/current-user';
import { AlertsStore } from '../alerts/application/alerts.store';
import { HandoverStore } from '../handover/application/handover.store';
import { MedicalOrdersStore } from '../medical-orders/application/medical-orders.store';
import { DirectoryStore } from '../iam/application/directory.store';
import { ShiftBoardFacade } from '../patients/presentation/shift-board.facade';

@Component({
  selector: 'cs-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <a class="skip-link" href="#contenido">Saltar al contenido principal</a>

    <header class="topbar">
      <span class="brand">
        <span class="brand__mark" aria-hidden="true"></span>ClinicalSync
      </span>
      <span class="topbar__unit">UCI Cardiovascular &middot; turno en curso</span>
      <div class="identity">
        <span class="identity__name">{{ directory.nameOf(user.id().value) }}</span>
        <label class="identity__switch">
          <span class="sr-only">Rol con el que se recorre la demostracion</span>
          <select [value]="user.role()" (change)="switchRole($any($event.target).value)">
            @for (r of roles; track r) {
              <option [value]="r">{{ r === 'PHYSICIAN' ? 'Medico especialista' : 'Enfermeria' }}</option>
            }
          </select>
        </label>
      </div>
    </header>

    <div class="shell">
      <nav class="sidebar" aria-label="Navegacion principal">
        <p class="sidebar__group" id="g-turno">Turno</p>
        <ul aria-labelledby="g-turno">
          <li><a routerLink="/pacientes" routerLinkActive="active">Pacientes</a></li>
          <li><a routerLink="/prioridad" routerLinkActive="active">Por prioridad</a></li>
          <li><a routerLink="/pendientes" routerLinkActive="active">
            Documentacion pendiente
            @if (board.pendingCount() > 0) { <span class="badge badge--warn">{{ board.pendingCount() }}</span> }
          </a></li>
        </ul>

        <p class="sidebar__group" id="g-registro">Registro clinico</p>
        <ul aria-labelledby="g-registro">
          <li><a routerLink="/signos-vitales" routerLinkActive="active">Signos vitales</a></li>
          <li><a routerLink="/registros" routerLinkActive="active">Medicamentos y eventos</a></li>
          <li><a routerLink="/indicaciones" routerLinkActive="active">
            Indicaciones
            @if (orders.pendingCount() > 0) { <span class="badge badge--warn">{{ orders.pendingCount() }}</span> }
          </a></li>
          <li><a routerLink="/traspasos" routerLinkActive="active">
            Traspasos SBAR
            @if (handovers.pendingCount() > 0) { <span class="badge badge--warn">{{ handovers.pendingCount() }}</span> }
          </a></li>
        </ul>

        <p class="sidebar__group" id="g-seguimiento">Seguimiento</p>
        <ul aria-labelledby="g-seguimiento">
          <li><a routerLink="/resumen-paciente" routerLinkActive="active">Resumen del paciente</a></li>
          <li><a routerLink="/alertas" routerLinkActive="active">
            Alertas
            @if (alerts.openCount() > 0) { <span class="badge badge--alert">{{ alerts.openCount() }}</span> }
          </a></li>
          <li><a routerLink="/auditoria" routerLinkActive="active">Bitacora</a></li>
        </ul>

        <p class="sidebar__note">
          Datos de demostracion. El selector de rol sustituye al inicio de sesion mientras
          no exista el servicio de autenticacion.
        </p>
      </nav>

      <main id="contenido" class="content"><router-outlet /></main>
    </div>
  `,
  styleUrl: './shell.component.css',
})
export class ShellComponent {
  readonly user = inject(CurrentUser);
  readonly directory = inject(DirectoryStore);
  readonly alerts = inject(AlertsStore);
  readonly handovers = inject(HandoverStore);
  readonly orders = inject(MedicalOrdersStore);
  readonly board = inject(ShiftBoardFacade);
  readonly roles = DEMO_ROLES;

  switchRole(role: DemoRole): void { this.user.switchTo(role); }
}
