
const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

async function GetFileSHA(path) {
    return new Promise((resolve, reject) => {
        const hash = crypto.createHash('sha512');
        const rs = fs.createReadStream(path);
        rs.on('error', reject);
        rs.on('data', chunk => hash.update(chunk));
        rs.on('end', () => resolve(hash.digest('hex')));
    })
}

function ReadJson(path) {
    if (!fs.existsSync(path)) return {}
    return JSON.parse(fs.readFileSync(path, 'utf8'))
}

function FindAllFiles(dir){
    const files = fs.readdirSync(dir, { withFileTypes: true });
    let allFiles = [];

    for (const file of files) {
      const fullPath = path.join(dir, file.name);
      if (file.isDirectory()) {
        allFiles = allFiles.concat(FindAllFiles(fullPath));
      } else {
        allFiles.push(`./${fullPath.replaceAll("\\", "/")}`);
      }
    }

    return allFiles;
}

function GetFilesInDirectory(directoryPath) {
  try {
    return fs.readdirSync(directoryPath);
  } catch (err) {
    console.error(err);
  }
}

module.exports = {GetFileSHA, ReadJson, FindAllFiles, GetFilesInDirectory}