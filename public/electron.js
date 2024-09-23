const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

const {
  writeFileSync
} = require('fs');
const xlsx = require('xlsx');
const Papa = require('papaparse');
const { start } = require('repl');


ipcMain.handle('export-file-dialog', async (event, mode, content) => {
  try {
    const csvData = Papa.unparse(content);
    var filePath = null;
    if (mode === "csv") {
      filePath = dialog.showSaveDialogSync({
        title: 'Save File',
        defaultPath: `master.csv`,
        filters: [
          { name: 'CSV File', extensions: ['csv'] },
        ]
      });
    }
    else if (mode === "xlsx") {
      filePath = dialog.showSaveDialogSync({
        title: 'Save File',
        defaultPath: `master.xlsx`,
        filters: [
          { name: 'Excel File', extensions: ['xlsx'] }
        ]
      });
    }

    if (!filePath) {
      return { success: false, error: 'Save operation was cancelled.' };
    }

    const fileExtension = filePath.split('.').pop().toLowerCase();

    if (fileExtension === 'csv') {
      writeFileSync(filePath, csvData, 'utf-8');
    } else if (fileExtension === 'xlsx') {
      // Convert the CSV to XLSX
      const workbook = xlsx.utils.book_new();
      const worksheet = xlsx.utils.aoa_to_sheet(csvData.split('\n').map(row => row.split(',')));
      xlsx.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
      xlsx.writeFile(workbook, filePath);
    } else {
      return { success: false, error: 'Unsupported file format' };
    }

    return { success: true, path: filePath };
  } catch (error) {
    return { success: false, error: error.message };
  }
});


let fastAPIServer;

// Function to start FastAPI backend
function startFastAPIServer() {
    const basePath = app.isPackaged ? path.join(process.resourcesPath, 'backend') : path.join(__dirname, 'backend');

    // Path to your virtual environment's python executable or system python
    const pythonPath = path.join(basePath, 'scrape_env/bin/python3.12'); // Replace this with the correct path
    const fastAPIPath = path.join(basePath, 'serve/main.py'); // Path to your FastAPI app

    // Start FastAPI server using child_process.spawn
    fastAPIServer = spawn(pythonPath, [fastAPIPath]);
    // Listen for FastAPI server errors (optional)
    fastAPIServer.stderr.on('data', (data) => {
        console.error(`FastAPI stderr: ${data}`);
    });

    // Log FastAPI server output (optional)
    fastAPIServer.stdout.on('data', (data) => {
        console.log(`FastAPI stdout: ${data}`);
    });
}

// Function to stop FastAPI backend
function stopFastAPIServer() {
    if (fastAPIServer) {
        fastAPIServer.kill(); // Kills the FastAPI process
    }
}

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1920,
    height: 1080,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'), // Optional
      contextIsolation: true,
      nodeIntegration: true,
    },
  });

  mainWindow.loadURL(
    `file://${path.join(__dirname, '../build/index.html')}`
  );
}

app.on('before-quit', () => {
    stopFastAPIServer(); // Stop FastAPI server before quitting Electron
});

app.whenReady().then(() => {
    startFastAPIServer();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
