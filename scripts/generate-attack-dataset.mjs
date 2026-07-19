#!/usr/bin/env node
/**
 * Regenerates src/features/flow-editing/data/attack-techniques.json from
 * MITRE's official ATT&CK STIX data. Run via: npm run attack:update
 *
 * Output schema (sorted by technique id for stable diffs):
 *   [{ id: "T1078", name: "Valid Accounts", tactics: [{ id: "TA0001", name: "Initial Access" }] }]
 */
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// Pinned to a specific stable ATT&CK release rather than the `master`
// enterprise-attack.json (which tracks pre-release changes). ATT&CK v19
// renamed the "Defense Evasion" tactic (TA0005) to "Stealth" and split out
// "Defense Impairment" (TA0112); v18.1 is the latest release that still uses
// the classic 14-tactic naming the rest of FlowViz expects (TACTIC_NAMES,
// the analysis prompts). Bump this version deliberately when adopting v19+.
const ATTACK_VERSION = '18.1';
const SOURCE_URL =
  `https://raw.githubusercontent.com/mitre-attack/attack-stix-data/master/enterprise-attack/enterprise-attack-${ATTACK_VERSION}.json`;

const OUTPUT_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'src',
  'features',
  'flow-editing',
  'data',
  'attack-techniques.json'
);

console.log(`Fetching ${SOURCE_URL} ...`);
const response = await fetch(SOURCE_URL);
if (!response.ok) {
  console.error(`Failed to fetch ATT&CK data: ${response.status} ${response.statusText}`);
  process.exit(1);
}
const bundle = await response.json();

// Build kill-chain shortname -> { id, name } from x-mitre-tactic objects
const tacticsByShortname = new Map();
for (const obj of bundle.objects) {
  if (obj.type !== 'x-mitre-tactic') continue;
  const externalId = obj.external_references?.find(
    (ref) => ref.source_name === 'mitre-attack'
  )?.external_id;
  if (externalId && obj.x_mitre_shortname) {
    tacticsByShortname.set(obj.x_mitre_shortname, { id: externalId, name: obj.name });
  }
}

const techniques = [];
for (const obj of bundle.objects) {
  if (obj.type !== 'attack-pattern') continue;
  if (obj.revoked || obj.x_mitre_deprecated) continue;

  const externalId = obj.external_references?.find(
    (ref) => ref.source_name === 'mitre-attack'
  )?.external_id;
  if (!externalId) continue;

  const tactics = (obj.kill_chain_phases ?? [])
    .filter((phase) => phase.kill_chain_name === 'mitre-attack')
    .map((phase) => tacticsByShortname.get(phase.phase_name))
    .filter(Boolean);

  techniques.push({ id: externalId, name: obj.name, tactics });
}

techniques.sort((a, b) => a.id.localeCompare(b.id, 'en', { numeric: true }));

await writeFile(OUTPUT_PATH, JSON.stringify(techniques, null, 1) + '\n', 'utf8');
console.log(`Wrote ${techniques.length} techniques to ${OUTPUT_PATH}`);
