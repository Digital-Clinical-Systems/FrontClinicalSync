/**
 * Configuracion de produccion.
 *
 * `apiBaseUrl` apunta al servicio de datos de demostracion publicado junto a la
 * aplicacion, que todavia alimenta los adaptadores no migrados.
 *
 * `backendBaseUrl` apunta al RESTful API de ClinicalSync. Se declara como ruta
 * relativa a proposito: el despliegue reescribe `/api/v1/*` hacia el backend, de
 * modo que la peticion sale del mismo origen que la aplicacion y no interviene
 * CORS. Cambiar de backend es cambiar la regla de reescritura, no el codigo.
 */
export const environment = {
  production: true,
  apiBaseUrl: '/api',
  backendBaseUrl: '/api/v1',
};
