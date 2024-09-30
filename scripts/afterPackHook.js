const { exec } = require('child_process');
const path = require('path');

const backendPath = path.join(__dirname, '../backend');
const dockerImageName = 'my-backend-image';

function checkDockerImageExists(imageName, callback) {
    exec(`docker images -q ${imageName}`, (err, stdout) => {
        if (err) {
            console.error(`Error checking Docker image: ${err.message}`);
            callback(false);
            return;
        }
        if (stdout.trim()) {
            callback(true);
        } else {
            callback(false);
        }
    });
}

function buildDockerImage() {
    console.log("Building Docker image...");
    exec(`docker build -t ${dockerImageName} ${backendPath}`, (err, stdout, stderr) => {
        if (err) {
            console.error(`Error building Docker image: ${stderr}`);
            return;
        }
        console.log(`Docker image built successfully! Output: ${stdout}`);
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

exports.default = async function (context) {
    buildImageIfNotExists();
};