import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
const dir = 'docs/guide';
let html = fs.readFileSync(path.join(dir, '_handbook-template.html'), 'utf8');
const tokens = [...new Set([...html.matchAll(/\{\{IMG:([^}]+)\}\}/g)].map(m => m[1]))];
let total = 0;
for (const name of tokens) {
  const png = path.join(dir, 'assets', name + '.png');
  const buf = await sharp(png).resize({ width: 1180, withoutEnlargement: true }).jpeg({ quality: 74, mozjpeg: true }).toBuffer();
  total += buf.length;
  const uri = 'data:image/jpeg;base64,' + buf.toString('base64');
  html = html.split('{{IMG:' + name + '}}').join(uri);
  process.stdout.write(name + ' ' + (buf.length/1024).toFixed(0) + 'KB  ');
}
const left = (html.match(/\{\{IMG:/g) || []).length;
fs.writeFileSync(path.join(dir, 'FoodPorter-Handbook.html'), html);
console.log('\n---\nimages: ' + tokens.length + ', total img ' + (total/1024/1024).toFixed(2) + 'MB, unreplaced tokens: ' + left);
console.log('html size: ' + (fs.statSync(path.join(dir,'FoodPorter-Handbook.html')).size/1024/1024).toFixed(2) + 'MB');
