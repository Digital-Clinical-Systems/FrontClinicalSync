import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { CurrentUser } from '../iam/domain/model/current-user';
import { AlertsStore } from '../alerts/application/alerts.store';
import { HandoverStore } from '../handover/application/handover.store';

@Component({
  selector: 'cs-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <a class="skip-link" href="#contenido">Saltar al contenido principal</a>
    <header class="topbar">
      <span class="brand">ClinicalSync</span>
      <span class="user">{{ user.displayName() }} &middot; {{ user.role() }}</span>
    </header>
    <div class="shell">
      <nav class="sidebar" aria-label="Navegacion principal">
        <a routerLink="/pacientes" routerLinkActive="active">Mis pacientes</a>
        <a routerLink="/signos-vitales" routerLinkActive="active">Signos vitales</a>
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
}
