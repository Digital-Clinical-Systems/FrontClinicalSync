import { Injectable, inject } from '@angular/core';
import { CurrentUser } from '../domain/model/current-user';
import { Role } from '../domain/model/role.enum';

/**
 * Respuesta de una comprobacion de permiso. Lleva siempre el motivo, porque una
 * accion bloqueada sin explicacion obliga al usuario a adivinar: en un turno
 * clinico eso se traduce en una llamada al soporte o, peor, en registrar el dato
 * por otra via.
 */
export interface Permiso {
  readonly permitido: boolean;
  /** Vacio cuando esta permitido; en caso contrario, la razon en una frase. */
  readonly motivo: string;
}

const SI: Permiso = { permitido: true, motivo: '' };
const no = (motivo: string): Permiso => ({ permitido: false, motivo });

/**
 * Punto unico desde el que la interfaz consulta que puede hacer el usuario en
 * curso.
 *
 * Dos aclaraciones que conviene tener presentes al leer esto:
 *
 *  - **Esta clase no autoriza nada.** La autoridad sigue estando en los
 *    agregados: `MedicalOrder.issue` rechaza a quien no es medico aunque esta
 *    clase dijera lo contrario. Lo que hace aqui es *anticipar* la respuesta del
 *    dominio para que la interfaz pueda explicarla antes de que el usuario
 *    choque con un error. Duplicar la regla en la vista y no en el dominio seria
 *    el error clasico; duplicarla en ambos lados, con el dominio como ultima
 *    palabra, es defensa en profundidad.
 *
 *  - **Recibe identificadores, no agregados.** Si aceptara una `MedicalOrder`,
 *    la capa de aplicacion de IAM dependeria de otro Bounded Context y violaria
 *    la regla 1 de la seccion 4.6.6. Por eso los parametros son cadenas.
 */
@Injectable({ providedIn: 'root' })
export class Permissions {
  private readonly user = inject(CurrentUser);

  get esMedico(): boolean { return this.user.role() === Role.Physician; }
  get esEnfermeria(): boolean { return this.user.role() === Role.Nurse; }
  get idActual(): string { return this.user.id().value; }

  /** US-22. */
  emitirIndicacion(): Permiso {
    return this.esMedico ? SI
      : no('Solo un medico especialista puede emitir una indicacion medica. Cambia el rol en la barra superior para usar este formulario.');
  }

  /** US-24. */
  registrarCumplimiento(prescribedBy: string, yaCumplida: boolean, vigente: boolean): Permiso {
    if (!vigente) return no('Esta indicacion fue reemplazada: solo una indicacion vigente admite registro de cumplimiento.');
    if (yaCumplida) return no('El cumplimiento de esta indicacion ya quedo registrado y no admite un segundo registro.');
    if (!this.esEnfermeria) return no('El cumplimiento lo registra el personal de enfermeria, que es quien administra la indicacion.');
    if (prescribedBy === this.idActual) {
      return no('No puedes registrar el cumplimiento de una indicacion que tu mismo prescribiste: el registro acredita que la orden llego a quien debia ejecutarla.');
    }
    return SI;
  }

  /** US-13. */
  emitirTraspaso(): Permiso {
    return this.esEnfermeria ? SI
      : no('El traspaso SBAR es la entrega del turno de enfermeria. Cambia el rol a Enfermeria para emitirlo.');
  }

  /** US-15. */
  acusarTraspaso(incomingNurseId: string, yaAcusado: boolean): Permiso {
    if (yaAcusado) return no('Este traspaso ya fue acusado y no admite un segundo acuse.');
    if (incomingNurseId !== this.idActual) {
      return no('Solo el enfermero entrante al que va dirigido el traspaso puede acusar su recibo.');
    }
    return SI;
  }

  /**
   * Lectura y registro clinico corriente. No se restringen por rol de forma
   * deliberada: en una unidad de cuidados intensivos el medico y el personal de
   * enfermeria consultan la misma informacion, y limitar la lectura por rol
   * empeoraria el producto sin mejorar la seguridad. Lo que se diferencia es
   * quien puede escribir que, y eso son las cuatro reglas de arriba.
   */
  readonly capacidades: Record<Role, readonly string[]> = {
    [Role.Nurse]: [
      'Registrar signos vitales junto a la cama',
      'Anotar medicamentos administrados y eventos clinicos',
      'Emitir el traspaso SBAR al cierre del turno',
      'Acusar recibo de los traspasos dirigidos a ti',
      'Registrar el cumplimiento de las indicaciones que administras',
      'Consultar pacientes, alertas, resumen y bitacora',
    ],
    [Role.Physician]: [
      'Emitir y reemplazar indicaciones medicas',
      'Consultar el resumen clinico y la evolucion del paciente',
      'Revisar que indicaciones siguen sin cumplimiento',
      'Registrar signos vitales y anotaciones clinicas',
      'Consultar pacientes, alertas y bitacora',
    ],
    [Role.Coordinator]: [
      'Consultar la bitacora completa del servicio',
      'Revisar la documentacion pendiente del turno',
    ],
    [Role.Auditor]: [
      'Consultar la bitacora y el historial de cambios',
    ],
  };

  capacidadesActuales(): readonly string[] { return this.capacidades[this.user.role()] ?? []; }

  /** Lo que el otro rol puede hacer y el actual no, para explicar el selector. */
  readonly etiquetaRol: Record<string, string> = {
    [Role.Nurse]: 'Enfermeria',
    [Role.Physician]: 'Medico especialista',
    [Role.Coordinator]: 'Coordinacion',
    [Role.Auditor]: 'Auditoria',
  };
}
