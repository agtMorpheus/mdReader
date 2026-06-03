const fs = require('fs');
const path = require('path');

const inputHtml = path.join(__dirname, 'index.html');
const outputDir = path.join(__dirname, 'dist');
const outputHtml = path.join(outputDir, 'index.html');

console.log('Starting Monoblock Builder...');

try {
  // Read source HTML
  let htmlContent = fs.readFileSync(inputHtml, 'utf8');

  // 1. Inline CSS stylesheets
  // Match: <link rel="stylesheet" href="css/..." [media="print"]>
  const styleRegex = /<link\s+rel="stylesheet"\s+href="([^"]+)"(?:\s+media="([^"]+)")?\s*\/?>/g;
  
  htmlContent = htmlContent.replace(styleRegex, (match, href, media) => {
    // Only inline local css files
    if (href.startsWith('css/')) {
      const filePath = path.join(__dirname, href);
      if (fs.existsSync(filePath)) {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const mediaAttr = media ? ` media="${media}"` : '';
        console.log(`Inlining CSS: ${href}`);
        return `<style${mediaAttr}>\n/* Inlined ${href} */\n${fileContent}\n</style>`;
      } else {
        console.warn(`Warning: CSS file not found: ${filePath}`);
      }
    }
    return match; // Leave external CDNs untouched
  });

  // 2. Inline JavaScript
  // Match: <script src="js/..."></script>
  const scriptRegex = /<script\s+src="([^"]+)"><\/script>/g;
  
  htmlContent = htmlContent.replace(scriptRegex, (match, src) => {
    // Only inline local js files
    if (src.startsWith('js/')) {
      const filePath = path.join(__dirname, src);
      if (fs.existsSync(filePath)) {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        console.log(`Inlining JS: ${src}`);
        return `<script>\n/* Inlined ${src} */\n${fileContent}\n</script>`;
      } else {
        console.warn(`Warning: JS file not found: ${filePath}`);
      }
    }
    return match; // Leave external CDNs untouched
  });

  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Write final monoblock HTML
  fs.writeFileSync(outputHtml, htmlContent, 'utf8');
  console.log(`\nSuccess! Monoblock HTML built at: dist/index.html`);
  
  const stats = fs.statSync(outputHtml);
  console.log(`Final bundle size: ${(stats.size / 1024).toFixed(2)} KB`);

} catch (err) {
  console.error('Build failed:', err);
  process.exit(1);
}
