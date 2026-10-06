/**
 * Configuracion de produccion. La fake API se sirve desde el mismo despliegue
 * bajo /api, de modo que no hay dependencia de un servicio externo que pueda
 * estar caido durante la evaluacion.
 *
 * Cuando exista el backend con base de datos en la nube, este valor pasa a ser
 * la URL de ese servicio y nada mas cambia en la aplicacion.
 */
export const environment = {
  production: true,
  apiBaseUrl: '/api',
};
