// Gera o app web para iPhone em web/app, publicado pelo GitHub Pages no subcaminho
// /App-do-pentecostal/web/app (o app.config.js usa WEB_BASE_URL para isso).
// Depois do export, acrescenta o service worker que faz o app abrir sem internet.
const { execSync } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const OUT_DIR = path.join(__dirname, '..', 'web', 'app');

execSync('npx expo export --platform web --output-dir web/app', {
  stdio: 'inherit',
  cwd: path.join(__dirname, '..'),
  env: { ...process.env, WEB_BASE_URL: '/App-do-pentecostal/web/app' },
});

function listFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? listFiles(full) : [full];
  });
}

// O que o service worker guarda na instalação. Ficam de fora: o banco da Bíblia (o
// SQLite já guarda uma cópia), arquivos internos do export e as fontes de ícones que
// o app não usa (ele só usa Ionicons).
const precache = listFiles(OUT_DIR)
  .map((file) => path.relative(OUT_DIR, file).split(path.sep).join('/'))
  .filter((file) => !file.endsWith('.db'))
  .filter((file) => !['index.html', 'metadata.json', 'sw.js'].includes(file))
  .filter((file) => !file.endsWith('.ttf') || file.includes('/Ionicons.'))
  .sort();
precache.unshift('./');

const indexPath = path.join(OUT_DIR, 'index.html');
let indexHtml = fs.readFileSync(indexPath, 'utf8');

// A versão muda sempre que algum arquivo muda (os nomes trazem o conteúdo, e a página
// entra inteira), e isso faz o iPhone baixar o app novo.
const version = crypto
  .createHash('sha256')
  .update(precache.join('\n'))
  .update(indexHtml)
  .digest('hex')
  .slice(0, 12);

const template = fs.readFileSync(path.join(__dirname, 'pwa-sw.js'), 'utf8');
fs.writeFileSync(
  path.join(OUT_DIR, 'sw.js'),
  template
    .replace("const VERSION = '__VERSION__';", `const VERSION = '${version}';`)
    .replace('const PRECACHE = __PRECACHE__;', `const PRECACHE = ${JSON.stringify(precache, null, 2)};`)
);

// O registro fica só neste build: o app do computador já tem tudo no instalador.
const register = `<script>
      if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => navigator.serviceWorker.register('sw.js'));
      }
    </script>
  </head>`;
indexHtml = indexHtml.replace('</head>', register);
fs.writeFileSync(indexPath, indexHtml);

console.log(`Service worker ${version}: ${precache.length} arquivos para usar sem internet.`);
