// Complementa o app.json. O app web para iPhone fica no GitHub Pages, num subcaminho
// (/App-do-pentecostal/web/app); o do computador é servido na raiz. Por isso o
// subcaminho só entra quando WEB_BASE_URL é passado, no script `export:pwa`.
module.exports = ({ config }) => ({
  ...config,
  experiments: {
    ...config.experiments,
    ...(process.env.WEB_BASE_URL ? { baseUrl: process.env.WEB_BASE_URL } : {}),
  },
});
