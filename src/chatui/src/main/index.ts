import { app, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'

// Disable GPU acceleration for better compatibility
app.disableHardwareAcceleration()

let mainWindow: BrowserWindow | null = null

// Zotero health check configuration
const ZOTERO_HEALTH_PORT = 23119
const HEALTH_CHECK_INTERVAL = 5000
let healthCheckTimer: NodeJS.Timeout | null = null

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    minWidth: 600,
    minHeight: 400,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: join(__dirname, '../preload/index.js'),
    },
    title: 'Vibe Research',
    show: false,
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.on('closed', () => {
    mainWindow = null
    stopHealthCheck()
  })

  // Load renderer
  if (process.env.NODE_ENV === 'development') {
    const rendererPort = process.env.ELECTRON_RENDERER_PORT || 5173
    await mainWindow.loadURL(`http://localhost:${rendererPort}`)
    mainWindow.webContents.openDevTools()
  } else {
    await mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  // Start health check to detect Zotero shutdown
  startHealthCheck()
}

/**
 * Start periodic health check to Zotero plugin
 * If Zotero closes, Electron should also close
 */
function startHealthCheck() {
  if (healthCheckTimer) return

  healthCheckTimer = setInterval(async () => {
    try {
      const response = await fetch(`http://localhost:${ZOTERO_HEALTH_PORT}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(3000),
      })
      
      if (!response.ok) {
        console.log('[Vibe Research] Zotero health check failed, shutting down...')
        app.quit()
      }
    } catch (error) {
      console.log('[Vibe Research] Cannot reach Zotero, shutting down...')
      app.quit()
    }
  }, HEALTH_CHECK_INTERVAL)
}

function stopHealthCheck() {
  if (healthCheckTimer) {
    clearInterval(healthCheckTimer)
    healthCheckTimer = null
  }
}

// App lifecycle
app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  stopHealthCheck()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// IPC handlers
ipcMain.handle('ping', () => 'pong')
