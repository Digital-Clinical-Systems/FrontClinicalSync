/**
 * Configuracion de desarrollo.
 *
 * `backendBaseUrl` es relativa igual que en produccion: `proxy.conf.mjs`
 * reenvia `/api/v1/*` al backend desplegado, de modo que `ng serve` trabaja
 * contra los mismos datos que la aplicacion publicada y no hace falta levantar
 * ningun servicio local.
 */
export const environment = {
  production: false,
  backendBaseUrl: '/api/v1',
};
