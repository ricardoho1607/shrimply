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
  // Skip context, hooks, store, etc. if they don't contain styles, but it's safe to run regex on all .tsx
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;

  // Replace hex codes
  content = content.replace(/#F8FAFC/gi, '#f4f8fc');
  content = content.replace(/#0F4C75/gi, '#0d2137');
  content = content.replace(/#3282B8/gi, '#1e6fa8');
  content = content.replace(/#1B262C/gi, '#0d2137');

  // Fix BBE1FA specific uses
  content = content.replace(/borderColor:\s*'#BBE1FA'/gi, "borderColor: '#e8f2f9'");
  content = content.replace(/color:\s*'#BBE1FA'/gi, "color: '#1ab8e8'");
  content = content.replace(/color="#BBE1FA"/gi, 'color="#1ab8e8"');
  content = content.replace(/placeholderTextColor="#BBE1FA"/gi, 'placeholderTextColor="#b0c8dc"');
  content = content.replace(/backgroundColor:\s*'#BBE1FA'/gi, "backgroundColor: '#1ab8e8'");
  
  // Shadows (simple regex to catch generic grey shadows and replace with colored ones)
  // We won't blindly replace all shadows, just the main ones we know exist from the design system
  // Pond cards, floating buttons, etc. 
  content = content.replace(/shadowColor:\s*'#000'/gi, "shadowColor: '#1ab8e8'");
  content = content.replace(/shadowColor:\s*'#0d2137'/gi, "shadowColor: '#1e6fa8'");

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    modifiedFiles++;
    console.log(`Updated styles in: ${filePath}`);
  }
});

console.log(`Successfully updated ${modifiedFiles} files.`);
