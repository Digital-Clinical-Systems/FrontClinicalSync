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
import { IconComponent, IconName } from '../shared/presentation/icon.component';

interface Entrada {
  readonly ruta: string;
  readonly texto: string;
  readonly icono: IconName;
  readonly contador?: () => number;
  readonly tono?: 'warn' | 'alert';
}
interface Grupo { readonly titulo: string; readonly entradas: readonly Entrada[]; }

const CLAVE_BARRA = 'clinicalsync.barra-colapsada';

@Component({
  selector: 'cs-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, IconComponent],
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
          Todos los perfiles consultan la misma informacion clinica: en una unidad de cuidados
          intensivos el medico y el personal de enfermeria miran los mismos datos del paciente.
          Lo que cambia es quien puede registrar que. Donde una accion no te corresponda, el boton
          aparece desactivado y explica el motivo.
        </p>
      </section>
    }

    <div class="shell" [class.shell--compacta]="colapsada()">
      <nav class="sidebar" aria-label="Navegacion principal">
        <button type="button" class="sidebar__toggle" (click)="alternarBarra()"
                [attr.aria-pressed]="colapsada()"
                [attr.aria-label]="colapsada() ? 'Expandir el menu lateral' : 'Contraer el menu lateral'"
                [title]="colapsada() ? 'Expandir el menu' : 'Contraer el menu'">
          <cs-icon [name]="colapsada() ? 'expandir' : 'colapsar'" />
          <span class="sidebar__toggle-texto">Contraer menu</span>
        </button>

        @for (g of grupos(); track g.titulo) {
          <p class="sidebar__group" [id]="'g-' + g.titulo">{{ g.titulo }}</p>
          <ul [attr.aria-labelledby]="'g-' + g.titulo">
            @for (e of g.entradas; track e.ruta) {
              <li><a [routerLink]="e.ruta" routerLinkActive="active" [title]="e.texto">
                <cs-icon [name]="e.icono" />
                <span class="sidebar__texto">{{ e.texto }}</span>
                @if (e.contador && e.contador()! > 0) {
                  <span class="badge" [class.badge--warn]="e.tono === 'warn'"
                        [class.badge--alert]="e.tono === 'alert'">{{ e.contador!() }}</span>
                }
              </a></li>
            }
          </ul>
        }
        <p class="sidebar__note">
          Version de demostracion con datos ficticios. El selector de perfil reemplaza al
          inicio de sesion.
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
  readonly colapsada = signal(leerPreferencia());

  private readonly turno: Grupo = {
    titulo: 'Turno',
    entradas: [
      { ruta: '/pacientes', texto: 'Pacientes', icono: 'pacientes' },
      { ruta: '/prioridad', texto: 'Por prioridad', icono: 'prioridad' },
      { ruta: '/pendientes', texto: 'Documentacion pendiente', icono: 'pendientes',
        contador: () => this.board.pendingCount(), tono: 'warn' },
    ],
  };
  private readonly registro: Grupo = {
    titulo: 'Registro clinico',
    entradas: [
      { ruta: '/signos-vitales', texto: 'Signos vitales', icono: 'signos' },
      { ruta: '/registros', texto: 'Medicamentos y eventos', icono: 'registros' },
      { ruta: '/indicaciones', texto: 'Indicaciones', icono: 'indicaciones',
        contador: () => this.orders.pendingCount(), tono: 'warn' },
      { ruta: '/traspasos', texto: 'Traspasos SBAR', icono: 'traspasos',
        contador: () => this.handovers.pendingCount(), tono: 'warn' },
    ],
  };
  private readonly seguimiento: Grupo = {
    titulo: 'Seguimiento',
    entradas: [
      { ruta: '/resumen-paciente', texto: 'Resumen del paciente', icono: 'resumen' },
      { ruta: '/alertas', texto: 'Alertas', icono: 'alertas',
        contador: () => this.alerts.openCount(), tono: 'alert' },
      { ruta: '/auditoria', texto: 'Bitacora', icono: 'bitacora' },
    ],
  };

  /**
   * El menu no oculta nada segun el perfil: reordena. El personal de enfermeria
   * trabaja registrando junto a la cama, de modo que el registro clinico queda
   * arriba; el medico especialista entra a consultar y decidir, asi que el
   * seguimiento va primero. Ocultar secciones obligaria a cambiar de perfil para
   * mirar un dato que ambos tienen derecho a ver.
   */
  readonly grupos = computed<Grupo[]>(() =>
    this.user.role() === Role.Physician
      ? [this.turno, this.seguimiento, this.registro]
      : [this.turno, this.registro, this.seguimiento]);

  switchRole(role: DemoRole): void { this.user.switchTo(role); }

  alternarBarra(): void {
    const valor = !this.colapsada();
    this.colapsada.set(valor);
    try { localStorage.setItem(CLAVE_BARRA, valor ? '1' : '0'); } catch { /* sin almacenamiento */ }
  }
}

/**
 * La preferencia de la barra se guarda en el navegador de quien la cambia. Si el
 * almacenamiento no esta disponible —ventana privada, permisos restringidos— se
 * arranca expandida en lugar de fallar.
 */
function leerPreferencia(): boolean {
  try { return localStorage.getItem(CLAVE_BARRA) === '1'; } catch { return false; }
}
