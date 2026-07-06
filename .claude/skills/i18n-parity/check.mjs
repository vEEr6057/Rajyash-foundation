#!/usr/bin/env node
// i18n parity checker — EN is the reference locale; GU/HI must match its key sets.
// Usage: node .claude/skills/i18n-parity/check.mjs
// Exit 0 = parity OK (pending-review counts are informational), 1 = missing/extra keys or mojibake.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = 'src/i18n/messages';
const REF = 'en';
const LOCALES = ['gu', 'hi'];

const flatten = (obj, prefix = '') =>
  Object.entries(obj).flatMap(([k, v]) => {
    if (k.startsWith('_')) return []; // _review/_meta/etc are translator metadata, not messages
    const key = prefix ? `${prefix}.${k}` : k;
    return v && typeof v === 'object' && !Array.isArray(v) ? flatten(v, key) : [key];
  });

let failed = false;
const refFiles = readdirSync(join(ROOT, REF)).filter(f => f.endsWith('.json'));

for (const locale of LOCALES) {
  const localeFiles = readdirSync(join(ROOT, locale)).filter(f => f.endsWith('.json'));
  for (const f of new Set([...refFiles, ...localeFiles])) {
    if (!refFiles.includes(f)) { console.log(`EXTRA FILE ${locale}/${f} (no ${REF} counterpart)`); failed = true; continue; }
    if (!localeFiles.includes(f)) { console.log(`MISSING FILE ${locale}/${f}`); failed = true; continue; }
    const ref = new Set(flatten(JSON.parse(readFileSync(join(ROOT, REF, f), 'utf8'))));
    const loc = new Set(flatten(JSON.parse(readFileSync(join(ROOT, locale, f), 'utf8'))));
    for (const k of ref) if (!loc.has(k)) { console.log(`MISSING ${locale}/${f}: ${k}`); failed = true; }
    for (const k of loc) if (!ref.has(k)) { console.log(`EXTRA   ${locale}/${f}: ${k}`); failed = true; }
  }
}

// Mojibake canary: U+FFFD, or any Latin-1-supplement letter (U+00C0-U+00FF) — EN/GU/HI
// content never legitimately contains those; presence = UTF-8 read as latin1 somewhere.
const MOJIBAKE = /[�À-ÿ]/;
for (const locale of [REF, ...LOCALES]) {
  for (const f of readdirSync(join(ROOT, locale)).filter(f => f.endsWith('.json'))) {
    const lines = readFileSync(join(ROOT, locale, f), 'utf8').split('\n');
    lines.forEach((line, i) => {
      if (MOJIBAKE.test(line)) { console.log(`MOJIBAKE ${locale}/${f}:${i + 1}: ${line.trim().slice(0, 80)}`); failed = true; }
    });
  }
}

// Informational: strings still awaiting native review.
for (const locale of LOCALES) {
  let pending = 0;
  for (const f of readdirSync(join(ROOT, locale)).filter(f => f.endsWith('.json'))) {
    pending += (readFileSync(join(ROOT, locale, f), 'utf8').match(/"_review":\s*"pending"/g) || []).length;
  }
  console.log(`INFO ${locale}: ${pending} _review:pending block(s)`);
}

console.log(failed ? 'PARITY FAIL' : 'PARITY OK');
process.exit(failed ? 1 : 0);
