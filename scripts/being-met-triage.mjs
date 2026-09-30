#!/usr/bin/env node
// being-met-triage.mjs — the being-met triage page (spec 5.6, phase 4).
//
// Rob opens this twice a week. It is written to a local HTML file and never emailed, posted
// or committed. It is sorted by need:
//   1. Urgent, or where someone may be in distress (first_gestures.urgent_at, set by a person),
//      then anything that needs a person and is due within a day.
//   2. Where he asked for a person, each with a starting draft.
//   3. Routine items handled by automatic templates: counts only.
//   4. Misses, each with its cause, unrepaired first.
// It never repeats a count of people as if they were failures, and it is not a daily report.
// Names appear here and nowhere else: the metrics views used for snapshots carry none.
//
// Usage: node scripts/being-met-triage.mjs [--out <file>] [--since-days 4] [--include-tests]
// Default out: /home/robbe/blkout/platform/missioncontrol/artifacts/being-met-triage.html
// Needs SUPABASE_ACCESS_TOKEN (Supabase Management API), as Mission Control's server does.

import { writeFileSync } from 'node:fs';

const REF = 'bgjengudzfickgomjqmz';
const args = process.argv.slice(2);
const opt = (name, dflt) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : dflt; };
const OUT = opt('--out', '/home/robbe/blkout/platform/missioncontrol/artifacts/being-met-triage.html');
const SINCE_DAYS = Number(opt('--since-days', '4'));
const INCLUDE_TESTS = args.includes('--include-tests');
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
if (!TOKEN) { console.error('FAILED: SUPABASE_ACCESS_TOKEN not set; no page written'); process.exit(1); }

async function sql(query) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST', headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  const t = await r.text();
  if (!r.ok) throw new Error(`query failed: ${t.slice(0, 300)}`);
  return JSON.parse(t);
}

const statusFilter = INCLUDE_TESTS ? `(r.status is null or r.status = 'test')` : `r.status is null`;
const [rows, coverage, doors, cfg] = await Promise.all([
  sql(`select r.id, r.person_ref, r.person_name, r.surface, r.gesture, r.occurred_at, r.due_at, r.met_at,
              r.state, r.miss_reason, r.miss_cause, r.repaired_at, r.promise_row, r.before_promise_written,
              r.status, p.needs_person, p.delivery_mode, p.window_text, g.urgent_at, g.urgent_note
         from metrics.being_met_rows r
         join public.first_gestures g on g.id = r.id
         left join public.promises p on p.key = r.promise_key
        where ${statusFilter} and not r.backfilled and r.promise_key is not null`),
  sql(`select * from metrics.being_met_coverage`),
  sql(`select key, label, wired_since, last_sync_at, last_sync_status, unmeasured_count from public.being_met_doors order by sort`),
  sql(`select newsletter_sync_enabled, hub_join_enabled, newsletter_followup_enabled,
              newsletter_followup_last_run_at, newsletter_followup_last_status,
              (newsletter_followup_template->>'approved_at') is not null as followup_copy_approved
         from public.being_met_config where id = 1`),
]);

