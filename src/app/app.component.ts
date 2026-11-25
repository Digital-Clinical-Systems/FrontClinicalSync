import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

/**
 * Raiz de la aplicacion. Solo enruta: el armazon con la navegacion es una ruta
 * de disposicion protegida por la guarda de sesion, de modo que la pantalla de
 * ingreso no se renderice dentro de el.
 */
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: '<router-outlet />',
})
export class AppComponent {}
