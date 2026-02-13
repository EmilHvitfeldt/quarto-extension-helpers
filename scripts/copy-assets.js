/**
 * Cross-platform script to copy specs and data files to the output directory.
 * Replaces Unix-only `mkdir -p && cp` commands for Windows compatibility.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

/**
 * Ensure a directory exists, creating it recursively if needed
 */
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Copy all files matching a pattern from src to dest
 */
function copyFiles(srcDir, destDir, extension) {
  ensureDir(destDir);

  const files = fs.readdirSync(srcDir);
  for (const file of files) {
    if (file.endsWith(extension)) {
      const srcPath = path.join(srcDir, file);
      const destPath = path.join(destDir, file);
      fs.copyFileSync(srcPath, destPath);
      console.log(`Copied: ${file}`);
    }
  }
}

// Copy spec YAML files
const specsSource = path.join(ROOT, 'src', 'specs');
const specsDest = path.join(ROOT, 'out', 'specs');
console.log('Copying spec files...');
copyFiles(specsSource, specsDest, '.yaml');

// Copy data JSON files
const dataSource = path.join(ROOT, 'data');
const dataDest = path.join(ROOT, 'out', 'data');
console.log('Copying data files...');
copyFiles(dataSource, dataDest, '.json');

console.log('Done!');
