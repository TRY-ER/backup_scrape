const { spawn, exec } = require('child_process');
const path = require('path');

const backendPath = path.join(__dirname, '../public/backend');
const dockerImageName = 'backend_image_6993';  // Name of the Docker image

function checkDockerImageExists(imageName, callback) {
    exec(`docker images -q ${imageName}`, (err, stdout) => {
        if (err) {
            console.error(`Error checking Docker image: ${err.message}`);
            callback(false);
            return;
        }
        // If the output is not empty, the image exists
        if (stdout.trim()) {
            callback(true);
        } else {
            callback(false);
        }
    });
}

function buildDockerImage() {
    console.log("Building Docker image...");

    const dockerBuild = spawn('docker', ['build', '-t', dockerImageName, backendPath]);

    dockerBuild.stdout.on('data', (data) => {
        console.log(`Docker build stdout: ${data}`);
    });

    dockerBuild.stderr.on('data', (data) => {
        console.error(`Docker build stderr: ${data}`);
    });

    dockerBuild.on('close', (code) => {
        if (code === 0) {
            console.log('Docker image built successfully!');
        } else {
            console.error(`Docker build process exited with code ${code}`);
        }
    });
}

function buildImageIfNotExists() {
    checkDockerImageExists(dockerImageName, (exists) => {
        if (exists) {
            console.log(`Docker image "${dockerImageName}" already exists. Skipping build.`);
        } else {
            console.log(`Docker image "${dockerImageName}" not found. Building the image...`);
            buildDockerImage();
        }
    });
}

// Start the Docker build process if the image doesn't exist
buildImageIfNotExists();
