// Layer-1 friction-lite acknowledgement (Course 2 spec §7 Layer 1).
// Triggered by pg_net webhook on first_gestures INSERT. All eligibility guards
// live here; the trigger fires unconditionally. Keyring scope: this function may
// send ONLY the fixed template from course2_config, to the one man whose own
// action created the row. Free-composed outbound is a human's, always.
//
// v5 (30 Sep 2026): excluded_surfaces guard (course2_config). v4 kept as index.v4.ts.bak.
// Secrets: ACK_WEBHOOK_SECRET, RESEND_API_KEY (SUPABASE_URL + SERVICE_ROLE injected).
// Deployed with --no-verify-jwt; auth is the shared-secret header from the trigger.

import { createClient } from "npm:@supabase/supabase-js@2";

const ok = (msg: string) => {
  console.log(msg);
  return new Response(msg, { status: 200 });
};

// Scratch application notice to Rob (being-met spec, decision 30 Sep 2026): one short
// note per application. It runs whatever happens to the acknowledgment below, and a
// failure is written to the record's notes, never swallowed.
const NOTICE_TO = Deno.env.get("SCRATCH_NOTICE_TO") ?? "rob@blkoutuk.com";

async function appendNote(supa: any, id: string, text: string) {
  const { data: cur } = await supa.from("first_gestures").select("notes").eq("id", id).single();
  await supa.from("first_gestures").update({
    notes: (cur?.notes ? cur.notes + " | " : "") + text,
  }).eq("id", id);
}

async function noticeToRob(supa: any, cfg: any, rec: any) {
  try {
    const { data: cur } = await supa.from("first_gestures").select("notes").eq("id", rec.id).single();
    if (cur?.notes?.includes("notice to Rob sent")) return; // a webhook retry
    if (!cfg?.from_address) {
      await appendNote(supa, rec.id, "notice to Rob FAILED (no from_address in course2_config)");
      return;
    }
    const name = (rec.person_name || "").trim() || "an applicant";
    const test = rec.status === "test" ? " [TEST]" : "";
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: cfg.from_address,
        to: NOTICE_TO,
        subject: `Scratch: new application (${name.split(/\s+/)[0]})${test}`,
        text: [
          "A new application to Making Ourselves From Scratch has arrived.",
          "",
          `Name: ${name}`,
          `Email: ${rec.person_ref}`,
          `Received: ${rec.occurred_at}`,
          "",
          "The page tells applicants a person will be in touch within 48 hours. Applications close on 5 October. Their answers are in the record: event_interest, slug scratch-2026.",
          "",
          "This is one message per application. It is not a count.",
        ].join("\n"),
      }),
    });
    if (!res.ok) {
      console.error(`notice to Rob: resend ${res.status}: ${await res.text()}`);
      await appendNote(supa, rec.id, `notice to Rob FAILED (resend ${res.status})`);
      return;
    }
    await appendNote(supa, rec.id, "notice to Rob sent");
  } catch (e) {
    console.error("notice to Rob failed", e);
    try { await appendNote(supa, rec.id, "notice to Rob FAILED (exception)"); } catch (_) { /* logged above */ }
  }
}

Deno.serve(async (req) => {
  if (req.headers.get("x-ack-secret") !== Deno.env.get("ACK_WEBHOOK_SECRET")) {
    return new Response("forbidden", { status: 403 });
  }
  const payload = await req.json();
  const rec = payload.record ?? payload;
  if (!rec?.id) return ok("no record");

  const supa = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: cfg } = await supa.from("course2_config").select("*").eq("id", 1).single();
  if (rec.surface === "scratch") await noticeToRob(supa, cfg, rec);
  if (!cfg?.ack_enabled) return ok("ack disabled");
  // Doors whose promise is kept by their own framework (being-met spec, 30 Sep 2026):
  // newsletter = SendFox's confirmation, then BLKOUT's follow-up; hub = the Hub welcome.
  // They get no receipt here. If the column is missing, exclude both: the safe default
  // is to send nothing, never to send an unapproved message.
  const excludedSurfaces: string[] = cfg.excluded_surfaces ?? ["newsletter", "hub"];
  if (excludedSurfaces.includes(rec.surface)) return ok(`excluded surface ${rec.surface} — own framework`);
  if (rec.status || rec.acknowledged_at || rec.met_at) return ok("not eligible (status/acked/met)");
  if (!rec.person_ref || !rec.person_ref.includes("@")) return ok("no email handle");

  const ageDays = (Date.now() - new Date(rec.occurred_at).getTime()) / 86400000;
  if (ageDays > cfg.max_gesture_age_days) return ok("too old for an honest instant receipt");

  // Never contact someone the CRM records as deceased — checked here as well as
  // at the DB layer (trg_inherit_deceased), so the guard holds even for a person
  // whose only deceased record is in contacts.
  const { data: crm } = await supa.from("contacts")
    .select("status").eq("email", rec.person_ref).eq("status", "deceased").limit(1);
  if (crm?.length) return ok("no contact — recorded deceased in CRM");

  // Cohorts with their own fulfilment framework (e.g. picnic briefing list) are excluded.
  if (rec.source_table === "event_interest" && rec.source_id) {
    const { data: ev } = await supa.from("event_interest")
      .select("event_slug").eq("id", rec.source_id).single();
    if (ev && cfg.excluded_event_slugs.includes(ev.event_slug)) {
      return ok(`excluded slug ${ev.event_slug} — own framework`);
    }
  }

  // One receipt per person per 24h, however many gestures he makes.
  const since = new Date(Date.now() - 86400000).toISOString();
  const { data: recent } = await supa.from("first_gestures")
    .select("id").eq("person_ref", rec.person_ref)
    .gte("acknowledged_at", since).limit(1);
  if (recent?.length) return ok("deduped — receipt already sent today");

  // First contact or returner? Any earlier gesture from him = returner.
  const { count } = await supa.from("first_gestures")
    .select("id", { count: "exact", head: true })
    .eq("person_ref", rec.person_ref).neq("id", rec.id)
    .lt("occurred_at", rec.occurred_at);
  const kind = (count ?? 0) > 0 ? "returner" : "first_contact";

  const t = cfg.templates[kind];
  const door = cfg.doors[rec.surface] ?? cfg.doors.default;
  const firstName = (rec.person_name || "").trim().split(/\s+/)[0] || "Hello";
  const render = (s: string) =>
    s.replaceAll("{name}", firstName)
     .replaceAll("{gesture}", rec.gesture)
     .replaceAll("{window}", String(cfg.window_hours))
     .replaceAll("{door}", door);

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: cfg.from_address,
      to: rec.person_ref,
      subject: render(t.subject),
      text: render(t.body),
    }),
  });
  if (!res.ok) {
    const err = `resend ${res.status}: ${await res.text()}`;
    console.error(err);
    return new Response(err, { status: 500 });
  }

  const { data: latest } = await supa.from("first_gestures").select("notes").eq("id", rec.id).single();
  await supa.from("first_gestures").update({
    acknowledged_at: new Date().toISOString(),
    notes: (latest?.notes ? latest.notes + " | " : "") + `auto-receipt sent (${kind})`,
  }).eq("id", rec.id);

  return ok(`sent ${kind} receipt to ${rec.person_ref}`);
});
