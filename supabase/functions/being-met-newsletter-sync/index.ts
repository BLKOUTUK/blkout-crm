// being-met-newsletter-sync — being-met spec phase 2: the newsletter door into the record.
//
// Reads SendFox contacts created through the subscribe form (form_id in being_met_config,
// 232233 on 30 Sep 2026) since a cut-off, and writes one first_gestures row per contact:
// surface 'newsletter', source_table 'sendfox_contacts', source_ref = SendFox contact id,
// person_ref = email, contact_confirmed_at = SendFox confirmed_at. Idempotent through
// public.being_met_record_external (unique on source_table + source_ref).
//
// OFF by default (being_met_config.newsletter_sync_enabled = false). While off it records
// ONLY test addresses (rob@ / rob+…@blkoutuk.com, status 'test'), so the door can be proved,
// and it writes the count of everyone else to being_met_doors.unmeasured_count: the honest
// "contacts this door had that never reached the record".
//
// It sends nothing to anyone. Acknowledgment receipts are suppressed for surface
// 'newsletter' by acknowledge-gesture v5 (course2_config.excluded_surfaces).
//
// Auth: header x-collector-secret must equal Vault 'metrics_collector_secret' (the same
// internal secret pg_cron already uses for metrics-snapshot). SendFox key from Vault
// 'sendfox_api_key' through the service-role RPC metrics_secret. Never logged.
//
// Every run ends by writing being_met_doors.last_sync_status: 'ok …' or 'FAILED: …'.
// Body: { dry_run?: boolean, dry_run_floor?: ISO date }  dry_run = read and count, write nothing,
// return counts and field names only (no addresses).

import { createClient } from "npm:@supabase/supabase-js@2";

const API = "https://api.sendfox.com";
const MAX_PAGES = 40;
const TEST_ADDRESS = /^rob(\+[^@]*)?@blkoutuk\.com$/i;

const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

async function secret(name: string): Promise<string> {
  const { data, error } = await supa.rpc("metrics_secret", { p_name: name });
  if (error || !data) throw new Error(`secret ${name} unavailable`);
  return data as string;
}

type Contact = {
  id: number; email: string; first_name?: string; created_at: string; confirmed_at: string | null;
  bounced_at: string | null; unsubscribed_at: string | null; form_id: number | null;
};

async function setDoorStatus(status: string, unmeasured?: { count: number; since: string }) {
  const patch: Record<string, unknown> = { last_sync_at: new Date().toISOString(), last_sync_status: status.slice(0, 500) };
  if (unmeasured) {
    patch.unmeasured_count = unmeasured.count;
    patch.unmeasured_as_at = new Date().toISOString();
    patch.unmeasured_source = `sendfox GET /contacts, form_id match, created since ${unmeasured.since}; test addresses not counted`;
  }
  const { error } = await supa.from("being_met_doors").update(patch).eq("key", "newsletter_signup");
  if (error) console.error("FAILED to write door status", error.message);
}

