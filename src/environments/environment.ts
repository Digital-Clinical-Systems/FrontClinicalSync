/**
 * Configuracion de produccion.
 *
 * `backendBaseUrl` apunta al RESTful API de ClinicalSync y es el unico origen de
 * datos de la aplicacion. Se declara como ruta relativa a proposito: el
 * despliegue reescribe `/api/v1/*` hacia el backend, de modo que la peticion
 * sale del mismo origen que la aplicacion y no interviene CORS. Cambiar de
 * backend es cambiar la regla de reescritura, no el codigo.
 */
export const environment = {
  production: true,
  backendBaseUrl: '/api/v1',
};
