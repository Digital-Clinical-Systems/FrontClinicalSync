/**
 * Proxy de desarrollo: `ng serve` reenvia `/api/v1` al backend desplegado, de
 * modo que el navegador nunca cruza de origen y el entorno local se comporta
 * igual que el publicado.
 *
 * Quitar `Origin` y `Referer` no es un atajo: la peticion la emite este servidor
 * y no el navegador, asi que propagarlas haria que el backend la evaluara como
 * una peticion de origen cruzado y la rechazara con 403. Un proxy correcto no
 * las reenvia.
 */
export default {
  '/api/v1': {
    target: 'https://backclinicalsync-production.up.railway.app',
    changeOrigin: true,
    secure: true,
    configure: (proxy) => {
      proxy.on('proxyReq', (proxyReq) => {
        proxyReq.removeHeader('origin');
        proxyReq.removeHeader('referer');
      });
    },
  },
};
