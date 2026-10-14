const { app, BrowserWindow, Menu, shell, nativeImage, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

app.setName('RoofMaster Pro');

let mainWindow = null;

function sendToRenderer(channel, data) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('app-action', channel, data);
  }
}

function createWindow() {
  const isMac = process.platform === 'darwin';
  const iconPath = path.join(__dirname, isMac ? 'icon.png' : 'icon.ico');
  const appIcon = nativeImage.createFromPath(iconPath);

  const windowOptions = {
    width: 1440,
    height: 920,
    minWidth: 1080,
    minHeight: 720,
    backgroundColor: '#07090e',
    title: 'RoofMaster Pro',
    icon: appIcon,
    autoHideMenuBar: !isMac,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      webgl: true,
      spellcheck: false,
    },
  };

  if (isMac) {
    windowOptions.titleBarStyle = 'hiddenInset';
    windowOptions.trafficLightPosition = { x: 16, y: 12 };
  }

  mainWindow = new BrowserWindow(windowOptions);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  if (!isMac) {
    mainWindow.setMenu(null);
  }

  if (isMac && app.dock) {
    app.dock.setIcon(appIcon);
  }

  // Load production dist or development URL
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  if (isDev && process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Open external links in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Setup Native macOS Application Menu
function setupMenu() {
  const isMac = process.platform === 'darwin';

  if (isMac) {
    app.setAboutPanelOptions({
      applicationName: 'RoofMaster Pro',
      applicationVersion: '1.0.0',
      version: '1.0.0',
      copyright: 'Copyright © 2026 PooriaR (RoofMaster Pro)',
      credits: 'Advanced 3D Roofing CAD & Structural Calculation Suite',
      authors: ['PooriaR'],
      website: 'https://github.com/pooriar/roofing',
    });
  }

  const template = [
    ...(isMac
      ? [
          {
            label: 'RoofMaster Pro',
            submenu: [
              { role: 'about', label: 'About RoofMaster Pro' },
              { type: 'separator' },
              {
                label: 'Preferences...',
                accelerator: 'CmdOrCtrl+,',
                click: () => sendToRenderer('open-preferences'),
              },
              { type: 'separator' },
              { role: 'services' },
              { type: 'separator' },
              { role: 'hide', label: 'Hide RoofMaster Pro' },
              { role: 'hideOthers' },
              { role: 'unhide' },
              { type: 'separator' },
              { role: 'quit', label: 'Quit RoofMaster Pro' },
            ],
          },
        ]
      : []),
    {
      label: 'File',
      submenu: [
        {
          label: 'New Project',
          accelerator: 'CmdOrCtrl+N',
          click: () => sendToRenderer('new-project'),
        },
        {
          label: 'Open Project...',
          accelerator: 'CmdOrCtrl+O',
          click: () => sendToRenderer('open-project'),
        },
        {
          label: 'Save Project',
          accelerator: 'CmdOrCtrl+S',
          click: () => sendToRenderer('save-project'),
        },
        {
          label: 'Save Project As...',
          accelerator: 'CmdOrCtrl+Shift+S',
          click: () => sendToRenderer('save-project-as'),
        },
        { type: 'separator' },
        {
          label: 'Export PDF / Print Report',
          accelerator: 'CmdOrCtrl+P',
          click: () => sendToRenderer('export-pdf'),
        },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        {
          label: '3D CAD Visualizer',
          accelerator: 'CmdOrCtrl+1',
          click: () => sendToRenderer('tab-3d'),
        },
        {
          label: '2D Architectural Blueprint',
          accelerator: 'CmdOrCtrl+2',
          click: () => sendToRenderer('tab-2d'),
        },
        {
          label: 'CAD Profile Extruder',
          accelerator: 'CmdOrCtrl+3',
          click: () => sendToRenderer('tab-cad'),
        },
        {
          label: 'Installation Guide',
          accelerator: 'CmdOrCtrl+4',
          click: () => sendToRenderer('tab-guide'),
        },
        {
          label: 'Material & Cost Report',
          accelerator: 'CmdOrCtrl+5',
          click: () => sendToRenderer('tab-report'),
        },
        { type: 'separator' },
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        ...(isMac
          ? [
              { type: 'separator' },
              { role: 'front' },
              { type: 'separator' },
              { role: 'window' },
            ]
          : [{ role: 'close' }]),
      ],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Installation & User Guide',
          click: () => sendToRenderer('tab-guide'),
        },
        {
          label: 'About RoofMaster Pro',
          click: () => sendToRenderer('open-about'),
        },
        { type: 'separator' },
        {
          label: 'View on GitHub',
          click: () => shell.openExternal('https://github.com/pooriar/roofing'),
        },
      ],
    },
  ];

  if (isMac) {
    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
  } else {
    Menu.setApplicationMenu(null);
  }
}

// IPC Handlers for Native macOS Open / Save sheets
ipcMain.handle('dialog:openFile', async () => {
  if (!mainWindow) return { success: false, canceled: true };
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Open RoofMaster Project',
    properties: ['openFile'],
    filters: [
      { name: 'RoofMaster Project (*.roof, *.json)', extensions: ['roof', 'json'] },
      { name: 'All Files (*.*)', extensions: ['*'] },
    ],
  });

  if (result.canceled || result.filePaths.length === 0) {
    return { success: false, canceled: true };
  }

  try {
    const content = fs.readFileSync(result.filePaths[0], 'utf-8');
    return {
      success: true,
      data: content,
      filename: path.basename(result.filePaths[0]),
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('dialog:saveFile', async (_event, { content, defaultName }) => {
  if (!mainWindow) return { success: false, canceled: true };
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Save RoofMaster Project',
    defaultPath: defaultName || 'roofmaster_project.roof',
    filters: [
      { name: 'RoofMaster Project (*.roof)', extensions: ['roof'] },
      { name: 'JSON Project (*.json)', extensions: ['json'] },
      { name: 'All Files (*.*)', extensions: ['*'] },
    ],
  });

  if (result.canceled || !result.filePath) {
    return { success: false, canceled: true };
  }

  try {
    fs.writeFileSync(result.filePath, content, 'utf-8');
    return { success: true, filePath: result.filePath };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Enforce single application instance
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    setupMenu();
    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
