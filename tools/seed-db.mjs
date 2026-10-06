/**
 * Generador del archivo db.json que alimenta la fake API (json-server).
 *
 * Los datos son ficticios y se derivan unos de otros con las mismas reglas que
 * aplica el dominio: el nivel de riesgo se calcula de los valores medidos, cada
 * medicion critica genera su alerta, y la bitacora de auditoria se construye a
 * partir de los eventos que esas operaciones habrian publicado. De ese modo el
 * conjunto es coherente con las invariantes declaradas en la seccion 4.6.5 del
 * informe y no un listado inventado a mano.
 *
 * Uso:  node tools/seed-db.mjs > db.json
 */

const HORA = 3600_000;

/**
 * Las marcas de tiempo son relativas al momento en que se genera el archivo, no
 * fechas fijas. Un conjunto de datos con fechas absolutas envejece: al cabo de
 * unos dias todos los controles aparecerian vencidos y todas las alertas
 * antiguas, y la aplicacion mostraria un turno que no se parece a ninguno real.
 * Regenerar con `npm run seed` antes de desplegar mantiene el turno coherente.
 */
const ORIGEN = Date.now();
const iso = (horasAtras) => new Date(ORIGEN - horasAtras * HORA).toISOString();

const users = [
  { id: 'enf-001', fullName: 'Rocio Alarcon Vega', role: 'NURSE', shift: 'Turno dia' },
  { id: 'enf-002', fullName: 'Daniel Figueroa Ponce', role: 'NURSE', shift: 'Turno noche' },
  { id: 'med-001', fullName: 'Patricia Loayza Guerra', role: 'PHYSICIAN', specialty: 'Cardiologia' },
  { id: 'med-002', fullName: 'Fernando Chavez Ibarra', role: 'PHYSICIAN', specialty: 'Cardiologia intervencionista' },
  { id: 'coord-001', fullName: 'Miriam Tapia Cordova', role: 'COORDINATOR', specialty: 'Jefatura de enfermeria' },
];

const patients = [
  ['pac-001', 'HC-48201', 'Lucia Mendoza Rivas', 'Infarto agudo de miocardio con elevacion del ST', 'Cama 1', 68],
  ['pac-002', 'HC-48207', 'Hector Salazar Nunez', 'Insuficiencia cardiaca descompensada', 'Cama 2', 74],
  ['pac-003', 'HC-48219', 'Rosa Aguirre Tello', 'Post operada de revascularizacion miocardica', 'Cama 3', 61],
  ['pac-004', 'HC-48226', 'Marco Quispe Linares', 'Angina inestable', 'Cama 4', 57],
  ['pac-005', 'HC-48233', 'Elena Caceres Pardo', 'Fibrilacion auricular de alta respuesta ventricular', 'Cama 5', 70],
  ['pac-006', 'HC-48240', 'Julio Ramos Bendezu', 'Post operado de reemplazo valvular aortico', 'Cama 6', 65],
  ['pac-007', 'HC-48248', 'Carmen Ventura Rojas', 'Edema agudo de pulmon', 'Cama 7', 79],
  ['pac-008', 'HC-48255', 'Alberto Ninahuanca Soto', 'Sindrome coronario agudo sin elevacion del ST', 'Cama 8', 54],
].map(([id, hc, fullName, dx, bed, age], i) => ({
  id, medicalRecordNumber: hc, fullName, admissionDiagnosis: dx, age,
  unit: 'UCI Cardiovascular', bed, admittedAt: iso(96 - i * 6), active: true,
}));

/** Misma regla que src/app/vital-signs/domain/services/risk-evaluator.ts */
const mean = (s, d) => Math.round((s + 2 * d) / 3);
function evaluarRiesgo({ systolic, diastolic, heartRate, oxygenSaturation, temperature }) {
  const critico =
    oxygenSaturation < 90 || heartRate < 40 || heartRate > 130 ||
    systolic < 90 || systolic > 180 || mean(systolic, diastolic) < 65 ||
    temperature < 35 || temperature >= 39;
  if (critico) return 'CRITICAL';
  const alerta =
    oxygenSaturation < 94 || heartRate < 50 || heartRate > 110 ||
    systolic < 100 || systolic > 160 || temperature >= 38;
  return alerta ? 'WARNING' : 'NORMAL';
}

