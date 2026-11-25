import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SessionStore } from '../../application/session.store';
import { FalloDeAutenticacion } from '../../domain/services/auth.repository';

/**
 * Inicio de sesion contra el RESTful API de ClinicalSync.
 *
 * Es la unica pantalla accesible sin sesion. Al autenticarse devuelve al
 * profesional al destino que pedia, de modo que un enlace a una pantalla
 * concreta sigue funcionando despues de pasar por aqui.
 */
@Component({
  selector: 'cs-login',
  standalone: true,
  imports: [FormsModule],
  styleUrl: './login.component.css',
  template: `
    <main class="ingreso">

      <section class="ingreso__marca" aria-hidden="true">
        <p class="marca__nombre">ClinicalSync</p>
        <p class="marca__claim">El estado del paciente y el traspaso del turno, en un solo lugar.</p>
        <ul class="marca__puntos">
          <li>Signos vitales con el riesgo clinico derivado de cada toma.</li>
          <li>Traspaso SBAR con acuse de recibo del turno entrante.</li>
          <li>Bitacora que registra quien hizo cada cosa y cuando.</li>
        </ul>
        <p class="marca__pie">Unidades de cuidado cardiovascular</p>
      </section>

      <section class="ingreso__acceso">
        <form class="acceso__card" (ngSubmit)="ingresar()" novalidate>
          <p class="acceso__marca-movil">ClinicalSync</p>
          <h1>Iniciar sesion</h1>
          <p class="acceso__intro">Ingrese con el usuario que le asigno la unidad.</p>

          @if (error()) {
            <p class="notice notice--error" role="alert">{{ error() }}</p>
          }

          <div class="field">
            <label for="usuario">Usuario</label>
            <input id="usuario" name="usuario" type="text" autocomplete="username"
                   placeholder="enf-001" autocapitalize="off" spellcheck="false"
                   [(ngModel)]="usuario" [disabled]="enviando()" autofocus required />
          </div>

          <div class="field">
            <label for="clave">Contrasena</label>
            <div class="clave">
              <input id="clave" name="clave" [type]="claveVisible() ? 'text' : 'password'"
                     autocomplete="current-password" [(ngModel)]="clave"
                     [disabled]="enviando()" required />
              <button type="button" class="clave__ojo" (click)="alternarClave()"
                      [attr.aria-label]="claveVisible() ? 'Ocultar contrasena' : 'Mostrar contrasena'"
                      [attr.aria-pressed]="claveVisible()" [disabled]="enviando()">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"
                     stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
                  @if (claveVisible()) {
                    <path d="M3 3l18 18" />
                    <path d="M10.6 5.2A9.4 9.4 0 0 1 12 5c5 0 9 4.5 9 7 0 .8-.6 2-1.7 3.2" />
                    <path d="M6.3 7.5C4 9 3 11.2 3 12c0 2.5 4 7 9 7 1.5 0 2.8-.4 4-1" />
                    <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
                  } @else {
                    <path d="M3 12c0-2.5 4-7 9-7s9 4.5 9 7c0 2.5-4 7-9 7s-9-4.5-9-7z" />
                    <circle cx="12" cy="12" r="3" />
                  }
                </svg>
              </button>
            </div>
          </div>

          <button type="submit" class="btn btn--primary acceso__enviar" [disabled]="enviando()">
            {{ enviando() ? 'Ingresando...' : 'Ingresar' }}
          </button>

          <details class="acceso__demo">
            <summary>Cuentas de demostracion</summary>
            <p class="acceso__demo-nota">
              Todas comparten la contrasena <code>ClinicalSync2026</code>.
            </p>
            <table class="acceso__demo-tabla">
              <caption class="sr-only">Usuarios de demostracion y su rol</caption>
              <tbody>
                @for (cuenta of cuentasDemo; track cuenta.usuario) {
                  <tr>
                    <th scope="row"><code>{{ cuenta.usuario }}</code></th>
                    <td>{{ cuenta.rol }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </details>
        </form>
      </section>

    </main>
  `,
})
export class LoginComponent {
  private readonly sesion = inject(SessionStore);
  private readonly router = inject(Router);

  usuario = '';
  clave = '';

  readonly enviando = signal(false);
  readonly error = signal('');
  readonly claveVisible = signal(false);

  /**
   * Cuentas sembradas por el backend. Se muestran a proposito: este despliegue
   * es de demostracion academica y no contiene datos de personas reales, de modo
   * que quien evalua pueda entrar sin pedir credenciales por otro canal.
   */
  readonly cuentasDemo = [
    { usuario: 'enf-001', rol: 'Enfermeria, turno dia' },
    { usuario: 'enf-002', rol: 'Enfermeria, turno noche' },
    { usuario: 'med-001', rol: 'Medico especialista' },
    { usuario: 'coord-001', rol: 'Coordinacion clinica' },
    { usuario: 'aud-001', rol: 'Auditoria' },
  ] as const;

  /** Destino solicitado antes de ser redirigido aqui. */
  private readonly destino = new URLSearchParams(location.search).get('destino');

  alternarClave(): void {
    this.claveVisible.update(visible => !visible);
  }

  async ingresar(): Promise<void> {
    if (this.enviando()) return;
    this.error.set('');

    if (!this.usuario.trim() || !this.clave) {
      this.error.set('Complete el usuario y la contrasena.');
      return;
    }

    this.enviando.set(true);
    try {
      await this.sesion.signIn(this.usuario, this.clave);
      // La contrasena no permanece en memoria mas de lo necesario.
      this.clave = '';
      await this.router.navigateByUrl(this.destino ?? '/pacientes');
    } catch (fallo) {
      this.error.set(fallo instanceof FalloDeAutenticacion
        ? fallo.message
        : 'No se pudo iniciar sesion. Intente de nuevo.');
    } finally {
      this.enviando.set(false);
    }
  }
}
