/**
 * Fake API de ClinicalSync.
 *
 * Expone el contenido de db.json con el mismo contrato de rutas que json-server,
 * de modo que la aplicacion consume HTTP real tanto en desarrollo (json-server
 * en el puerto 3000) como en produccion (esta funcion). Cuando exista el backend
 * del siguiente incremento, la aplicacion solo cambia `apiBaseUrl`: ni el dominio
 * ni la capa de aplicacion se tocan.
 *
 * Alcance declarado: la persistencia es de solo lectura. Las escrituras responden
 * con el recurso creado para que el cliente complete su flujo, pero no modifican
 * db.json, porque una funcion sin estado no conserva nada entre invocaciones.
 */
const db = require('../db.json');

const COLECCIONES = Object.keys(db);

module.exports = function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') return res.status(204).end();

  const segmentos = [].concat(req.query.path || []).filter(Boolean);
  const [coleccion, id] = segmentos;

  if (!coleccion) {
    return res.status(200).json({
      servicio: 'ClinicalSync Fake API',
      alcance: 'Datos ficticios de solo lectura para el incremento de frontend',
      recursos: COLECCIONES.map(c => ({ recurso: c, registros: db[c].length, ruta: `/api/${c}` })),
    });
  }
  if (!COLECCIONES.includes(coleccion)) {
    return res.status(404).json({ error: `Recurso no encontrado: ${coleccion}`, recursos: COLECCIONES });
  }

  if (req.method === 'GET') {
    if (id) {
      const item = db[coleccion].find(x => String(x.id) === String(id));
      return item ? res.status(200).json(item) : res.status(404).json({ error: 'No encontrado' });
    }
    // Filtros por campo al estilo json-server: /api/vitalSigns?patientId=pac-001
    const filtros = Object.entries(req.query).filter(([k]) => k !== 'path');
    const datos = filtros.length
      ? db[coleccion].filter(x => filtros.every(([k, v]) => String(x[k]) === String(v)))
      : db[coleccion];
    return res.status(200).json(datos);
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