// [paciente, horasAtras, sistolica, diastolica, fc, spo2, temp, responsable]
const mediciones = [
  ['pac-001', 54, 118, 74, 82, 97, 36.6, 'enf-002'],
  ['pac-001', 42, 126, 78, 88, 96, 36.8, 'enf-002'],
  ['pac-001', 30, 138, 84, 104, 94, 37.4, 'enf-001'],
  ['pac-001', 18, 152, 88, 118, 92, 37.9, 'enf-001'],
  ['pac-001',  6, 168, 94, 126, 89, 38.4, 'enf-001'],

  ['pac-002', 50, 104, 66, 92, 93, 36.4, 'enf-002'],
  ['pac-002', 38,  98, 62, 98, 91, 36.5, 'enf-002'],
  ['pac-002', 26,  94, 60, 106, 90, 36.7, 'enf-001'],
  ['pac-002', 14,  88, 58, 112, 88, 36.9, 'enf-001'],
  ['pac-002',  4,  96, 62, 101, 92, 36.8, 'enf-001'],

  ['pac-003', 46, 122, 76, 76, 98, 36.5, 'enf-002'],
  ['pac-003', 34, 124, 78, 74, 98, 36.6, 'enf-002'],
  ['pac-003', 22, 120, 75, 72, 99, 36.4, 'enf-001'],
  ['pac-003', 10, 118, 74, 70, 98, 36.5, 'enf-001'],

  ['pac-004', 44, 136, 86, 88, 96, 36.7, 'enf-002'],
  ['pac-004', 32, 142, 88, 94, 95, 36.9, 'enf-002'],
  ['pac-004', 20, 158, 92, 102, 94, 37.1, 'enf-001'],
  ['pac-004',  8, 164, 96, 108, 93, 37.3, 'enf-001'],

  ['pac-005', 40, 128, 80, 128, 95, 36.8, 'enf-002'],
  ['pac-005', 28, 124, 78, 136, 94, 37.0, 'enf-001'],
  ['pac-005', 16, 118, 74, 142, 93, 37.2, 'enf-001'],
  ['pac-005',  5, 122, 76, 112, 95, 37.0, 'enf-001'],

  ['pac-006', 36, 126, 78, 80, 97, 36.6, 'enf-002'],
  ['pac-006', 24, 128, 80, 84, 97, 37.5, 'enf-001'],
  ['pac-006', 12, 130, 82, 90, 96, 38.2, 'enf-001'],
  ['pac-006',  3, 132, 84, 96, 95, 38.6, 'enf-001'],

  ['pac-007', 33, 148, 92, 110, 90, 36.9, 'enf-002'],
  ['pac-007', 21, 156, 96, 118, 87, 37.1, 'enf-001'],
  ['pac-007',  9, 144, 90, 106, 91, 37.0, 'enf-001'],
  ['pac-007',  2, 138, 86, 98, 94, 36.9, 'enf-001'],

  ['pac-008', 31, 132, 82, 78, 97, 36.5, 'enf-002'],
  ['pac-008', 19, 134, 84, 82, 97, 36.6, 'enf-001'],
  ['pac-008',  7, 130, 80, 80, 98, 36.6, 'enf-001'],
];

const vitalSigns = mediciones.map(([patientId, h, systolic, diastolic, heartRate, oxygenSaturation, temperature, recordedBy], i) => {
  const m = { systolic, diastolic, heartRate, oxygenSaturation, temperature };
  return {
    id: `vs-${String(i + 1).padStart(3, '0')}`,
    patientId, recordedBy, ...m,
    meanArterialPressure: mean(systolic, diastolic),
    riskLevel: evaluarRiesgo(m),
    measuredAt: iso(h),
    correctsRecordId: null,
  };
});

// Una medicion critica genera su alerta: es la politica de dominio de BC-03 -> BC-04.
const motivo = (v) => {
  const causas = [];
  if (v.oxygenSaturation < 90) causas.push(`saturacion de oxigeno en ${v.oxygenSaturation} %`);
  else if (v.oxygenSaturation < 94) causas.push(`saturacion de oxigeno en descenso, ${v.oxygenSaturation} %`);
  if (v.heartRate > 130) causas.push(`frecuencia cardiaca en ${v.heartRate} lpm`);
  else if (v.heartRate > 110) causas.push(`taquicardia de ${v.heartRate} lpm`);
  if (v.heartRate < 40) causas.push(`bradicardia de ${v.heartRate} lpm`);
  else if (v.heartRate < 50) causas.push(`frecuencia cardiaca baja, ${v.heartRate} lpm`);
  if (v.systolic > 180) causas.push(`sistolica en ${v.systolic} mmHg`);
  else if (v.systolic > 160) causas.push(`sistolica elevada, ${v.systolic} mmHg`);
  if (v.systolic < 90) causas.push(`hipotension con sistolica en ${v.systolic} mmHg`);
  else if (v.systolic < 100) causas.push(`sistolica baja, ${v.systolic} mmHg`);
  if (v.meanArterialPressure < 65) causas.push(`presion arterial media en ${v.meanArterialPressure} mmHg`);
  if (v.temperature >= 39) causas.push(`temperatura en ${v.temperature} C`);
  else if (v.temperature >= 38) causas.push(`febricula de ${v.temperature} C`);
  if (v.temperature < 35) causas.push(`hipotermia de ${v.temperature} C`);
  return causas.length ? `Valor fuera de umbral: ${causas.join('; ')}` : 'Valor fuera de umbral';
};

