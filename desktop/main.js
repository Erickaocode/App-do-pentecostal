const { app, BrowserWindow, Menu, shell, ipcMain, dialog } = require('electron');
const path = require('path');
const http = require('http');
const https = require('https');
const fs = require('fs');

const REPO = 'Erickaocode/App-do-pentecostal';
const RELEASES_URL = `https://api.github.com/repos/${REPO}/releases`;

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { 'User-Agent': 'app-do-pentecostal-desktop' } }, (res) => {
        if (res.statusCode && res.statusCode >= 400) {
          reject(new Error(`GitHub respondeu ${res.statusCode}`));
          res.resume();
          return;
        }
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(e);
          }
        });
      })
      .on('error', reject);
  });
}

function parseVersion(v) {
  return String(v)
    .split('.')
    .map((n) => parseInt(n, 10) || 0);
}

function isNewerVersion(a, b) {
  const pa = parseVersion(a);
  const pb = parseVersion(b);
  for (let i = 0; i < Math.max(pa.length, pb.length); i += 1) {
    const da = pa[i] || 0;
    const db = pb[i] || 0;
    if (da !== db) return da > db;
  }
  return false;
}

function pickAssetUrl(release) {
  const assets = release.assets || [];
  if (process.platform === 'win32') {
    const exe = assets.find((a) => a.name.toLowerCase().endsWith('.exe'));
    if (exe) return exe.browser_download_url;
  }
  if (process.platform === 'linux') {
    const pkg = assets.find((a) => a.name.toLowerCase().endsWith('.tar.gz'));
    if (pkg) return pkg.browser_download_url;
  }
  return release.html_url;
}

async function checkForUpdates() {
  const releases = await fetchJson(RELEASES_URL);
  const desktopReleases = releases
    .filter((r) => typeof r.tag_name === 'string' && /^desktop-v/.test(r.tag_name))
    .map((r) => ({ ...r, version: r.tag_name.replace('desktop-v', '') }))
    .sort((a, b) => (isNewerVersion(a.version, b.version) ? -1 : 1));

  const latest = desktopReleases[0];
  const currentVersion = app.getVersion();

  if (!latest) {
    return { hasUpdate: false, currentVersion };
  }

  return {
    hasUpdate: isNewerVersion(latest.version, currentVersion),
    currentVersion,
    latestVersion: latest.version,
    downloadUrl: pickAssetUrl(latest),
  };
}

async function handleUpdateCheckRequest() {
  try {
    const result = await checkForUpdates();
    if (result.hasUpdate) {
      const { response } = await dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: 'Atualização disponível',
        message: `Uma nova versão está disponível (v${result.latestVersion}). Você está usando a v${result.currentVersion}.`,
        buttons: ['Baixar agora', 'Agora não'],
        defaultId: 0,
        cancelId: 1,
      });
      if (response === 0 && result.downloadUrl) {
        shell.openExternal(result.downloadUrl);
      }
    } else {
      await dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: 'Tudo em dia',
        message: 'Você já está usando a versão mais recente do App do Pentecostal.',
      });
    }
    return result;
  } catch (error) {
    await dialog.showMessageBox(mainWindow, {
      type: 'error',
      title: 'Não foi possível verificar',
      message: 'Não deu para checar atualizações agora. Verifique sua conexão com a internet e tente novamente.',
    });
    return { hasUpdate: false, error: error.message };
  }
}

ipcMain.handle('check-for-updates', handleUpdateCheckRequest);

function injectUpdateButton() {
  if (!mainWindow) return;
  mainWindow.webContents
    .executeJavaScript(
      `(function() {
        if (document.getElementById('desktop-update-btn')) return;
        var btn = document.createElement('button');
        btn.id = 'desktop-update-btn';
        btn.title = 'Verificar atualizações';
        btn.textContent = '⟳';
        btn.style.cssText = 'position:fixed;bottom:70px;left:50%;transform:translateX(-50%);z-index:999999;width:34px;height:34px;line-height:34px;text-align:center;background:#7A4B2A;color:#fff;border:none;border-radius:50%;padding:0;font-size:16px;font-family:sans-serif;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,0.3);opacity:0.55;transition:opacity .15s;';
        btn.onmouseenter = function() { btn.style.opacity = '1'; };
        btn.onmouseleave = function() { btn.style.opacity = '0.55'; };
        btn.onclick = function() {
          if (btn.disabled) return;
          btn.disabled = true;
          var original = btn.textContent;
          btn.textContent = '…';
          window.desktopApp.checkForUpdates().finally(function() {
            btn.disabled = false;
            btn.textContent = original;
          });
        };
        document.body.appendChild(btn);
      })();`
    )
    .catch(() => {});
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.wasm': 'application/wasm',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.db': 'application/octet-stream',
};

function getWebRoot() {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'webapp')
    : path.join(__dirname, '..', 'web', 'webapp');
}

function startServer(root) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const requestPath = decodeURIComponent((req.url || '/').split('?')[0]);
      const resolvedRoot = path.resolve(root);
      let filePath = path.resolve(resolvedRoot, '.' + requestPath);

      if (!filePath.startsWith(resolvedRoot)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
      }

      fs.stat(filePath, (statErr, stats) => {
        if (!statErr && stats.isDirectory()) {
          filePath = path.join(filePath, 'index.html');
        }

        fs.readFile(filePath, (readErr, data) => {
          if (readErr) {
            fs.readFile(path.join(resolvedRoot, 'index.html'), (fallbackErr, indexData) => {
              if (fallbackErr) {
                res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
                res.end('Não encontrado');
                return;
              }
              res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
              res.end(indexData);
            });
            return;
          }

          const ext = path.extname(filePath).toLowerCase();
          res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
          res.end(data);
        });
      });
    });

    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

function buildMenu() {
  const isMac = process.platform === 'darwin';

  const template = [
    ...(isMac ? [{ role: 'appMenu' }] : []),
    {
      label: 'Exibir',
      submenu: [
        { role: 'reload', label: 'Recarregar' },
        { role: 'forceReload', label: 'Forçar recarregamento' },
        { type: 'separator' },
        { role: 'resetZoom', label: 'Restaurar zoom' },
        { role: 'zoomIn', label: 'Aumentar zoom' },
        { role: 'zoomOut', label: 'Diminuir zoom' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'Tela cheia' },
        { type: 'separator' },
        { role: 'toggleDevTools', label: 'Ferramentas do desenvolvedor' },
      ],
    },
    { role: 'windowMenu', label: 'Janela' },
    {
      label: 'Ajuda',
      submenu: [
        {
          label: 'Verificar atualizações',
          click: () => handleUpdateCheckRequest(),
        },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

let mainWindow = null;

async function createWindow() {
  const root = getWebRoot();
  const server = await startServer(root);
  const { port } = server.address();

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 960,
    minHeight: 640,
    title: 'App do Pentecostal',
    backgroundColor: '#E6F4FE',
    icon: path.join(__dirname, 'build', 'icon.png'),
    autoHideMenuBar: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.webContents.on('did-finish-load', injectUpdateButton);

  mainWindow.loadURL(`http://127.0.0.1:${port}/`);

  mainWindow.on('closed', () => {
    mainWindow = null;
    server.close();
  });
}

app.whenReady().then(() => {
  buildMenu();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
