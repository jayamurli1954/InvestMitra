const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let backendProcess;

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  // win.webContents.openDevTools(); // Open DevTools for debugging (commented out for clean app view)

  // Load the appropriate URL based on the environment
  const startUrl = process.env.NODE_ENV === 'development'
    ? 'http://localhost:3000'
    : `file://${path.join(__dirname, 'index.html')}`;
  console.log(`Electron loading URL: ${startUrl}`);

  const loadApp = () => {
    win.loadURL(startUrl).catch(err => {
      console.error(`Failed to load URL: ${startUrl}`, err);
      if (process.env.NODE_ENV === 'development' && err.code === 'ERR_CONNECTION_REFUSED') {
        console.log('Retrying to connect to React dev server...');
        setTimeout(loadApp, 1000); // Retry after 1 second
      }
    });
  };

  loadApp();
}

function startBackend() {
  // Path to the packaged backend executable
  const backendPath = path.join(app.getAppPath(), '../backend/server.exe');
  
  backendProcess = spawn(backendPath);

  backendProcess.stdout.on('data', (data) => {
    console.log(`Backend stdout: ${data}`);
  });

  backendProcess.stderr.on('data', (data) => {
    console.error(`Backend stderr: ${data}`);
  });

  backendProcess.on('close', (code) => {
    console.log(`Backend process exited with code ${code}`);
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