// La politica de AlertsStore genera alerta para WARNING y para CRITICAL por igual,
// de modo que la semilla reproduce ese mismo criterio y no uno propio.
const fueraDeUmbral = vitalSigns.filter(v => v.riskLevel !== 'NORMAL');
const alerts = fueraDeUmbral.map((v, i) => {
  const n = i + 1;
  // Las mas antiguas ya fueron atendidas o resueltas; las recientes siguen abiertas.
  const edad = ORIGEN - new Date(v.measuredAt).getTime();
  const estado = edad > 24 * HORA ? 'RESOLVED' : edad > 11 * HORA ? 'ACKNOWLEDGED' : 'OPEN';
  return {
    id: `alr-${String(n).padStart(3, '0')}`,
    patientId: v.patientId,
    severity: v.riskLevel === 'CRITICAL' ? 'CRITICAL' : 'WARNING',
    triggerSource: `vital-sign:${v.id}`,
    reason: motivo(v),
    status: estado,
    raisedAt: v.measuredAt,
    acknowledgedBy: estado === 'OPEN' ? null : (n % 2 === 0 ? 'enf-001' : 'enf-002'),
  };
});

// El evento clinico critico tambien genera alerta, con el prefijo de origen
// que `Alert.originLabel` traduce para la vista.
alerts.push({
  id: 'alr-900', patientId: 'pac-002', severity: 'CRITICAL',
  triggerSource: 'clinical-event:cev-005',
  reason: 'Episodio de desaturacion durante la movilizacion',
  status: 'ACKNOWLEDGED', raisedAt: iso(13), acknowledgedBy: 'enf-001',
});

const medicalOrders = [
  ['ord-001', 'pac-001', 'med-001', 'Acido acetilsalicilico', '100 mg', 'Via oral', 'Cada 24 horas', 52, 'ACTIVE', null, null],
  ['ord-002', 'pac-001', 'med-001', 'Enoxaparina', '40 mg', 'Via subcutanea', 'Cada 12 horas', 50, 'SUPERSEDED', null, 'ord-003'],
  ['ord-003', 'pac-001', 'med-002', 'Enoxaparina', '60 mg', 'Via subcutanea', 'Cada 12 horas', 20, 'ACTIVE', 'ord-002', null],
  ['ord-004', 'pac-002', 'med-001', 'Furosemida', '20 mg', 'Via endovenosa', 'Cada 8 horas', 44, 'ACTIVE', null, null],
  ['ord-005', 'pac-004', 'med-002', 'Atorvastatina', '80 mg', 'Via oral', 'Cada 24 horas', 40, 'ACTIVE', null, null],
  ['ord-006', 'pac-005', 'med-001', 'Amiodarona', '150 mg', 'Via endovenosa', 'Dosis unica', 26, 'ACTIVE', null, null],
  ['ord-007', 'pac-007', 'med-002', 'Nitroglicerina', '10 mcg/min', 'Via endovenosa', 'Infusion continua', 22, 'ACTIVE', null, null],
].map(([id, patientId, prescribedBy, medication, dose, route, frequency, h, status, replacesOrderId, supersededBy]) => ({
  id, patientId, prescribedBy, medication, dose, route, frequency,
  status, prescribedAt: iso(h), replacesOrderId, supersededBy,
}));

