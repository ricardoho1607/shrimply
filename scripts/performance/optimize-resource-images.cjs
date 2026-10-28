// Regenerate with: node scripts/performance/optimize-resource-images.cjs
// Keep original URLs for existing links and crawlers. Browsers use responsive WebP.
const fs = require('node:fs/promises');
const path = require('node:path');
const sharp = require('../../web/node_modules/sharp');
const root = path.resolve(__dirname, '../../web/public/resources');
(async () => {
  const out = path.join(root, 'optimized');
  await fs.mkdir(out, {recursive:true});
  const manifest = {};
  for (const name of (await fs.readdir(path.join(root, 'images'))).sort()) {
    if (!/\.(png|jpe?g)$/i.test(name)) continue;
    const input = path.join(root, 'images', name);
    const meta = await sharp(input).metadata();
    const widths = [...new Set([480,960,1600].map(w=>Math.min(w, meta.width)))];
    const variants = [];
    for (const width of widths) {
      const filename = `${path.parse(name).name}-${width}.webp`;
      await sharp(input).rotate().resize({width, withoutEnlargement:true}).webp({quality:80, effort:5}).toFile(path.join(out, filename));
      variants.push(`/resources/optimized/${filename} ${width}w`);
    }
    manifest[`/resources/images/${name}`] = variants.join(', ');
  }
  await fs.writeFile(path.resolve(__dirname,'../../web/src/data/resourceImages.json'), JSON.stringify(manifest,null,2)+'\n');
  console.log(`Optimized ${Object.keys(manifest).length} resource images`);
})().catch(e=>{console.error(e);process.exit(1)});
