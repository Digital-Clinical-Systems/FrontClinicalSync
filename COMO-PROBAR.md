# Cómo probar la aplicación y reportar lo que encuentres

Mathias, Johnny: esto es todo lo que necesitan. No hay que programar ni usar git.

**App a probar:** https://clinicalsync-frontend.vercel.app

---

## Primero, la duda de Mathias

> *"¿el commit de los issues cómo lo subo?"*

**Los issues no se suben con commits.** No tocas git para nada.

Un *issue* es una ficha que se crea en la página web de GitHub:

1. Entra a https://github.com/Digital-Clinical-Systems/FrontClinicalSync
2. Pestaña **Issues** (arriba, al lado de Code)
3. Botón verde **New issue**
4. Escribes y le das a **Submit new issue**

Listo. Queda registrado a tu nombre automáticamente, sin commit, sin rama, sin push.

---

## Segundo, lo que observó Johnny

> *"¿se supone que es una vista de admin? porque el botón para elegir enfermero o médico no tiene mucho sentido"*

**Buena observación, y es exactamente el tipo de cosa que QA debe reportar.**

Tienes razón en el fondo: en un hospital real, una enfermera no puede convertirse en médico desde un menú. El selector existe porque el login todavía no está hecho (es la historia TS-01, pendiente), así que es un atajo para poder demostrar las dos vistas. Angel lo etiquetó como "Rol de demostración".

Que sea intencional **no significa que no deba reportarse**. Si nadie lo deja escrito, el atajo se queda y termina en producción. Eso es precisamente para lo que sirve un issue.

Así se escribe ese hallazgo — **úsenlo de modelo**:

> **Título:** El selector de rol permite que un enfermero se convierta en médico sin autenticación
>
> **Dónde:** Barra superior, en todas las pantallas
>
> **Pasos para reproducirlo:**
> 1. Abrir https://clinicalsync-frontend.vercel.app
> 2. Observar que arriba a la derecha dice "Enfermera de turno (demo) · NURSE"
> 3. Abrir el desplegable y elegir "Medico"
> 4. Ir a la sección Indicaciones
>
> **Qué esperaba:** Que el rol venga de la sesión del usuario y no se pueda cambiar desde la interfaz. Un enfermero no debería poder emitir indicaciones médicas.
>
> **Qué pasó:** Cualquiera puede cambiar de rol y emitir indicaciones como médico.
>
> **Observación:** Entiendo que es un atajo mientras no exista el login (TS-01). Lo reporto para que quede registrado como limitación conocida y no llegue así a producción.

Fíjense en la estructura: **dónde / pasos / qué esperaba / qué pasó**. Eso es un issue. Lo demás sobra.

---

## Cómo encontrar cosas: tres técnicas

No hagan clic al azar. Estas tres encuentran casi todo:

### 1. Valores límite

Donde haya un número, prueben los bordes en vez del medio.

En **Signos vitales**, intenten guardar con:

| Campo | Prueben | Qué están buscando |
| :--- | :--- | :--- |
| Sistólica / Diastólica | 80 y 120 (la de abajo mayor) | ¿Lo rechaza con un mensaje claro? |
| Saturación | 0, luego 150 | ¿Acepta valores imposibles? |
| Temperatura | 20, luego 50 | ¿El mensaje dice qué rango es válido? |
| Frecuencia cardíaca | dejarlo vacío | ¿Qué pasa al guardar sin dato? |

La pregunta no es solo *"¿lo rechaza?"*, sino **¿el mensaje de error le sirve a una enfermera apurada?** Si dice algo que no se entiende, eso es un issue.

### 2. Estado vacío

Casi todos los errores de interfaz salen cuando no hay datos.

- Entra a **Resumen del paciente** y elige uno que no tenga registros. ¿Dice claramente que no hay datos, o muestra espacios en blanco que parecen valores normales?
- Entra a **Alertas** sin haber registrado nada. ¿Se entiende que no hay alertas, o parece que la página se rompió?
- Lo mismo en **Traspasos** y **Auditoría**.

### 3. Romper el orden esperado

Hagan las cosas al revés de como se supone.

- En **Traspasos SBAR**: intenten emitir con una sección vacía. Y pongan el mismo ID de enfermero en entrante y saliente.
- En **Alertas**: intenten resolver una alerta sin atenderla primero.
- Recarguen la página (F5) después de registrar cosas. ¿Qué pasa? *(Ojo: aquí ya sabemos que los datos no persisten, está documentado. No hace falta reportarlo.)*

### Y además

- Abran la app en el **celular**. ¿Se puede usar? ¿Algo se sale de la pantalla?
- Muévanse con la tecla **Tab** solamente, sin mouse. ¿Se ve dónde está el foco?

---

## Reglas para que el issue sirva

1. **Un issue por problema.** No junten cinco cosas en uno.
2. **Pasos que cualquiera pueda repetir.** "No funciona" no sirve. "Pongo 150 en saturación y lo guarda" sí.
3. **Si no están seguros de que sea un error, repórtenlo igual.** Prefiero descartar un issue que perder uno. Lo de Johnny es justo eso: no sabía si era un bug o intencional, y era un hallazgo válido.
4. **Captura de pantalla si se ve raro.** Se arrastra directo a la caja del issue.

## Meta

**3 issues cada uno.** Con eso alcanza. Si encuentran más, mejor.
