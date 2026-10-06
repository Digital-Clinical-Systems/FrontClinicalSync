import { inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

/**
 * Lee el paciente indicado en la URL (`?paciente=pac-001`).
 *
 * Existe para que una pantalla a la que se llega desde otra —desde la lista de
 * documentacion pendiente, por ejemplo— abra ya con el paciente correcto. Volver
 * a elegirlo en cada formulario es la clase de friccion que termina en registros
 * atribuidos al paciente equivocado.
 */
export function pacienteDeLaRuta(): string {
  return inject(ActivatedRoute).snapshot.queryParamMap.get('paciente') ?? '';
}
