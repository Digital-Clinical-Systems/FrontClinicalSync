/**
 * Configuracion de desarrollo. Apunta a json-server, que se levanta con
 * `npm run fake-api` sobre el mismo db.json que consume la produccion.
 */
export const environment = {
  production: false,
  apiBaseUrl: 'http://localhost:3000',
};
