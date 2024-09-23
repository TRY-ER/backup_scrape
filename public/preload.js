const { contextBridge, ipcRenderer } = require('electron');
const xlsx = require('xlsx');
const { readdirSync,
    readFileSync,
    writeFileSync,
    existsSync,
    mkdirSync,
    rmdirSync,
    unlinkSync } = require('fs');
const path = require('path');
const crypto = require('crypto');
const Papa = require('papaparse');

BASE_FILE_PATH = path.join("/home/kalki/free_lance/CR_LLC/email_extractor/storage", "UserData")

contextBridge.exposeInMainWorld('fileSystem', {
    // Method to read a file synchronously
    readCheckpoint: (job_id) => {
        try {
            const data = readFileSync(path.join(BASE_FILE_PATH, "JobDetails/Checkpoints", job_id + ".json"), 'utf-8');
            return { success: true, data: JSON.parse(data) };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    // Method to write to a file synchronously
    writeCheckpoint: (jobId, content) => {
        try {
            const contentString = JSON.stringify(content);
            filePath = `${jobId}.json`;
            writeFileSync(path.join(BASE_FILE_PATH, "JobDetails/Checkpoints", filePath), contentString, 'utf-8');
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    loadAllCheckpoints: (Dirpath = path.join(BASE_FILE_PATH, "JobDetails/Checkpoints")) => {
        try {
            const files = readdirSync(Dirpath);
            const checkpoints = [];

            files.forEach((file) => {
                const filePath = path.join(Dirpath, file);
                const content = readFileSync(filePath, 'utf-8');

                checkpoints.push({
                    filename: file,
                    content: JSON.parse(content) // Assuming the content is JSON
                });
            });

            return { success: true, checkpoints: checkpoints };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },



    // Method to check if a file exists
    fileExists: (filePath) => {
        try {
            return existsSync(path.join([BASE_FILE_PATH, filePath]));
        } catch (error) {
            return false;
        }
    },

    // Method to check if a directory exists
    directoryExists: (dirPath) => {
        try {
            return existsSync(path.join([BASE_FILE_PATH, dirPath]));
        } catch (error) {
            return false;
        }
    },

    // Method to create a directory if it doesn't exist
    createDirectory: (dirPath) => {
        try {
            if (!existsSync(path.join(BASE_FILE_PATH, dirPath))) {
                mkdirSync(path.join([BASE_FILE_PATH, dirPath]), { recursive: true });
            }
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },



    // Save csv files
    saveCsvFile: (filePath, content) => {
        try {
            writeFileSync(path.join(BASE_FILE_PATH, filePath), content, 'utf-8');
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    deleteJob: (jobId) => {
        try {
            const jobPath = path.join(BASE_FILE_PATH, `JobDetails/DataRepo/${jobId}`)
            if (existsSync(jobPath)) {
                readdirSync(jobPath).forEach((file) => {
                    const filePath = path.join(jobPath, file);
                    unlinkSync(filePath);
                });
                rmdirSync(jobPath);
            }
            const checkpointPath = path.join(BASE_FILE_PATH, `JobDetails/Checkpoints/${jobId}.json`)
            const masterFilePath = path.join(BASE_FILE_PATH, `JobDetails/DataRepo/masters/${jobId}`)
            if (existsSync(checkpointPath)) {
                unlinkSync(checkpointPath);
            }
            if (existsSync(masterFilePath)) {
                readdirSync(masterFilePath).forEach((file) => {
                    const filePath = path.join(masterFilePath, file);
                    unlinkSync(filePath);
                });
                rmdirSync(masterFilePath);
            }
            return { success: true };
        }
        catch (e) {
            return { success: false, error: e.message };
        }
    },

    // splitAndSaveFile: (filePath, jobId, batchSize) => {
    //     try {
    //         const ext = path.extname(filePath).toLowerCase();
    //         let rows;

    //         if (ext === '.xlsx' || ext === '.xls') {
    //             // Parse XLSX file
    //             const workbook = xlsx.readFile(filePath);
    //             const sheetName = workbook.SheetNames[0];
    //             const worksheet = workbook.Sheets[sheetName];
    //             rows = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
    //         } else if (ext === '.csv') {
    //             // Parse CSV file
    //             const data = readFileSync(filePath, 'utf-8');
    //             const parsedData = Papa.parse(data, { header: true });
    //             rows = parsedData.data;
    //         } else {
    //             return { success: false, error: "Unsupported file type" };
    //         }

    //         const save_path = path.join(BASE_FILE_PATH, `JobDetails/DataRepo/${jobId}`);

    //         if (!existsSync(save_path)) {
    //             mkdirSync(save_path, { recursive: true });
    //         }

    //         // Split rows into batches
    //         const batches = [];
    //         for (let i = 0; i < rows.length; i += batchSize) {
    //             const batch = rows.slice(i, i + batchSize);
    //             batches.push(batch);
    //         }

    //         // Save each batch as a separate file
    //         batches.forEach((batch, index) => {
    //             const batchFileName = `batch_${index + 1}.csv`;
    //             const batchFilePath = path.join(save_path, batchFileName);
    //             const csvContent = Papa.unparse(batch);
    //             writeFileSync(batchFilePath, csvContent);
    //         });

    //         return { success: true, message: `${batches.length} files saved to ${save_path}` };
    //     } catch (error) {
    //         return { success: false, error: error.message };
    //     }
    // },

    splitAndSaveFile: (filePath, jobId, batchSize) => {
        try {
            const ext = path.extname(filePath).toLowerCase();
            let rows;

            if (ext === '.xlsx' || ext === '.xls') {
                // Parse XLSX file
                const workbook = xlsx.readFile(filePath);
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                rows = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
            } else if (ext === '.csv') {
                // Parse CSV file
                const data = readFileSync(filePath, 'utf-8');
                const parsedData = Papa.parse(data, { header: false }); // Parse without headers
                rows = parsedData.data;
            } else {
                return { success: false, error: "Unsupported file type" };
            }

            if (rows.length === 0) {
                return { success: false, error: "Empty file" };
            }

            const header = rows[0]; // Extract the header row
            console.log("headers>>", header)

            // Check if "websites" header exists
            if (!rows[0].includes('Websites')) {
                return { success: false, error: '"websites" header not found in file' };
            }

            const save_path = path.join(BASE_FILE_PATH, `JobDetails/DataRepo/${jobId}`);

            if (!existsSync(save_path)) {
                mkdirSync(save_path, { recursive: true });
            }

            // Split rows into batches
            const batches = [];
            counter = 0;
            const checkpoint = []
            for (let i = 1; i < rows.length; i += batchSize) { // Start slicing from row 1 to skip the header
                const batch = rows.slice(i, i + batchSize);
                batches.push([header, ...batch]); // Add the header to each batch
                if (i + batchSize >= rows.length) {
                    last_index = rows.length - 1
                }
                else {
                    last_index = i + batchSize - 1
                }
                checkpoint.push({
                    batch: counter,
                    filename: `batch_${counter + 1}.csv`,
                    range: [i - 1, last_index],
                    state: "init",
                    split: null,

                })
                counter = counter + 1;
            }
            // Save each batch as a separate file
            batches.forEach((batch, index) => {
                const batchFileName = `batch_${index + 1}.csv`;
                const batchFilePath = path.join(save_path, batchFileName);
                const csvContent = Papa.unparse(batch);
                writeFileSync(batchFilePath, csvContent);

            });

            return { success: true, message: `${batches.length} files saved to ${save_path}`, data: checkpoint };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },


    // readCSVFile: (filePath) => {
    //     try {
    //         const data = readFileSync(filePath, 'utf-8');
    //         const parsedData = Papa.parse(data, { header: true });

    //         mod_data = [];

    //         if (!parsedData.meta.fields.includes("Websites")) {
    //             return { success: false, error: 'HeaderError' };
    //         }

    //         parsedData.data.forEach((row) => {
    //             // Add the required headers/columns to each row object with default values
    //             const enrichedRow = {
    //                 ...row,
    //                 "Primary Email": row["Primary Email"] || '',
    //                 "Secondary Email": row["Secondary Email"] || '',
    //                 "Contact URL": row["Contact URL"] || '',
    //                 "Facebook URL": row["Facebook URL"] || '',
    //                 "Scrapped": row["Scrapped"] || false,
    //             };

    //             mod_data.push(enrichedRow);
    //         });

    //         return { success: true, data: mod_data };
    //     } catch (error) {
    //         return { success: false, error: error.message };
    //     }
    // },

    readCSVFile : (filePath) => {
        try {
            const extension = filePath.split('.').pop().toLowerCase();
            let parsedData = [];

            if (extension === 'csv') {
                // Read and parse CSV file
                const data = readFileSync(filePath, 'utf-8');
                const csvData = Papa.parse(data, { header: false }); // No header option

                // Extract the first column including the first row as data and filter out empty values
                parsedData = csvData.data.map(row => row[0]).filter(value => value !== '');
            } else if (extension === 'xlsx') {
                // Read and parse XLSX file
                const workbook = xlsx.readFile(filePath);
                const sheetName = workbook.SheetNames[0];
                const sheet = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 }); // No header

                // Extract the first column including the first row as data and filter out empty values
                parsedData = sheet.map(row => row[0]).filter(value => value !== '');
            } else {
                return { success: false, error: 'Unsupported file format' };
            }

            return { success: true, data: parsedData };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },


    writeCSVFile: (job_id, batchNum, CSVContent) => {
        try {
            // Determine the file name and path for the batch CSV file
            const fileName = `batch_${batchNum}.csv`;
            const filePath = path.join(BASE_FILE_PATH, `JobDetails/DataRepo/${job_id}`, fileName);

            // Convert the CSV content (array of objects) to CSV format using Papa.unparse
            const csvData = Papa.unparse(CSVContent);

            console.log("csv data parsed >>", csvData)

            // Write the CSV content to the file
            writeFileSync(filePath, csvData, 'utf-8');

            return { success: true, message: `CSV file for batch ${batchNum} saved successfully.` };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    exportFile: async (mode, content) => {
        try {
            return await ipcRenderer.invoke('export-file-dialog', mode, content);
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    mergeCSVFiles: (jobId) => {
        try {
            // Load checkpoints to find batch file paths
            const checkpointFilePath = path.join(BASE_FILE_PATH, `JobDetails/Checkpoints`, `${jobId}.json`);
            const masterFolderPath = path.join(BASE_FILE_PATH, `JobDetails/DataRepo/masters/${jobId}`)
            if (!existsSync(checkpointFilePath)) {
                return { success: false, error: 'Checkpoint file not found' };
            }

            const checkpointData = readFileSync(checkpointFilePath, 'utf-8');
            const checkpoints = JSON.parse(checkpointData)["last_checkpoint"];

            console.log("Recieved Checkpoint >>", checkpoints)

            let allRows = [];
            let headersSet = false;
            let headers = [];

            checkpoints.forEach(checkpoint => {
                const batchFileName = checkpoint.filename;
                const batchFilePath = path.join(BASE_FILE_PATH, `JobDetails/DataRepo/${jobId}`, batchFileName);

                if (existsSync(batchFilePath)) {
                    const fileContent = readFileSync(batchFilePath, 'utf-8');
                    const parsedData = Papa.parse(fileContent, { header: true });

                    if (!headersSet) {
                        headers = parsedData.meta.fields; // Extract headers from the first file
                        headersSet = true;
                    }

                    allRows = allRows.concat(parsedData.data); // Merge rows
                }
            });

            if (allRows.length === 0) {
                return { success: false, error: 'No data to merge' };
            }

            // Ensure the master folder exists
            if (!existsSync(masterFolderPath)) {
                mkdirSync(masterFolderPath, { recursive: true });
            }

            // Write merged data to the master CSV file
            const masterFilePath = path.join(masterFolderPath, `${jobId}_master.csv`);
            const csvContent = Papa.unparse(allRows, { header: true, columns: headers });
            writeFileSync(masterFilePath, csvContent, 'utf-8');

            return { success: true, message: `Master CSV file created at ${masterFilePath}` };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    getBatchFile: (jobId, batchNum) => {
        try {
            fileName = `batch_${batchNum}.csv`;
            const filePath = path.join(BASE_FILE_PATH, `JobDetails/DataRepo/${jobId}`, fileName);
            const data = readFileSync(filePath, 'utf-8');
            const parsedData = Papa.parse(data, { header: true });

            // Assuming the file content is properly parsed and includes the "websites" header
            if (!parsedData.meta.fields.includes('Websites')) {
                throw new Error(`"websites" header not found in file: ${fileName}`);
            }

            mod_data = [];

            parsedData.data.forEach((row) => {
                // Add the required headers/columns to each row object with default values
                const enrichedRow = {
                    ...row,
                    "Primary Email": row["Primary Email"] || '',
                    "Secondary Email": row["Secondary Email"] || '',
                    "Contact URL": row["Contact URL"] || '',
                    "Facebook URL": row["Facebook URL"] || '',
                    "Scrapped": row["Scrapped"] || false,
                };

                mod_data.push(enrichedRow);
            });
            return { success: true, data: mod_data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    getBatchFiles: (jobId) => {
        try {
            const batchFiles = readdirSync(path.join(BASE_FILE_PATH, `JobDetails/DataRepo/${jobId}`));
            const batches = [];

            batchFiles.forEach((file, index) => {
                const filePath = path.join(BASE_FILE_PATH, `JobDetails/DataRepo/${jobId}`, file);
                const data = readFileSync(filePath, 'utf-8');
                const parsedData = Papa.parse(data, { header: true });

                // Assuming the file content is properly parsed and includes the "websites" header
                if (!parsedData.meta.fields.includes('Websites')) {
                    throw new Error(`"websites" header not found in file: ${file}`);
                }

                mod_data = [];

                parsedData.data.forEach((row) => {
                    // Add the required headers/columns to each row object with default values
                    const enrichedRow = {
                        ...row,
                        "Primary Email": row["Primary Email"] || '',
                        "Secondary Email": row["Secondary Email"] || '',
                        "Contact URL": row["Contact URL"] || '',
                        "Facebook URL": row["Facebook URL"] || '',
                        "Scrapped": row["Scrapped"] || false,
                    };

                    mod_data.push(enrichedRow);
                });

                batches.push({
                    batch: index + 1,
                    data: mod_data,
                })

            });

            return { success: true, batches: batches };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },


    // getBatchFiles: (jobId) => {
    //     try {
    //         const batchFiles = readdirSync(path.join(BASE_FILE_PATH, `JobDetails/DataRepo/${jobId}`));
    //         const batches = [];
    //         batchFiles.forEach((file, index) => {

    //         });
    //     } catch (error) {
    //         return { success: false, error: error.message };
    //     }
    // },

    // Expose path utilities
    pathJoin: (...paths) => path.join(...paths),
    pathResolve: (...paths) => path.resolve(...paths),
});