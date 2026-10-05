# Criterios de aceptación — Sprint 2

Criterios Given/When/Then de las historias del Sprint 2, en el mismo formato que
los del Sprint 1 documentados en la sección 3.1 del informe.

**Convención.** El *Entonces* describe únicamente resultados observables en la
interfaz. Las reglas que el dominio hace cumplir se expresan como el efecto que
el usuario percibe, no como la excepción interna que las implementa.

**Estado de implementación.** Se indica por historia, porque no todas forman
parte del incremento de este sprint.

---

## EP-04 · Indicaciones médicas y cumplimiento

### US-22 — Emitir una indicación médica
*Como médico especialista, quiero registrar una indicación para que el personal
de enfermería la ejecute con la información necesaria.*

**Estado:** implementada en el Sprint 2.

```gherkin
Escenario: El médico emite una indicación completa
  Dado que el médico especialista tiene un paciente admitido en la unidad
  Y ha seleccionado el rol de médico en la aplicación
  Cuando registra una indicación con medicamento, dosis y vía de administración
  Entonces el sistema muestra la indicación en la lista de indicaciones vigentes
  Y queda registrada con el médico que la emitió y la hora de emisión

Escenario: No se admite una indicación con datos incompletos
  Dado que el médico especialista está registrando una indicación
  Cuando intenta emitirla sin especificar la dosis
  Entonces el sistema señala que la dosis es obligatoria
  Y la indicación no se agrega a la lista

Escenario: Solo un médico puede emitir indicaciones
  Dado que el usuario tiene el rol de enfermería
  Cuando intenta emitir una indicación médica
  Entonces el sistema no permite la acción
  Y no se registra ninguna indicación nueva
```

### US-23 — Consultar las indicaciones vigentes
*Como enfermero, quiero consultar las indicaciones activas de un paciente para
ejecutar el tratamiento correcto y actualizado.*

**Estado:** no implementada en este sprint. Pasa al backlog.

```gherkin
Escenario: El enfermero consulta las indicaciones activas del paciente
  Dado que el paciente tiene indicaciones vigentes registradas
  Cuando el enfermero abre la ficha de ese paciente
  Entonces el sistema muestra cada indicación con su medicamento, dosis y vía
  Y muestra el médico que la emitió

Escenario: Paciente sin indicaciones registradas
  Dado que el paciente no tiene ninguna indicación vigente
  Cuando el enfermero abre su ficha
  Entonces el sistema informa que no hay indicaciones registradas
  Y no muestra una lista vacía sin explicación

Escenario: Una indicación reemplazada deja de figurar como vigente
  Dado que una indicación fue reemplazada por otra del mismo paciente
  Cuando el enfermero consulta las indicaciones vigentes
  Entonces el sistema muestra únicamente la indicación que la reemplazó
  Y la anterior aparece en el historial marcada como reemplazada
```

### US-24 — Registrar el cumplimiento de una indicación
*Como enfermero, quiero confirmar que ejecuté una indicación para dejar
constancia de su cumplimiento.*

**Estado:** no implementada en este sprint. Pasa al backlog.

```gherkin
Escenario: El enfermero confirma la ejecución
  Dado que existe una indicación vigente para el paciente
  Cuando el enfermero registra que la ejecutó
  Entonces el sistema muestra la indicación como ejecutada
  Y registra quién la ejecutó y a qué hora

Escenario: No se puede confirmar dos veces la misma indicación
  Dado que una indicación ya fue registrada como ejecutada
  Cuando el enfermero intenta confirmarla nuevamente
  Entonces el sistema no permite la acción
  Y conserva el responsable y la hora del registro original
```

### US-25 — Identificar las indicaciones pendientes
*Como médico especialista, quiero saber qué indicaciones aún no se han ejecutado
para tomar decisiones sobre información confirmada.*

**Estado:** no implementada en este sprint. Pasa al backlog.

```gherkin
Escenario: El médico distingue lo ejecutado de lo pendiente
  Dado que el paciente tiene indicaciones ejecutadas y otras sin ejecutar
  Cuando el médico consulta sus indicaciones
  Entonces el sistema distingue visualmente unas de otras
  Y muestra el tiempo transcurrido desde la emisión de las pendientes

Escenario: Todas las indicaciones ejecutadas
  Dado que todas las indicaciones del paciente fueron ejecutadas
  Cuando el médico consulta su estado
  Entonces el sistema indica que no hay indicaciones pendientes
```

