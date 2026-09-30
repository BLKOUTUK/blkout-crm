// being-met-hub-join — being-met spec phase 2: Hub joins into the record.
//
// Receives Heartbeat's USER_JOIN webhook (payload { id, name, email }) and writes one
// first_gestures row: surface 'hub', source_table 'heartbeat_users', source_ref = Heartbeat
// user id. Idempotent through public.being_met_record_external.
//
// Heartbeat does not sign webhooks, so the payload is never trusted: the user is fetched
// back from the Heartbeat API with BLKOUT's key, and the row is written only if that user
// exists and the email matches. A forged call can at most re-record a real member once.
// Nothing from his join answers is stored here (data minimisation; the Hub welcome is row 7,
// after version 1).
//
// OFF by default (being_met_config.hub_join_enabled = false): while off, only test addresses
// (rob@ / rob+…@blkoutuk.com) are recorded, with status 'test'. Registering the webhook in
// Heartbeat is Rob's step (the exact call is in the phase 2 report).
//
// It sends nothing to anyone. acknowledge-gesture v5 sends no receipt for surface 'hub'.
// Every call that reaches a decision writes being_met_doors(hub_join).last_sync_status.

import { createClient } from "npm:@supabase/supabase-js@2";

const TEST_ADDRESS = /^rob(\+[^@]*)?@blkoutuk\.com$/i;
const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

async function doorStatus(status: string) {
  const { error } = await supa.from("being_met_doors")
    .update({ last_sync_at: new Date().toISOString(), last_sync_status: status.slice(0, 500) })
    .eq("key", "hub_join");
  if (error) console.error("FAILED to write door status", error.message);
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("method not allowed", { status: 405 });
  const p = await req.json().catch(() => null);
  const id = typeof p?.id === "string" ? p.id.trim() : "";
  const email = typeof p?.email === "string" ? p.email.trim().toLowerCase() : "";
  if (!/^[0-9a-f-]{36}$/i.test(id) || !email.includes("@")) return new Response("bad payload", { status: 400 });

  try {
    const { data: key, error: kErr } = await supa.rpc("metrics_secret", { p_name: "heartbeat_api_key" });
    if (kErr || !key) throw new Error("heartbeat key unavailable");
    const r = await fetch(`https://api.heartbeat.chat/v0/users/${id}`, { headers: { Authorization: `Bearer ${key}`, Accept: "application/json" } });
    if (r.status === 404 || r.status === 400) {
      await doorStatus(`ok: rejected a join for an id Heartbeat does not know (HTTP ${r.status}); nothing recorded`);
      return new Response("not a Heartbeat user; not recorded", { status: 202 });
    }
    if (!r.ok) throw new Error(`heartbeat GET /users/{id}: HTTP ${r.status}`);
    const u = await r.json();
    if ((u?.email ?? "").trim().toLowerCase() !== email) {
      await doorStatus("ok: rejected a join whose email did not match Heartbeat's record; nothing recorded");
      return new Response("email does not match; not recorded", { status: 202 });
    }

    const test = TEST_ADDRESS.test(email);
    const { data: cfg } = await supa.from("being_met_config").select("hub_join_enabled").eq("id", 1).single();
    if (!cfg) throw new Error("being_met_config row missing");
    if (!cfg.hub_join_enabled && !test) {
      await doorStatus("ok: door off; a real join arrived and was NOT recorded");
      return new Response("door off; not recorded", { status: 202 });
    }

    const { data, error } = await supa.rpc("being_met_record_external", {
      p_surface: "hub",
      p_source_table: "heartbeat_users",
      p_source_ref: id,
      p_person_ref: email,
      p_person_name: (u?.name ?? p?.name ?? "").toString(),
      p_gesture: "joined BLKOUTHUB",
      p_occurred_at: u?.createdAt ?? new Date().toISOString(),
      p_status: test ? "test" : null,
      p_confirmed_at: null,
      p_delivery_outcome: null,
      p_delivery_evidence: null,
    });
    if (error) throw new Error(`write: ${error.message}`);
    if (cfg.hub_join_enabled) {
      await supa.from("being_met_doors").update({ wired_since: new Date().toISOString().slice(0, 10) })
        .eq("key", "hub_join").is("wired_since", null);
    }
    await doorStatus(`ok: join ${data}${test ? " (test address)" : ""}`);
    return Response.json({ ok: true, result: data, test });
  } catch (e) {
    const msg = `FAILED: ${(e as Error).message}`;
    console.error(msg);
    await doorStatus(msg);
    return new Response(msg, { status: 500 });
  }
});