Deno.serve(async (req) => {
  const expected = await secret("metrics_collector_secret").catch(() => null);
  if (!expected || req.headers.get("x-collector-secret") !== expected) return new Response("forbidden", { status: 403 });
  const body = await req.json().catch(() => ({}));
  const dryRun = body?.dry_run === true;

  try {
    const { data: cfg, error: cfgErr } = await supa.from("being_met_config").select("*").eq("id", 1).single();
    if (cfgErr || !cfg) throw new Error("being_met_config row missing");
    const enabled = cfg.newsletter_sync_enabled === true;
    // look back no further than 30 days, and never before the configured start
    let floor = new Date(Math.max(new Date(cfg.newsletter_sync_since).getTime(), Date.now() - 30 * 86400000));
    // a dry run may look further back, to check the shape of real contacts; it writes nothing
    if (dryRun && typeof body?.dry_run_floor === "string") floor = new Date(body.dry_run_floor);

    const key = await secret("sendfox_api_key");
    const H = { Authorization: `Bearer ${key}`, Accept: "application/json", "User-Agent": "curl/8.5.0" };

    // SendFox lists contacts newest first (checked by the dry run's `ordered` flag, below).
    // Page until a whole page is older than the floor.
    const seen: Contact[] = [];
    let pages = 0, ordered = true, lastCreated = Infinity, reachedFloor = false;
    for (let page = 1; page <= MAX_PAGES; page++) {
      const r = await fetch(`${API}/contacts?page=${page}`, { headers: H });
      if (!r.ok) throw new Error(`sendfox /contacts page ${page}: HTTP ${r.status}`);
      const j = await r.json();
      if (!Array.isArray(j?.data)) throw new Error(`sendfox /contacts page ${page}: no data array`);
      pages++;
      for (const c of j.data as Contact[]) {
        const t = new Date(c.created_at).getTime();
        if (t > lastCreated) ordered = false;
        lastCreated = t;
        if (t >= floor.getTime()) seen.push(c);
      }
      if (j.data.length === 0 || new Date(j.data[j.data.length - 1].created_at) < floor) { reachedFloor = true; break; }
      if (!j.next_page_url) { reachedFloor = true; break; }
    }
    if (!ordered) throw new Error("sendfox /contacts is not newest-first; refusing to trust a partial scan");
    // a contact without a form_id field would make every signup look like "not from the form"
    // and the door would read as silent forever: refuse instead
    if (seen.some((c) => !("form_id" in c))) throw new Error("sendfox contacts carry no form_id field; cannot tell the subscribe form apart");
    if (!reachedFloor) throw new Error(`scanned ${MAX_PAGES} pages without reaching ${floor.toISOString()}; partial read`);

    const fromForm = seen.filter((c) => c.form_id === cfg.newsletter_form_id);
    const isTest = (c: Contact) => TEST_ADDRESS.test((c.email || "").trim());
    const toWrite = enabled ? fromForm : fromForm.filter(isTest);
    const unrecorded = enabled ? 0 : fromForm.filter((c) => !isTest(c)).length;

    if (dryRun) {
      return Response.json({
        dry_run: true, enabled, pages, ordered, floor: floor.toISOString(),
        contacts_since_floor: seen.length, from_form: fromForm.length,
        would_write: toWrite.length, test_addresses: fromForm.filter(isTest).length, would_leave_unrecorded: unrecorded,
        sample_fields: seen[0] ? Object.keys(seen[0]).sort() : [],
      });
    }

    const results: Record<string, number> = { inserted: 0, updated: 0 };
    for (const c of toWrite) {
      const test = isTest(c);
      const bounced = c.bounced_at ? "bounced" : null;
      const { data, error } = await supa.rpc("being_met_record_external", {
        p_surface: "newsletter",
        p_source_table: "sendfox_contacts",
        p_source_ref: String(c.id),
        p_person_ref: c.email,
        p_person_name: c.first_name ?? null,
        p_gesture: "signed up to the newsletter",
        p_occurred_at: c.created_at,
        p_status: test ? "test" : null,
        p_confirmed_at: c.confirmed_at,
        p_delivery_outcome: bounced,
        p_delivery_evidence: bounced ? { provider: "sendfox", bounced_at: c.bounced_at, what: "SendFox confirmation email" } : null,
      });
      if (error) throw new Error(`write for contact ${c.id}: ${error.message}`);
      results[data as string] = (results[data as string] ?? 0) + 1;
    }

    if (enabled) {
      await supa.from("being_met_doors").update({ wired_since: new Date().toISOString().slice(0, 10) })
        .eq("key", "newsletter_signup").is("wired_since", null);
    }
    const status = `ok ${enabled ? "enabled" : "off (test addresses only)"}: ${pages} page(s), ${fromForm.length} from the form since ${floor.toISOString().slice(0, 10)}, ${results.inserted} inserted, ${results.updated} updated` +
      (enabled ? "" : `, ${unrecorded} not recorded (door off)`);
    await setDoorStatus(status, enabled ? undefined : { count: unrecorded, since: floor.toISOString().slice(0, 10) });
    return Response.json({ ok: true, status });
  } catch (e) {
    const msg = `FAILED: ${(e as Error).message}`;
    console.error(msg);
    if (!dryRun) await setDoorStatus(msg);
    return new Response(msg, { status: 500 });
  }
});
