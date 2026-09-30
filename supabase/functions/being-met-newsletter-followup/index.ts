// being-met-newsletter-followup — being-met spec phase 3, promise table row 1.
//
// BLKOUT's follow-up to a newsletter sign-up: one email, 24 hours after he signed up, and only
// once he has confirmed in SendFox (spec decisions 39, 41). Idempotent: a row is claimed before
// the send, and a claimed row is never sent again. Delivery evidence is written to the row.
//
// "Delivered means arrived" (principle 5): Resend accepting the email is NOT delivery. Each
// run first reads back earlier sends from Resend (GET /emails/{id}); only last_event
// 'delivered' sets met_at and delivery_outcome 'delivered'. 'bounced' sets 'bounced', which
// the measure reads as missed.
//
// OFF by default (being_met_config.newsletter_followup_enabled = false). While off it sends
// ONLY to test rows (status 'test', address rob@ / rob+…@blkoutuk.com or @resend.dev, Resend's
// own simulator), with [TEST] in the subject. With the flag on it still refuses to send until
// the template carries approved_at and reply_to (Rob approves the copy first).
//
// Auth: x-collector-secret = Vault metrics_collector_secret. RESEND_API_KEY is the project's
// existing Edge Function secret (acknowledge-gesture uses it). Nothing secret is logged.
// Every run writes being_met_config.newsletter_followup_last_status: 'ok …' or 'FAILED: …'.

import { createClient } from "npm:@supabase/supabase-js@2";

const TEST_ADDRESS = /^(rob(\+[^@]*)?@blkoutuk\.com|[a-z+._-]+@resend\.dev)$/i;
const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const RESEND = "https://api.resend.com";

async function lastStatus(s: string) {
  const { error } = await supa.from("being_met_config")
    .update({ newsletter_followup_last_run_at: new Date().toISOString(), newsletter_followup_last_status: s.slice(0, 500) })
    .eq("id", 1);
  if (error) console.error("FAILED to write last status", error.message);
}

function render(tpl: { subject: string; body: string }, name: string, test: boolean) {
  const first = (name || "").trim().split(/\s+/)[0] || "";
  const body = tpl.body
    .replace("Hello {name},", first ? `Hello ${first},` : "Hello,")
    .replaceAll("{name}", first);
  return { subject: (test ? "[TEST] " : "") + tpl.subject, text: body };
}

