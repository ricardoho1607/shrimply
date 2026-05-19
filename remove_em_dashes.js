const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory) {
      walkDir(dirPath, callback);
    } else {
      if (dirPath.endsWith('.tsx') || dirPath.endsWith('.ts') || dirPath.endsWith('.html')) {
        callback(dirPath);
      }
    }
  });
}

walkDir('./web/src/app', function(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  if (content.includes('—')) {
    // Replacing em dash with a hyphen or colon depending on context is tricky automatically, 
    // but the user just said "remove all the em dashes". 
    // Usually replacing with a hyphen or colon is better than just deleting.
    // Given the user request, I'll replace with a comma or hyphen where it makes sense, 
    // or a colon. Let's try replacing with a standard hyphen for now as it's the safest 'removal' 
    // that preserves sentence structure. Actually, I'll replace with a colon or comma or just delete 
    // depending on whitespace.
    
    // Safer: Replace " — " with ", " or ": " or " - ".
    // Let's go with " - " (hyphen with spaces) or just ":" if it's introducing a list.
    // For now, I'll replace with a simple hyphen '-' to fulfill the request while keeping it readable.
    let newContent = content.replace(/—/g, '-');
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log(`Updated: ${filePath}`);
  }
});
