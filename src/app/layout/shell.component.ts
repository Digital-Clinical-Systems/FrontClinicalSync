import { Component, inject, computed, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { CurrentUser, DEMO_ROLES, DemoRole } from '../iam/domain/model/current-user';
import { Role } from '../iam/domain/model/role.enum';
import { DirectoryStore } from '../iam/application/directory.store';
import { Permissions } from '../iam/application/permissions';
import { AlertsStore } from '../alerts/application/alerts.store';
import { HandoverStore } from '../handover/application/handover.store';
import { MedicalOrdersStore } from '../medical-orders/application/medical-orders.store';
import { ShiftBoardFacade } from '../patients/presentation/shift-board.facade';

interface Entrada {
  readonly ruta: string;
  readonly texto: string;
  readonly contador?: () => number;
  readonly tono?: 'warn' | 'alert';
}
interface Grupo { readonly titulo: string; readonly entradas: readonly Entrada[]; }

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
              <option [value]="r" [selected]="r === user.role()">{{ permisos.etiquetaRol[r] }}</option>
            }
          </select>
        </label>
        <button type="button" class="identity__help" (click)="verCapacidades.set(!verCapacidades())"
                [attr.aria-expanded]="verCapacidades()" aria-controls="panel-capacidades">
          Que puedo hacer
        </button>
      </div>
    </header>

    @if (verCapacidades()) {
      <section id="panel-capacidades" class="capacidades" aria-label="Acciones permitidas al rol en curso">
        <p class="capacidades__titulo">Como {{ permisos.etiquetaRol[user.role()] }} puedes:</p>
        <ul>
          @for (c of permisos.capacidadesActuales(); track c) { <li>{{ c }}</li> }
        </ul>
        <p class="capacidades__nota">
          Todos los roles consultan la misma informacion clinica: en una unidad de cuidados
          intensivos el medico y el personal de enfermeria miran los mismos datos. Lo que cambia
          es quien puede escribir que, y esa regla la imponen los agregados del dominio, no esta
          interfaz. Donde una accion no te corresponda, el boton aparece desactivado con el motivo.
        </p>
      </section>
    }

    <div class="shell">
      <nav class="sidebar" aria-label="Navegacion principal">
        @for (g of grupos(); track g.titulo) {
          <p class="sidebar__group" [id]="'g-' + g.titulo">{{ g.titulo }}</p>
          <ul [attr.aria-labelledby]="'g-' + g.titulo">
            @for (e of g.entradas; track e.ruta) {
              <li><a [routerLink]="e.ruta" routerLinkActive="active">
                {{ e.texto }}
                @if (e.contador && e.contador()! > 0) {
                  <span class="badge" [class.badge--warn]="e.tono === 'warn'"
                        [class.badge--alert]="e.tono === 'alert'">{{ e.contador!() }}</span>
                }
              </a></li>
            }
          </ul>
        }
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
  readonly permisos = inject(Permissions);
  readonly alerts = inject(AlertsStore);
  readonly handovers = inject(HandoverStore);
  readonly orders = inject(MedicalOrdersStore);
  readonly board = inject(ShiftBoardFacade);
  readonly roles = DEMO_ROLES;
  readonly verCapacidades = signal(false);

  private readonly turno: Grupo = {
    titulo: 'Turno',
    entradas: [
      { ruta: '/pacientes', texto: 'Pacientes' },
      { ruta: '/prioridad', texto: 'Por prioridad' },
      { ruta: '/pendientes', texto: 'Documentacion pendiente',
        contador: () => this.board.pendingCount(), tono: 'warn' },
    ],
  };
  private readonly registro: Grupo = {
    titulo: 'Registro clinico',
    entradas: [
      { ruta: '/signos-vitales', texto: 'Signos vitales' },
      { ruta: '/registros', texto: 'Medicamentos y eventos' },
      { ruta: '/indicaciones', texto: 'Indicaciones',
        contador: () => this.orders.pendingCount(), tono: 'warn' },
      { ruta: '/traspasos', texto: 'Traspasos SBAR',
        contador: () => this.handovers.pendingCount(), tono: 'warn' },
    ],
  };
  private readonly seguimiento: Grupo = {
    titulo: 'Seguimiento',
    entradas: [
      { ruta: '/resumen-paciente', texto: 'Resumen del paciente' },
      { ruta: '/alertas', texto: 'Alertas',
        contador: () => this.alerts.openCount(), tono: 'alert' },
      { ruta: '/auditoria', texto: 'Bitacora' },
    ],
  };

  /**
   * El menu no oculta nada segun el rol: reordena. El personal de enfermeria
   * trabaja registrando junto a la cama, de modo que el registro clinico queda
   * arriba; el medico especialista entra a consultar y decidir, asi que el
   * seguimiento va primero. Ocultar secciones obligaria a cambiar de rol para
   * mirar un dato que ambos tienen derecho a ver.
   */
  readonly grupos = computed<Grupo[]>(() =>
    this.user.role() === Role.Physician
      ? [this.turno, this.seguimiento, this.registro]
      : [this.turno, this.registro, this.seguimiento]);

  switchRole(role: DemoRole): void { this.user.switchTo(role); }
}
