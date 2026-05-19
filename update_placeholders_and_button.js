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

  // Change placeholder color from fog (#b0c8dc) to muted (#6b8aa0) for better readability
  content = content.replace(/placeholderTextColor="#b0c8dc"/gi, 'placeholderTextColor="#6b8aa0"');

  // Fix the floating button in index.tsx to match the rest of the app
  if (filePath.endsWith('index.tsx')) {
    content = content.replace(
      /floatingButton:\s*{\s*position:\s*'absolute',\s*bottom:\s*30,\s*right:\s*30,\s*backgroundColor:\s*'#1ab8e8',\s*\/\/\s*sky\s*accent\s*width:\s*56,\s*height:\s*56,\s*borderRadius:\s*28,\s*alignItems:\s*'center',\s*justifyContent:\s*'center',\s*shadowColor:\s*'#1ab8e8',\s*shadowOffset:\s*{\s*width:\s*0,\s*height:\s*8\s*},\s*shadowOpacity:\s*0\.28,\s*shadowRadius:\s*16,\s*elevation:\s*8\s*}/gi,
      "floatingButton: { position: 'absolute', bottom: 30, right: 30, backgroundColor: '#0d2137', width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', shadowColor: '#1ab8e8', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 }"
    );
    
    // Fallback if the regex above fails due to formatting differences
    content = content.replace(/backgroundColor:\s*'#1ab8e8',\s*\/\/\s*sky\s*accent/gi, "backgroundColor: '#0d2137',");
    // Change shadow values back
    content = content.replace(/shadowOffset:\s*{\s*width:\s*0,\s*height:\s*8\s*},\s*shadowOpacity:\s*0.28,\s*shadowRadius:\s*16/gi, "shadowOffset: { width: 0, height: 4 }, \n    shadowOpacity: 0.3, \n    shadowRadius: 8");
  }

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    modifiedFiles++;
    console.log(`Updated file: ${filePath}`);
  }
});

console.log(`Successfully updated ${modifiedFiles} files.`);
