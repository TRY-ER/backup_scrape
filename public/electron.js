const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const axios = require('axios');
let dockerContainer;
const BASE_API_URL = 'http://localhost:6993';

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



// function checkIfServerIsRunning() {
//     return axios.get(`${BASE_API_URL}/stream_data/ping`)
//         .then((res) => {
//             if (res.data.message === 'end_point available') {
//                 console.log("FastAPI server is already running.");
//                 return true;
//             }
//             return false;
//         })
//         .catch((err) => {
//             console.log("FastAPI server is not running.");
//             return false;
//         });
// }

// async function startFastAPIServer() {
//     const dockerImageName = "backend_image";  // Replace with your actual Docker image name
//     const dockerContainerName = "scrapping-backend-6993";      // Name of the container

//     const isRunning = await checkIfServerIsRunning();

//     if (!isRunning) {
//         console.log("Starting FastAPI server...");
//         dockerContainer = spawn('docker', [
//             'run',
//             '--name', dockerContainerName,
//             '-p', '6993:6993', // Mapping the internal FastAPI port to external port
//             dockerImageName
//         ]);

//         // Log output and errors from Docker
//         dockerContainer.stdout.on('data', (data) => {
//             console.log(`Docker stdout: ${data}`);
//         });

//         dockerContainer.stderr.on('data', (data) => {
//             console.error(`Docker stderr: ${data}`);
//         });

//         dockerContainer.on('close', (code) => {
//             console.log(`Docker process exited with code ${code}`);
//         });
//     } else {
//         console.log("FastAPI server is already running, no need to start.");
//     }
// }

// function stopFastAPIServer() {
//     const dockerContainerName = "scrapping-backend-6993";  // Make sure this matches the container name

//     const isRunning = checkIfServerIsRunning().then(isRunning => {
//         if (isRunning) {
//             console.log("Stopping FastAPI server...");
//             // Stop the FastAPI server Docker container
//             const dockerStop = spawn('docker', ['stop', dockerContainerName]);

//             dockerStop.stdout.on('data', (data) => {
//                 console.log(`Docker stop stdout: ${data}`);
//             });

//             dockerStop.stderr.on('data', (data) => {
//                 console.error(`Docker stop stderr: ${data}`);
//             });

//             dockerStop.on('close', (code) => {
//                 console.log(`Docker stop process exited with code ${code}`);
//             });

//             // Optionally remove the container after stopping
//             dockerStop.on('close', () => {
//                 const dockerRemove = spawn('docker', ['rm', dockerContainerName]);
//                 dockerRemove.stdout.on('data', (data) => {
//                     console.log(`Docker remove stdout: ${data}`);
//                 });
//                 dockerRemove.stderr.on('data', (data) => {
//                     console.error(`Docker remove stderr: ${data}`);
//                 });
//                 dockerRemove.on('close', (code) => {
//                     console.log(`Docker remove process exited with code ${code}`);
//                 });
//             });
//         } else {
//             console.log("FastAPI server is not running, no need to stop.");
//         }
//     });
// }

// Function to start FastAPI backend
// function startFastAPIServer() {
//     const basePath = app.isPackaged ? path.join(process.resourcesPath, 'backend') : path.join(__dirname, 'backend');

//     // Path to your virtual environment's python executable or system python
//     const pythonPath = path.join(basePath, 'scrape_env/bin/python3.12'); // Replace this with the correct path
//     const fastAPIPath = path.join(basePath, 'serve/main.py'); // Path to your FastAPI app

//     // Start FastAPI server using child_process.spawn
//     fastAPIServer = spawn(pythonPath, [fastAPIPath]);
//     // Listen for FastAPI server errors (optional)
//     fastAPIServer.stderr.on('data', (data) => {
//         console.error(`FastAPI stderr: ${data}`);
//     });

//     // Log FastAPI server output (optional)
//     fastAPIServer.stdout.on('data', (data) => {
//         console.log(`FastAPI stdout: ${data}`);
//     });
// }

// Function to stop FastAPI backend
// function stopFastAPIServer() {
//     if (fastAPIServer) {
//         fastAPIServer.kill(); // Kills the FastAPI process
//     }
// }

async function checkIfServerIsRunning() {
  try {
    const res = await axios.get(`${BASE_API_URL}/stream_data/ping`);
    if (res.data.message === 'end_point available') {
      console.log('FastAPI server is already running.');
      return true;
    }
  } catch (err) {
    console.log('FastAPI server is not running.');
    return false;
  }
  return false;
}

// Start FastAPI backend Docker container
async function startFastAPIServer() {
  const dockerImageName = 'backend_image_6993'; // Replace with your Docker image name
  const dockerContainerName = 'scrapping-backend-6993';

  const isRunning = await checkIfServerIsRunning();

  if (!isRunning) {
    console.log('Starting FastAPI server...');
    dockerContainer = spawn('docker', [
      'run',
      '--name', dockerContainerName,
      '-p', '6993:6993',
      dockerImageName,
    ]);

    dockerContainer.stdout.on('data', (data) => {
      console.log(`Docker stdout: ${data}`);
    });

    dockerContainer.stderr.on('data', (data) => {
      console.error(`Docker stderr: ${data}`);
    });

    dockerContainer.on('close', (code) => {
      console.log(`Docker process exited with code ${code}`);
    });
  } else {
    console.log('FastAPI server is already running.');
  }
}

// Stop FastAPI backend Docker container
async function stopFastAPIServer() {
  const dockerContainerName = 'scrapping-backend-6993';

  const isRunning = await checkIfServerIsRunning();
  if (isRunning) {
    console.log('Stopping FastAPI server...');
    return new Promise((resolve, reject) => {
      const dockerStop = spawn('docker', ['stop', dockerContainerName]);

      dockerStop.stdout.on('data', (data) => {
        console.log(`Docker stop stdout: ${data}`);
      });

      dockerStop.stderr.on('data', (data) => {
        console.error(`Docker stop stderr: ${data}`);
      });

      dockerStop.on('close', (code) => {
        console.log(`Docker stop process exited with code ${code}`);
        const dockerRemove = spawn('docker', ['rm', dockerContainerName]);

        dockerRemove.stdout.on('data', (data) => {
          console.log(`Docker remove stdout: ${data}`);
        });

        dockerRemove.stderr.on('data', (data) => {
          console.error(`Docker remove stderr: ${data}`);
        });

        dockerRemove.on('close', (code) => {
          console.log(`Docker remove process exited with code ${code}`);
          resolve();
        });
      });
    });
  } else {
    console.log('FastAPI server is not running, no need to stop.');
    return Promise.resolve();
  }
}

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1920,
    height: 1080,
    icon: path.join(__dirname, '../build/logo.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'), // Optional
      contextIsolation: true,
      nodeIntegration: true,
    },
  });

  mainWindow.loadURL(
    `file://${path.join(__dirname, '../build/index.html')}`
  );

  Menu.setApplicationMenu(null);
}

app.on('before-quit', async (event) => {
  console.log('Before quitting Electron...');

  app.removeAllListeners('before-quit');

  event.preventDefault(); // Prevents app from quitting immediately

  await stopFastAPIServer(); // Ensure FastAPI server is stopped

  console.log('FastAPI server stopped, now quitting...');
  app.quit(); // Quit the Electron app once server is stopped
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

// app.on('activate', () => {
//   if (BrowserWindow.getAllWindows().length === 0) {
//     createWindow();
//   }
// });