const handovers = [
  {
    id: 'hvr-001', patientId: 'pac-001', outgoingNurseId: 'enf-002', incomingNurseId: 'enf-001',
    situation: 'Paciente de 68 anos en el segundo dia post infarto, con dolor toracico controlado.',
    background: 'Ingreso por infarto con elevacion del ST. Angioplastia primaria hace 48 horas.',
    assessment: 'Tendencia al alza de la presion arterial y descenso progresivo de la saturacion en las ultimas doce horas.',
    recommendation: 'Controlar signos vitales cada dos horas y avisar al medico si la saturacion baja de 90 %.',
    status: 'ACKNOWLEDGED', issuedAt: iso(22), acknowledgedAt: iso(21),
  },
  {
    id: 'hvr-002', patientId: 'pac-002', outgoingNurseId: 'enf-002', incomingNurseId: 'enf-001',
    situation: 'Paciente de 74 anos con insuficiencia cardiaca descompensada y balance hidrico positivo.',
    background: 'Tercer ingreso en el ano por el mismo motivo. En tratamiento con diuretico endovenoso.',
    assessment: 'Presion arterial en descenso sostenido; responde parcialmente al diuretico.',
    recommendation: 'Vigilar diuresis horaria y reportar si la sistolica cae por debajo de 90 mmHg.',
    status: 'ACKNOWLEDGED', issuedAt: iso(22), acknowledgedAt: iso(20),
  },
  {
    id: 'hvr-003', patientId: 'pac-007', outgoingNurseId: 'enf-002', incomingNurseId: 'enf-001',
    situation: 'Paciente de 79 anos con edema agudo de pulmon en resolucion.',
    background: 'Ingreso de urgencia hace 36 horas con dificultad respiratoria severa.',
    assessment: 'Saturacion en recuperacion tras el ajuste de la infusion; aun requiere oxigeno suplementario.',
    recommendation: 'Mantener posicion semisentada y no retirar el oxigeno sin indicacion medica.',
    status: 'ISSUED', issuedAt: iso(10), acknowledgedAt: null,
  },
  {
    id: 'hvr-004', patientId: 'pac-005', outgoingNurseId: 'enf-001', incomingNurseId: 'enf-002',
    situation: 'Paciente de 70 anos con fibrilacion auricular de alta respuesta, ya revertida.',
    background: 'Episodio iniciado hace dos dias. Recibio amiodarona endovenosa en dosis unica.',
    assessment: 'Frecuencia cardiaca descendio de 142 a 112 lpm tras la dosis.',
    recommendation: 'Monitorizar frecuencia cada hora durante las proximas seis horas.',
    status: 'ISSUED', issuedAt: iso(4), acknowledgedAt: null,
  },
];

// Anotaciones clinicas de BC-08: administraciones de medicamento (US-19) y
// eventos clinicos relevantes del turno (US-20).
const clinicalEvents = [
  ['cev-001', 'pac-001', 'enf-002', 'MEDICATION_ADMINISTRATION', 'ROUTINE', 'Administracion matutina sin incidencias. Paciente tolera la via oral.', 'Acido acetilsalicilico', '100 mg', 'ord-001', 51],
  ['cev-002', 'pac-001', 'enf-001', 'CLINICAL_OBSERVATION', 'NOTABLE', 'Refiere dolor toracico opresivo de intensidad 4 sobre 10 al incorporarse. Cede en reposo.', null, null, null, 29],
  ['cev-003', 'pac-001', 'enf-001', 'MEDICATION_ADMINISTRATION', 'ROUTINE', 'Dosis nocturna administrada tras el ajuste indicado por el medico.', 'Enoxaparina', '60 mg', 'ord-003', 19],
  ['cev-004', 'pac-002', 'enf-002', 'MEDICATION_ADMINISTRATION', 'ROUTINE', 'Diuretico administrado. Se inicia control horario de diuresis.', 'Furosemida', '20 mg', 'ord-004', 43],
  ['cev-005', 'pac-002', 'enf-001', 'CLINICAL_OBSERVATION', 'CRITICAL', 'Episodio de desaturacion durante la movilizacion, con palidez y sudoracion. Se suspende el procedimiento y se avisa al medico de guardia.', null, null, null, 13],
  ['cev-006', 'pac-004', 'enf-002', 'MEDICATION_ADMINISTRATION', 'ROUTINE', 'Estatina administrada con la cena.', 'Atorvastatina', '80 mg', 'ord-005', 39],
  ['cev-007', 'pac-005', 'enf-001', 'MEDICATION_ADMINISTRATION', 'NOTABLE', 'Dosis unica de antiarritmico. Se monitoriza frecuencia durante la infusion.', 'Amiodarona', '150 mg', 'ord-006', 25],
  ['cev-008', 'pac-006', 'enf-001', 'CLINICAL_OBSERVATION', 'NOTABLE', 'Herida operatoria con eritema perilesional leve, sin secrecion. Se registra para seguimiento del turno siguiente.', null, null, null, 11],
  ['cev-009', 'pac-007', 'enf-002', 'MEDICATION_ADMINISTRATION', 'ROUTINE', 'Infusion iniciada segun indicacion, con control de presion cada quince minutos.', 'Nitroglicerina', '10 mcg/min', 'ord-007', 21],
  ['cev-010', 'pac-007', 'enf-001', 'CLINICAL_OBSERVATION', 'ROUTINE', 'Mejora la mecanica respiratoria. Mantiene posicion semisentada y oxigeno por canula.', null, null, null, 8],
].map(([id, patientId, recordedBy, type, severity, description, medication, dose, relatedOrderId, h]) => ({
  id, patientId, recordedBy, type, severity, description,
  medication, dose, relatedOrderId, occurredAt: iso(h),
}));

