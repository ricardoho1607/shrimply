const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory) {
      walkDir(dirPath, callback);
    } else {
      if (dirPath.endsWith('.tsx')) {
        callback(path.join(dir, f));
      }
    }
  });
}

let modifiedFiles = 0;

walkDir('./app', function(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;

  // Replace all variations of placeholder text color with the new readable muted color
  content = content.replace(/placeholderTextColor="[^"]+"/gi, 'placeholderTextColor="#6b8aa0"');

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    modifiedFiles++;
    console.log(`Updated placeholders in: ${filePath}`);
  }
});

console.log(`Successfully updated ${modifiedFiles} files.`);