Deno.serve(async (req) => {
  const { data: expected } = await supa.rpc("metrics_secret", { p_name: "metrics_collector_secret" });
  if (!expected || req.headers.get("x-collector-secret") !== expected) return new Response("forbidden", { status: 403 });
  const resendKey = Deno.env.get("RESEND_API_KEY");

  try {
    if (!resendKey) throw new Error("RESEND_API_KEY not set for Edge Functions");
    const RH = { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" };
    const { data: cfg } = await supa.from("being_met_config").select("*").eq("id", 1).single();
    const { data: c2 } = await supa.from("course2_config").select("from_address").eq("id", 1).single();
    if (!cfg) throw new Error("being_met_config row missing");
    const tpl = cfg.newsletter_followup_template;
    if (!tpl?.subject || !tpl?.body) throw new Error("no follow-up template");
    if (!c2?.from_address) throw new Error("no from_address in course2_config");
    const enabled = cfg.newsletter_followup_enabled === true;
    const approved = Boolean(tpl.approved_at) && Boolean(tpl.reply_to);
    if (enabled && !approved) throw new Error("flag is on but the copy is not approved (approved_at and reply_to needed); nothing sent");

    // Pass A: read back earlier sends from Resend.
    const { data: open } = await supa.from("first_gestures")
      .select("id, delivery_evidence")
      .eq("surface", "newsletter").is("delivery_outcome", null)
      .not("delivery_evidence->>resend_id", "is", null);
    let delivered = 0, bounced = 0, waiting = 0;
    for (const row of open ?? []) {
      const ev = row.delivery_evidence;
      const r = await fetch(`${RESEND}/emails/${ev.resend_id}`, { headers: RH });
      if (!r.ok) throw new Error(`resend GET /emails/{id}: HTTP ${r.status}`);
      const e = await r.json();
      const evidence = { ...ev, last_event: e.last_event, checked_at: new Date().toISOString() };
      if (e.last_event === "delivered") {
        await supa.from("first_gestures").update({ met_at: ev.accepted_at, delivery_outcome: "delivered", delivery_evidence: evidence }).eq("id", row.id);
        delivered++;
      } else if (e.last_event === "bounced") {
        await supa.from("first_gestures").update({ delivery_outcome: "bounced", delivery_evidence: evidence }).eq("id", row.id);
        bounced++;
      } else {
        await supa.from("first_gestures").update({ delivery_evidence: evidence }).eq("id", row.id);
        waiting++;
      }
    }

    // Pass B: send to confirmed contacts whose 24 hours are up.
    const due = new Date(Date.now() - pgIntervalMs(cfg.newsletter_followup_delay)).toISOString();
    const { data: cands, error: cErr } = await supa.from("first_gestures")
      .select("id, person_ref, person_name, status, source_ref")
      .eq("surface", "newsletter").eq("backfilled", false)
      .not("contact_confirmed_at", "is", null)
      .lte("occurred_at", due)
      .is("met_at", null).is("delivery_outcome", null).is("delivery_evidence", null);
    if (cErr) throw new Error(`select candidates: ${cErr.message}`);
    let sent = 0, failed = 0, heldBack = 0;
    for (const row of cands ?? []) {
      const test = row.status === "test" && TEST_ADDRESS.test(row.person_ref ?? "");
      if (!test && (!enabled || row.status !== null)) { heldBack++; continue; }
      // claim the row first, so a concurrent run can never send twice
      const { data: claimed } = await supa.from("first_gestures")
        .update({ delivery_evidence: { state: "sending", claimed_at: new Date().toISOString() } })
        .eq("id", row.id).is("delivery_evidence", null).select("id");
      if (!claimed?.length) continue;
      const m = render(tpl, row.person_name ?? "", test);
      const res = await fetch(`${RESEND}/emails`, {
        method: "POST", headers: RH,
        body: JSON.stringify({ from: c2.from_address, to: row.person_ref, reply_to: tpl.reply_to ?? "rob@blkoutuk.com", subject: m.subject, text: m.text }),
      });
      if (!res.ok) {
        await supa.from("first_gestures").update({
          delivery_outcome: "failed", miss_cause: "system_fault", delivery_method: "automatic",
          delivery_evidence: { provider: "resend", error_status: res.status, at: new Date().toISOString(), template_version: tpl.version },
        }).eq("id", row.id);
        failed++;
        continue;
      }
      const j = await res.json();
      await supa.from("first_gestures").update({
        delivery_method: "automatic",
        delivery_evidence: { provider: "resend", resend_id: j.id, accepted_at: new Date().toISOString(), template_version: tpl.version, test },
      }).eq("id", row.id);
      sent++;
    }

    const s = `ok ${enabled ? "enabled" : "off (test rows only)"}: read back ${delivered} delivered, ${bounced} bounced, ${waiting} not yet final; sent ${sent}, failed ${failed}, held back ${heldBack}`;
    await lastStatus(s);
    return Response.json({ ok: true, status: s });
  } catch (e) {
    const msg = `FAILED: ${(e as Error).message}`;
    console.error(msg);
    await lastStatus(msg);
    return new Response(msg, { status: 500 });
  }
});

// Postgres returns an interval as 'HH:MM:SS' or 'N days HH:MM:SS'.
function pgIntervalMs(v: string): number {
  const m = /^(?:(\d+) days? )?(\d+):(\d+):(\d+)$/.exec(String(v).trim());
  if (!m) throw new Error(`cannot read newsletter_followup_delay '${v}'`);
  return (((Number(m[1] ?? 0) * 24 + Number(m[2])) * 60 + Number(m[3])) * 60 + Number(m[4])) * 1000;
}
