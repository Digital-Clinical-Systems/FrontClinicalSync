/**
 * Punto de entrada para /api sin segmentos. Existe como archivo propio porque
 * una ruta comodin no captura la ruta raiz: sin este archivo, /api caeria en la
 * reescritura de la aplicacion y devolveria el HTML en lugar del indice.
 */
module.exports = require('../lib/fake-api');