---

## EP-05 · Soporte a la decisión clínica

### US-26 — Consultar el resumen clínico del paciente
*Como médico especialista, quiero ver en una sola vista la información relevante
del paciente para evaluar su estado sin recorrer varios módulos.*

**Estado:** no implementada en este sprint. Pasa al backlog.

```gherkin
Escenario: El médico evalúa al paciente desde una sola pantalla
  Dado que el paciente tiene registros de signos vitales en el turno
  Cuando el médico abre su resumen clínico
  Entonces el sistema muestra en la misma vista los datos del paciente,
    su último registro de signos vitales y el nivel de riesgo evaluado
  Y el médico no necesita abrir otra sección para completar la evaluación

Escenario: Paciente sin registros en el turno
  Dado que el paciente fue admitido pero aún no tiene registros
  Cuando el médico abre su resumen clínico
  Entonces el sistema indica que no hay mediciones en este turno
  Y no muestra valores en blanco que puedan interpretarse como normales
```

### US-27 — Revisar la evolución reciente
*Como médico especialista, quiero revisar cómo evolucionó el paciente en las
últimas horas para identificar tendencias en su condición.*

**Estado:** no implementada en este sprint. Pasa al backlog.

```gherkin
Escenario: El médico revisa la tendencia del paciente
  Dado que el paciente tiene varios registros de signos vitales en el turno
  Cuando el médico consulta su evolución reciente
  Entonces el sistema muestra los registros en orden cronológico
  Y cada uno con el nivel de riesgo que se le evaluó

Escenario: Un solo registro disponible
  Dado que el paciente tiene un único registro en el turno
  Cuando el médico consulta su evolución
  Entonces el sistema muestra ese registro
  E indica que no hay suficientes mediciones para establecer una tendencia
```

### US-28 — Identificar cambios críticos mediante alertas
*Como profesional clínico, quiero que el sistema señale los cambios críticos del
paciente para reaccionar oportunamente.*

**Estado:** implementada en el Sprint 1 y verificada en el Sprint 2.

```gherkin
Escenario: Un signo vital fuera de umbral genera una alerta
  Dado que el enfermero tiene un paciente admitido en la unidad
  Cuando registra una saturación de oxígeno de 84%
  Entonces el sistema evalúa el registro como riesgo CRITICAL
  Y muestra una alerta nueva para ese paciente en la sección de Alertas

Escenario: Un registro dentro de rango no genera alerta
  Dado que el enfermero tiene un paciente admitido en la unidad
  Cuando registra una saturación de oxígeno de 97%
  Entonces el sistema evalúa el registro como riesgo NORMAL
  Y no aparece ninguna alerta nueva para ese paciente

Escenario: Una alerta no puede resolverse sin haber sido atendida
  Dado que existe una alerta abierta para un paciente
  Cuando el profesional intenta resolverla sin atenderla primero
  Entonces el sistema no permite la acción
  Y la alerta permanece en estado abierto
```

### US-29 — Priorizar los pacientes según su riesgo
*Como profesional clínico, quiero que los pacientes se ordenen según su nivel de
riesgo para atender primero los casos más delicados.*

**Estado:** implementada en el Sprint 2.

```gherkin
Escenario: Los pacientes se ordenan por riesgo y no por orden de admisión
  Dado que hay tres pacientes admitidos en la unidad
  Y el segundo tiene un registro evaluado como CRITICAL
  Y el primero tiene un registro evaluado como NORMAL
  Cuando el profesional abre la vista de pacientes por prioridad
  Entonces el paciente con riesgo CRITICAL aparece en primer lugar
  Y el de riesgo NORMAL aparece después

Escenario: Un paciente sin registros no se confunde con uno estable
  Dado que un paciente admitido no tiene registros de signos vitales
  Cuando el profesional abre la vista de pacientes por prioridad
  Entonces ese paciente aparece al final de la lista
  Y se muestra marcado como "sin datos", no como riesgo normal

Escenario: A igual riesgo, primero quien tiene más alertas abiertas
  Dado que dos pacientes tienen el mismo nivel de riesgo evaluado
  Y uno de ellos tiene alertas abiertas sin atender
  Cuando el profesional abre la vista de pacientes por prioridad
  Entonces el paciente con alertas abiertas aparece primero
```
