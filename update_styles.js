const fs = require('fs');
const path = './app/(tabs)/index.tsx';
let content = fs.readFileSync(path, 'utf8');

// Replace hex codes
content = content.replace(/#F8FAFC/gi, '#f4f8fc');
content = content.replace(/#0F4C75/gi, '#0d2137');
content = content.replace(/#3282B8/gi, '#1e6fa8');
content = content.replace(/#1B262C/gi, '#0d2137');

// For #BBE1FA, it's used as border color, icon color, and placeholder color.
// We'll replace it generally with #e8f2f9 (ice) for borders, but fix icons and placeholders to be #1ab8e8 or #b0c8dc
content = content.replace(/borderColor:\s*'#BBE1FA'/gi, "borderColor: '#e8f2f9'");
content = content.replace(/color:\s*'#BBE1FA'/gi, "color: '#1ab8e8'");
content = content.replace(/color="#BBE1FA"/gi, 'color="#1ab8e8"');
content = content.replace(/placeholderTextColor="#BBE1FA"/gi, 'placeholderTextColor="#b0c8dc"');
content = content.replace(/backgroundColor:\s*'#BBE1FA'/gi, "backgroundColor: '#1ab8e8'");

fs.writeFileSync(path, content, 'utf8');
console.log('Styles updated.');