// La bitacora no se escribe a mano: se deriva de los eventos que cada operacion publico.
const auditLogs = [];
let seq = 0;
const anotar = (actionType, occurredAt, affectedResource, actorId, metadata) => {
  auditLogs.push({
    id: `aud-${String(++seq).padStart(3, '0')}`,
    actionType, occurredAt, affectedResource, actorId, metadata,
  });
};

for (const p of patients) anotar('PacienteAdmitido', p.admittedAt, p.id, 'sistema', { bedLocation: `${p.unit} - ${p.bed}` });
for (const v of vitalSigns) {
  anotar('SignosVitalesRegistrados', v.measuredAt, v.patientId, v.recordedBy, { recordId: v.id });
  anotar('NivelDeRiesgoClinicoEvaluado', v.measuredAt, v.patientId, 'sistema', { recordId: v.id, riskLevel: v.riskLevel });
}
for (const a of alerts) {
  anotar('AlertaCriticaGenerada', a.raisedAt, a.patientId, 'sistema', { alertId: a.id, severity: a.severity, triggerSource: a.triggerSource });
  if (a.status !== 'OPEN') anotar('AlertaAtendida', a.raisedAt, a.patientId, a.acknowledgedBy, { alertId: a.id });
  if (a.status === 'RESOLVED') anotar('AlertaResuelta', a.raisedAt, a.patientId, a.acknowledgedBy, { alertId: a.id });
}
for (const o of medicalOrders) {
  anotar('NuevaIndicacionMedicaRegistrada', o.prescribedAt, o.patientId, o.prescribedBy, { orderId: o.id, replacesOrderId: o.replacesOrderId });
  if (o.status === 'SUPERSEDED') anotar('IndicacionMedicaReemplazada', o.prescribedAt, o.patientId, o.prescribedBy, { orderId: o.id, supersededBy: o.supersededBy });
}
for (const c of clinicalEvents) {
  anotar('EventoClinicoRegistrado', c.occurredAt, c.patientId, c.recordedBy, { eventId: c.id, eventType: c.type, severity: c.severity });
  if (c.severity === 'CRITICAL') {
    anotar('EventoClinicoCriticoRegistrado', c.occurredAt, c.patientId, c.recordedBy, { eventId: c.id, triggerSource: `clinical-event:${c.id}` });
  }
}
for (const h of handovers) {
  anotar('EntregaSbarRegistrada', h.issuedAt, h.patientId, h.outgoingNurseId, { handoverId: h.id, incomingNurseId: h.incomingNurseId });
  if (h.acknowledgedAt) anotar('AcuseDeReciboConfirmado', h.acknowledgedAt, h.patientId, h.incomingNurseId, { handoverId: h.id });
}
auditLogs.sort((a, b) => new Date(a.occurredAt) - new Date(b.occurredAt));

/**
 * `generatedAt` es el ancla temporal del conjunto. La fake API lo usa para
 * recalcular las marcas de tiempo respecto del momento de la consulta, de modo
 * que el turno de demostracion se mantiene coherente aunque la aplicacion se
 * revise semanas despues de haberse desplegado. Sin esa referencia, un conjunto
 * de datos fijo envejece: a los pocos dias todos los controles figurarian
 * vencidos y la pantalla de documentacion pendiente mostraria un servicio
 * abandonado en lugar de un turno en marcha.
 */
const meta = {
  generatedAt: new Date(ORIGEN).toISOString(),
  descripcion: 'Datos ficticios de demostracion de ClinicalSync. Ningun dato corresponde a una persona real.',
  generadoPor: 'tools/seed-db.mjs',
};

process.stdout.write(JSON.stringify(
  { meta, users, patients, vitalSigns, alerts, medicalOrders, handovers, clinicalEvents, auditLogs }, null, 2) + '\n');