const now = Date.now();
const DAY = 86400000;
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const when = (t) => (t ? new Date(t).toLocaleString('en-GB', { timeZone: 'Europe/London', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '');
const firstName = (n) => (n || '').trim().split(/\s+/)[0] || '';

// Starting drafts for person-delivered rows. These are Rob's to rewrite; none is sent by software.
const DRAFTS = {
  '5': (r) => `${firstName(r.person_name) || 'Hello'}, thanks for applying to Making Ourselves From Scratch. [What happens next, in your words.] Places are limited and we confirm them after applications close.\n\nIf this wasn't you, reply and we'll remove your address.\n\nBLKOUT is not a crisis service. If you need urgent help, call Samaritans free on 116 123 or NHS 111, or 999 in an emergency.\n\nRob, BLKOUT`,
  '15': (r) => `${firstName(r.person_name) || 'Hello'}, thanks for getting in touch. [What he asked for, and what we have done.] If anything here isn't right, reply to this email.\n\nIf you'd like to complain to the regulator, you can contact the Information Commissioner's Office at ico.org.uk or on 0303 123 1113.\n\nBLKOUT is not a crisis service. If you need urgent help, call Samaritans free on 116 123 or NHS 111, or 999 in an emergency.\n\nRob, BLKOUT`,
};

const open = rows.filter((r) => r.state === 'pending');
const person = open.filter((r) => r.needs_person);
const dueSoon = (r) => r.due_at && new Date(r.due_at).getTime() - now < DAY;
// Flagged urgent (by a person) first, oldest flag first, until met or repaired; then anything
// that needs a person and is due within a day, soonest first.
const urgent = rows.filter((r) => r.urgent_at && !r.met_at && !r.repaired_at)
  .sort((a, b) => new Date(a.urgent_at) - new Date(b.urgent_at));
const urgentIds = new Set(urgent.map((r) => r.id));
const section1 = [...urgent, ...person.filter((r) => dueSoon(r) && !urgentIds.has(r.id))
  .sort((a, b) => new Date(a.due_at) - new Date(b.due_at))];
const s1ids = new Set(section1.map((r) => r.id));
const section2 = person.filter((r) => !s1ids.has(r.id)).sort((a, b) => new Date(a.due_at) - new Date(b.due_at));

const since = now - SINCE_DAYS * DAY;
const routine = rows.filter((r) => !r.needs_person && new Date(r.occurred_at).getTime() >= since);
const routineCounts = {};
for (const r of routine) {
  const k = `Row ${r.promise_row}`;
  routineCounts[k] ??= { kept: 0, pending: 0, unconfirmed: 0, missed: 0 };
  routineCounts[k][r.state] = (routineCounts[k][r.state] ?? 0) + 1;
}

const misses = rows.filter((r) => r.state === 'missed' && !urgentIds.has(r.id))
  .sort((a, b) => (a.repaired_at ? 1 : 0) - (b.repaired_at ? 1 : 0) || new Date(b.occurred_at) - new Date(a.occurred_at));
const missesNow = misses.filter((r) => !r.before_promise_written);
const missesBefore = misses.filter((r) => r.before_promise_written);

const person_li = (r, withDraft) => `
  <li class="item" data-ref="${esc(r.person_ref)}">
    <div class="who">${esc(r.person_name || '(no name)')} <span class="ref">${esc(r.person_ref)}</span>${r.status === 'test' ? ' <span class="tag">TEST</span>' : ''}</div>
    <div class="what">${esc(r.gesture)} · row ${esc(r.promise_row)} · arrived ${esc(when(r.occurred_at))} · due ${esc(when(r.due_at))}</div>
    ${r.urgent_at ? `<div class="warn">Flagged urgent ${esc(when(r.urgent_at))}${r.urgent_note ? `: ${esc(r.urgent_note)}` : ''}</div>` : ''}
    ${withDraft && DRAFTS[r.promise_row] ? `<details><summary>Starting draft (yours to rewrite; nothing is sent)</summary><pre>${esc(DRAFTS[r.promise_row](r))}</pre></details>` : ''}
  </li>`;
const miss_li = (r) => `
  <li class="item" data-ref="${esc(r.person_ref)}">
    <div class="who">${esc(r.person_name || '(no name)')} <span class="ref">${esc(r.person_ref)}</span>${r.status === 'test' ? ' <span class="tag">TEST</span>' : ''}</div>
    <div class="what">${esc(r.gesture)} · row ${esc(r.promise_row)} · arrived ${esc(when(r.occurred_at))} · due ${esc(when(r.due_at))}</div>
    <div class="cause">Cause: ${esc(r.miss_reason || 'cause not recorded')}${r.repaired_at ? ` · repaired ${esc(when(r.repaired_at))}` : ' · not yet repaired'}</div>
  </li>`;

const c = coverage[0] || {};
const failedDoors = doors.filter((d) => /^FAILED/.test(d.last_sync_status || ''));
const html = `<title>Being met: triage</title>
<meta charset="utf-8">
<style>
  :root { --bg:#0b0b0b; --ink:#f4f1ea; --muted:#a9a49a; --gold:#d4af37; --line:#2a2a2a; --warn:#ff8a6b; }
  body { background:var(--bg); color:var(--ink); font:15px/1.5 "Work Sans", system-ui, sans-serif; margin:0; padding:24px clamp(16px,4vw,48px); }
  h1 { font-weight:600; margin:0 0 4px; } h2 { color:var(--gold); font-weight:600; margin:32px 0 8px; font-size:18px; }
  .meta, .ref, .what, .cause { color:var(--muted); font-size:13px; } .cause { color:var(--ink); }
  ul { list-style:none; padding:0; margin:0; } .item { border-top:1px solid var(--line); padding:10px 0; }
  .tag { color:var(--gold); font-size:11px; letter-spacing:.1em; } .warn { color:var(--warn); }
  pre { white-space:pre-wrap; background:#151515; padding:12px; border-radius:6px; font-size:13px; }
  table { border-collapse:collapse; } td, th { border-top:1px solid var(--line); padding:6px 12px 6px 0; text-align:left; font-size:13px; }
  .empty { color:var(--muted); font-style:italic; }
</style>
<h1>Being met: triage</h1>
<div class="meta">Made ${esc(when(new Date()))}. For Rob only: it names people. Not emailed, not a report.${INCLUDE_TESTS ? ' <span class="tag">INCLUDES TEST ROWS</span>' : ''}</div>

<h2>Coverage</h2>
<div>Doors counted: ${esc(c.doors_counted)} of ${esc(c.doors_known)} known. Not counted: ${esc(c.doors_not_counted_list)}.</div>
<div class="meta">Weeks in surge (last 13): ${esc(c.weeks_in_surge_13w)} · weeks away: ${esc(c.weeks_away_13w)} · live rows never measured (backfilled): ${esc(c.live_rows_backfilled_excluded)}</div>
<div class="meta">Newsletter door ${cfg[0]?.newsletter_sync_enabled ? 'on' : 'off'} · Hub door ${cfg[0]?.hub_join_enabled ? 'on' : 'off'} · newsletter follow-up ${cfg[0]?.newsletter_followup_enabled ? 'on' : 'off'} (copy ${cfg[0]?.followup_copy_approved ? 'approved' : 'not approved'})</div>
${failedDoors.map((d) => `<div class="warn">${esc(d.label)}: ${esc(d.last_sync_status)} (${esc(when(d.last_sync_at))})</div>`).join('')}
${/^FAILED/.test(cfg[0]?.newsletter_followup_last_status || '') ? `<div class="warn">Newsletter follow-up: ${esc(cfg[0].newsletter_followup_last_status)}</div>` : ''}

<h2>1. Urgent, or due within a day</h2>
<ul id="section-1">${section1.map((r) => person_li(r, true)).join('') || '<li class="empty">Nothing urgent.</li>'}</ul>

<h2>2. Asked for a person</h2>
<ul id="section-2">${section2.map((r) => person_li(r, true)).join('') || '<li class="empty">Nothing waiting.</li>'}</ul>

<h2>3. Routine, handled automatically (last ${esc(SINCE_DAYS)} days, counts only)</h2>
<div id="section-3">${Object.keys(routineCounts).length ? `<table><tr><th></th><th>kept</th><th>on the way</th><th>unconfirmed</th><th>missed</th></tr>${Object.entries(routineCounts).map(([k, v]) => `<tr><td>${esc(k)}</td><td>${v.kept}</td><td>${v.pending}</td><td>${v.unconfirmed}</td><td>${v.missed}</td></tr>`).join('')}</table>` : '<div class="empty">Nothing new.</div>'}</div>

<h2>4. Misses</h2>
<ul id="section-4">${missesNow.map(miss_li).join('') || '<li class="empty">No misses since the promises were written.</li>'}</ul>
${missesBefore.length ? `<details><summary class="meta">${missesBefore.length} earlier, from before the promise table was written (30 Sep 2026)</summary><ul>${missesBefore.map(miss_li).join('')}</ul></details>` : ''}
`;

writeFileSync(OUT, html);
console.log(`wrote ${OUT}`);
