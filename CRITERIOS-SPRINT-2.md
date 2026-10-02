# Criterios de aceptación — Sprint 2

Criterios Given/When/Then de las historias del Sprint 2, en formato Gherkin.

## Cómo escribirlos

Mira cómo están redactados los del Sprint 1 en la sección 3.1 del informe
(repositorio `Informe`, cuadro de Epics, User Stories y Technical Stories).
Mismo estilo: **Given** el estado previo, **When** la acción del usuario,
**Then** el resultado observable.

Cada historia necesita al menos dos escenarios: el camino feliz y uno de error.
El de error suele ser el más útil, porque es el que define la invariante.

## US-26 — Evaluar al paciente desde una vista consolidada

```gherkin
Escenario: El médico consulta el estado actual del paciente
  Dado que el médico ha iniciado sesión y tiene pacientes asignados
  Cuando selecciona un paciente de su lista
  Entonces el sistema muestra en una sola pantalla los datos del paciente,
    su último registro de signos vitales y el nivel de riesgo evaluado

Escenario: TODO — paciente sin registros de signos vitales
```

## US-27 — Revisar la evolución reciente

```gherkin
Escenario: TODO
Escenario: TODO
```

## US-22 — Emitir una indicación médica

```gherkin
Escenario: TODO
Escenario: TODO — intentar emitir sin dosis
```

## US-23 — Consultar las indicaciones pendientes

```gherkin
Escenario: TODO
```

## US-24 — Registrar la ejecución de una indicación

```gherkin
Escenario: TODO
Escenario: TODO — intentar ejecutar una indicación ya cancelada
```

## US-25 — Confirmar el cumplimiento

```gherkin
Escenario: TODO
```

## US-28 — Detectar cambios críticos mediante alertas

```gherkin
Escenario: TODO — un signo vital fuera de umbral genera una alerta
Escenario: TODO — una alerta no puede resolverse sin haber sido atendida
```

## US-29 — Priorizar pacientes por riesgo

```gherkin
Escenario: TODO
```
