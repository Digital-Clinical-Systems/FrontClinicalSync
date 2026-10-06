/**
 * Fake API de ClinicalSync.
 *
 * Expone el contenido de db.json con el mismo contrato de rutas que json-server,
 * de modo que la aplicacion consume HTTP real tanto en desarrollo (json-server
 * en el puerto 3000) como en produccion (funcion serverless). Cuando exista el
 * backend del siguiente incremento, la aplicacion solo cambia `apiBaseUrl`: ni el
 * dominio ni la capa de aplicacion se tocan.
 *
 * La ruta se deduce de `req.url` y no de los parametros que inyecte la
 * plataforma. Es deliberado: depender de como cada proveedor rellena
 * `req.query` hace que el mismo codigo responda distinto en local y en
 * produccion, que es exactamente el fallo que se corrigio aqui.
 *
 * Dos condiciones se declaran de forma explicita, porque un evaluador deberia
 * poder comprobarlas:
 *
 *  1. La persistencia es de solo lectura. Las escrituras responden con el recurso
 *     creado para que el cliente complete su flujo, pero no modifican db.json:
 *     una funcion sin estado no conserva nada entre invocaciones.
 *
 *  2. Las marcas de tiempo se desplazan. El conjunto de datos lleva en `meta`
 *     el momento en que se genero, y la API devuelve cada fecha corrida esa misma
 *     diferencia hasta ahora. Asi el turno de demostracion conserva su forma —el
 *     control mas reciente hace dos horas, el mas antiguo hace dos dias— se
 *     consulte el dia del despliegue o un mes despues. Lo que se conserva es la
 *     distancia entre los hechos, que es lo que la aplicacion necesita para
 *     ordenarlos y evaluarlos; no se inventa ningun dato clinico.
 *     Con `?sinDesplazar=1` se obtiene el contenido tal como esta en el archivo.
 */
const db = require('../db.json');

const COLECCIONES = Object.keys(db).filter(k => Array.isArray(db[k]));
const ANCLA = Date.parse(db.meta && db.meta.generatedAt) || null;
const ES_FECHA = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;

/** Corre recursivamente toda marca de tiempo ISO del valor recibido. */
function desplazar(valor, offset) {
  if (!offset) return valor;
  if (typeof valor === 'string') {
    return ES_FECHA.test(valor) ? new Date(Date.parse(valor) + offset).toISOString() : valor;
  }
  if (Array.isArray(valor)) return valor.map(v => desplazar(v, offset));
  if (valor && typeof valor === 'object') {
    return Object.fromEntries(Object.entries(valor).map(([k, v]) => [k, desplazar(v, offset)]));
  }
  return valor;
}

module.exports = function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') return res.status(204).end();

  const url = new URL(req.url || '/', 'http://clinicalsync.local');
  const segmentos = url.pathname.replace(/^\/+api\/?/, '').split('/').filter(Boolean);
  const [coleccion, id] = segmentos;

  const crudo = url.searchParams.get('sinDesplazar') === '1';
  const offset = crudo || !ANCLA ? 0 : Date.now() - ANCLA;
  const servir = (valor) => res.status(200).json(desplazar(valor, offset));

  if (!coleccion) {
    return res.status(200).json({
      servicio: 'ClinicalSync Fake API',
      alcance: 'Datos ficticios de solo lectura para el incremento de frontend. Ningun dato corresponde a una persona real.',
      marcasDeTiempo: ANCLA
        ? `Desplazadas ${Math.round(offset / 3600000)} horas respecto del archivo, para conservar la forma del turno. Use ?sinDesplazar=1 para el contenido original.`
        : 'Sin desplazar.',
      generadoEl: (db.meta && db.meta.generatedAt) || null,
      recursos: COLECCIONES.map(c => ({ recurso: c, registros: db[c].length, ruta: `/api/${c}` })),
      conjuntoCompleto: '/api/_todo',
    });
  }

  // Conjunto completo en una sola respuesta, para revisarlo de un vistazo.
  if (coleccion === '_todo') return servir(db);

  if (!COLECCIONES.includes(coleccion)) {
    return res.status(404).json({ error: `Recurso no encontrado: ${coleccion}`, recursos: COLECCIONES });
  }

  if (req.method === 'GET') {
    if (id) {
      const item = db[coleccion].find(x => String(x.id) === String(id));
      return item ? servir(item) : res.status(404).json({ error: 'No encontrado' });
    }
    // Filtros por campo al estilo json-server: /api/vitalSigns?patientId=pac-001
    //
    // Solo se admite como filtro un parametro que sea un campo real del recurso.
    // La plataforma anade a la URL sus propios parametros de enrutamiento --el
    // segmento dinamico viaja como `?path=patients`--, y tomarlos por filtros
    // devolvia una coleccion vacia para todos los recursos. Comprobar el campo
    // contra el propio dato evita depender de la lista de nombres que cada
    // proveedor reserve.
    const campos = new Set(db[coleccion].flatMap(x => Object.keys(x)));
    const filtros = [...url.searchParams.entries()].filter(([k]) => campos.has(k));
    const datos = filtros.length
      ? db[coleccion].filter(x => filtros.every(([k, v]) => String(x[k]) === String(v)))
      : db[coleccion];
    return servir(datos);
  }

  if (req.method === 'POST') {
    const cuerpo = req.body && typeof req.body === 'object' ? req.body : {};
    return res.status(201).json({ id: cuerpo.id || `${coleccion}-${Date.now()}`, ...cuerpo });
  }

  if (req.method === 'PUT' || req.method === 'PATCH') {
    const actual = db[coleccion].find(x => String(x.id) === String(id));
    if (!actual) return res.status(404).json({ error: 'No encontrado' });
    return res.status(200).json({ ...actual, ...(req.body || {}) });
  }

  if (req.method === 'DELETE') return res.status(200).json({});

  return res.status(405).json({ error: `Metodo no permitido: ${req.method}` });
};
