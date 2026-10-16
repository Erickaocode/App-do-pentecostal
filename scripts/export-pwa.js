// Gera o app web para iPhone em web/app, publicado pelo GitHub Pages no subcaminho
// /App-do-pentecostal/web/app (o app.config.js usa WEB_BASE_URL para isso).
const { execSync } = require('child_process');

execSync('npx expo export --platform web --output-dir web/app', {
  stdio: 'inherit',
  env: { ...process.env, WEB_BASE_URL: '/App-do-pentecostal/web/app' },
});