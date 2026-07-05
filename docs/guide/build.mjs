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

// Bare fragment (starts at <title>) for the claude.ai Artifact — it adds its own
// <!doctype>/<head> skeleton at publish time, so this must NOT be a full document.
fs.writeFileSync(path.join(dir, 'FoodPorter-Handbook.html'), html);

// Standalone copy hosted at /guide (public/guide.html). A raw file served by the
// Worker gets NO charset from the header and the fragment has no <meta charset>, so
// browsers fall back to latin-1 and mojibake every em-dash / GU / HI character. Wrap
// it in a minimal document with an explicit UTF-8 charset (must be in the first bytes;
// the <head> auto-closes when the first <div> appears, so charset+viewport land there).
const standalone =
  '<!doctype html>\n<html lang="en">\n<head>\n' +
  '<meta charset="utf-8">\n' +
  '<meta name="viewport" content="width=device-width, initial-scale=1">\n' +
  html +
  '\n</html>\n';
fs.writeFileSync('public/guide.html', standalone);

console.log('\n---\nimages: ' + tokens.length + ', total img ' + (total/1024/1024).toFixed(2) + 'MB, unreplaced tokens: ' + left);
console.log('html size: ' + (fs.statSync(path.join(dir,'FoodPorter-Handbook.html')).size/1024/1024).toFixed(2) + 'MB');
console.log('public/guide.html (standalone, charset-wrapped): ' + (fs.statSync('public/guide.html').size/1024/1024).toFixed(2) + 'MB');
