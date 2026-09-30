#!/usr/bin/env node
// being_met_triage_check.mjs — phase 4 check (spec section 9): "an urgent row rises to the top,
// and a miss is listed with its cause".
//
// Inserts three test rows (status 'test', rob+bm-… addresses), generates the triage page with
// --include-tests into a scratch file, reads the HTML back, then DELETES the test rows and
// confirms they are gone. Exit 0 = PASS, 1 = FAIL. Needs SUPABASE_ACCESS_TOKEN (Management API).
//
//   T-routine : a rights request (row 15, needs a person) that arrived FIRST, 1 hour ago
//   T-urgent  : a later rights request flagged urgent (urgent_at set)
//   (surface 'rights', not 'scratch': a scratch row would email Rob a notice even as a test)
//   T-miss    : an event signup 5 days old, nothing arrived, cause recorded 'system_fault'
//
// PASS needs: the first item in the page's first section is T-urgent (though it arrived after
// T-routine), and T-miss appears in the misses section with its cause.

import { execFileSync } from 'node:child_process';
import { readFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REF = 'bgjengudzfickgomjqmz';
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
if (!TOKEN) { console.error('FAILED: SUPABASE_ACCESS_TOKEN not set'); process.exit(1); }
async function sql(query) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST', headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  const t = await r.text();
  if (!r.ok) throw new Error(`sql failed: ${t}`);
  return JSON.parse(t);
}

const HERE = path.dirname(fileURLToPath(import.meta.url));
// BM_TRIAGE_SCRIPT lets a mutated copy be checked, to show this check can fail
const SCRIPT = process.env.BM_TRIAGE_SCRIPT || path.join(HERE, '..', 'being-met-triage.mjs');
const out = path.join(mkdtempSync(path.join(tmpdir(), 'bm-triage-')), 'triage.html');
const TAG = 'being-met-triage-check';

// urgent_at may not exist yet (the check is written to fail first against a page without it)
const hasUrgent = (await sql(`select count(*)::int n from information_schema.columns
  where table_schema='public' and table_name='first_gestures' and column_name='urgent_at'`))[0].n === 1;

let verdict = 'FAIL';
try {
  await sql(`insert into public.first_gestures (person_ref, person_name, surface, gesture, source_table, source_ref, occurred_at, status, miss_cause, notes) values
    ('rob+bm-triage-routine@blkoutuk.com','Routine Test','rights','asked what we hold about him','${TAG}','T-routine', now()-interval '1 hour','test',null,'triage check'),
    ('rob+bm-triage-urgent@blkoutuk.com','Urgent Test','rights','asked what we hold about him','${TAG}','T-urgent', now()-interval '10 minutes','test',null,'triage check'),
    ('rob+bm-triage-miss@blkoutuk.com','Miss Test','events','registered interest in a test event','${TAG}','T-miss', now()-interval '5 days','test','system_fault','triage check')`);
  if (hasUrgent) await sql(`update public.first_gestures set urgent_at = now(), urgent_note = 'triage check' where source_table='${TAG}' and source_ref='T-urgent'`);

  execFileSync('node', [SCRIPT, '--include-tests', '--out', out], { stdio: 'inherit' });
  const html = readFileSync(out, 'utf8');

  const first = html.split('id="section-1"')[1] ?? '';
  const firstItem = /data-ref="([^"]+)"/.exec(first)?.[1];
  const urgentTop = firstItem === 'rob+bm-triage-urgent@blkoutuk.com';
  const misses = html.split('id="section-4"')[1] ?? '';
  const at = misses.indexOf('rob+bm-triage-miss@blkoutuk.com');
  const missRow = at >= 0 ? misses.slice(at, at + 600) : '';
  const missCause = misses.includes('rob+bm-triage-miss@blkoutuk.com') && /system_fault|system fault/i.test(missRow);

  console.log(`urgent row first in section 1: ${urgentTop ? 'PASS' : `FAIL (first item: ${firstItem ?? 'none'})`}`);
  console.log(`miss listed with its cause:    ${missCause ? 'PASS' : `FAIL (found in misses: ${misses.includes('rob+bm-triage-miss@blkoutuk.com')}; text after it: ${JSON.stringify(missRow.slice(0, 300))})`}`);
  verdict = urgentTop && missCause ? 'PASS' : 'FAIL';
} finally {
  await sql(`delete from public.first_gestures where source_table='${TAG}'`);
  const left = (await sql(`select count(*)::int n from public.first_gestures where source_table='${TAG}' or person_ref like 'rob+bm-triage-%'`))[0].n;
  console.log(`test rows left after cleanup: ${left}`);
  if (left !== 0) verdict = 'FAIL';
}
console.log(verdict);
process.exit(verdict === 'PASS' ? 0 : 1);
