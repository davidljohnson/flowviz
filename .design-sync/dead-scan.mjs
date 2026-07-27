import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const map = JSON.parse(readFileSync('.design-sync/.componentSrcMap.json', 'utf8'));

const rows = [];
for (const [name, src] of Object.entries(map)) {
  if (!src) continue;
  const own = src.split('\\').join('/');
  let out = '';
  try {
    out = execSync(`grep -rn "\\b${name}\\b" src/ --include=*.tsx --include=*.ts`, { encoding: 'utf8' });
  } catch {
    /* grep exits 1 when nothing matches */
  }
  const lines = out.split('\n').filter(Boolean);

  const external = lines.filter((l) => !l.startsWith(own + ':'));

  // Inside its own file, ignore the declaration itself and the `export default {}`
  // barrel listing — neither is a use.
  const internal = lines
    .filter((l) => l.startsWith(own + ':'))
    .map((l) => l.slice(own.length + 1).replace(/^\d+:/, '').trim())
    .filter((t) => !new RegExp(`^export (const|function|interface|type) ${name}\\b`).test(t))
    .filter((t) => t !== `${name},`)
    .filter((t) => !new RegExp(`^${name}\\.displayName`).test(t));

  rows.push({ name, external: external.length, internal: internal.length, group: own.replace(/^src\//, '').replace(/\/[^/]+$/, '') });
}

const unref = rows.filter((r) => r.external === 0 && r.internal === 0);
const internalOnly = rows.filter((r) => r.external === 0 && r.internal > 0);
const external = rows.filter((r) => r.external > 0);

console.log(`total ${rows.length}\n  used elsewhere      ${external.length}\n  used only in-module ${internalOnly.length}\n  UNREFERENCED        ${unref.length}\n`);

console.log('--- UNREFERENCED anywhere (safe to delete) ---');
let cur = '';
for (const d of unref.sort((a, b) => a.group.localeCompare(b.group) || a.name.localeCompare(b.name))) {
  if (d.group !== cur) { cur = d.group; console.log('\n  ' + cur); }
  console.log('     ' + d.name);
}

console.log('\n--- used only inside their own module (NOT deletable as-is) ---');
for (const d of internalOnly) console.log(`  ${d.name}  (${d.internal} internal refs)  ${d.group}`);
