/**
 * Configuracion de desarrollo.
 *
 * `apiBaseUrl` apunta a json-server, que se levanta con `npm run fake-api`.
 *
 * `backendBaseUrl` es la misma ruta relativa que en produccion: `ng serve` la
 * reenvia al backend segun `proxy.conf.json`. Asi el navegador nunca cruza de
 * origen y el entorno local se comporta igual que el publicado.
 */
export const environment = {
  production: false,
  apiBaseUrl: 'http://localhost:3000',
  backendBaseUrl: '/api/v1',
};
