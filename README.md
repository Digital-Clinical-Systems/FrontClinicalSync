# FrontClinicalSync

Aplicación web de **ClinicalSync** — Digital Clinical System.
Curso 1ASI0729 Desarrollo de Aplicaciones Open Source, ciclo 2026-20, NRC 7747.

Angular 19 con componentes *standalone*, *signals* e `inject()`.

## Arquitectura

El código se organiza por **Bounded Context** y, dentro de cada uno, en las cuatro
capas declaradas en la sección 5.1.3 del informe:

```
src/app/
├── shared/        Shared Kernel: identificadores, AggregateRoot, bus de eventos
├── iam/           BC-01  Security & Shared Kernel
├── patients/      BC-02  Patients            (directorio maestro)
├── vital-signs/   BC-03  Vital Signs         (Core Domain)
├── alerts/        BC-04  Critical Events & Alerts
├── handover/      BC-05  Handover SBAR       (Core Domain)
├── audit/         BC-06  Audit Logs
└── layout/        Shell de navegación
```

Cada contexto sigue `domain/ · application/ · infrastructure/ · presentation/`.

### Reglas de dependencia

Las tres reglas de la sección 4.6.6 del informe se sostienen en el código:

1. **Ningún contexto importa clases de dominio de otro.** Lo único que cruza la
   frontera son los eventos de `shared/domain/events` y los identificadores del
   Shared Kernel.
2. **Sin ciclos.** `vital-signs` publica `NivelDeRiesgoClinicoEvaluado`; `alerts`
   reacciona. `vital-signs` no conoce el concepto de alerta.
3. **Audit es sumidero.** Consume todos los eventos y no publica hacia el dominio.

### Estado de la persistencia

No existe backend todavía (TS-02 a TS-08 pendientes). Los repositorios se declaran
como puertos (`PATIENT_REPOSITORY`, `VITAL_SIGN_REPOSITORY`) con adaptadores en
memoria. Al existir el API REST se sustituye el adaptador en `app.config.ts` sin
tocar el dominio ni la capa de aplicación.

## Comandos

```bash
npm install
npm start                      # servidor de desarrollo en http://localhost:4200
npm run build                  # bundle de producción en dist/
npm test -- --watch=false      # suite de pruebas del dominio
```

Para ejecutar las pruebas en integración continua hay que exportar `CHROME_BIN`
apuntando a un Chrome o Chromium disponible.

## Pruebas

La suite cubre las invariantes de los agregados, que son la parte del sistema
donde un error tiene consecuencia clínica:

| Archivo | Invariantes verificadas |
| :--- | :--- |
| `blood-pressure.vo.spec.ts` | Sistólica mayor que diastólica; rangos fisiológicos |
| `vital-sign-record.entity.spec.ts` | Riesgo derivado y no asignable; inmutabilidad; eventos publicados |
| `handover.entity.spec.ts` | Cuatro secciones SBAR obligatorias; entrante distinto del saliente; acuse único |
| `alert.entity.spec.ts` | Alerta con origen; no se resuelve sin atender; sin retroceso de estado |

## Verificación de fronteras

Las tres reglas de dependencia no son una declaración de intenciones: están
implementadas en `tools/check-boundaries.mjs` y se comprueban con

```bash
npm run check:boundaries
```

El script recorre los imports relativos de cada archivo y falla con código de
salida 1 si alguno cruza una frontera prohibida. Su comportamiento se verificó
introduciendo una violación de cada regla y confirmando que el script la detecta.
