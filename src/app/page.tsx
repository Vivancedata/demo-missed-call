"use client";

import { useState } from "react";
import { SAMPLE_NO_HEAT, SAMPLE_QUOTE } from "@/lib/samples";
import type { TriagedCall } from "@/lib/schema";

const INTENT_LABEL: Record<TriagedCall["intent"], string> = {
  emergency: "Emergency",
  service_request: "Service request",
  quote_request: "Quote request",
  reschedule: "Reschedule",
  vendor_or_spam: "Vendor / spam",
  unclear: "Unclear",
};

const URGENCY_LABEL: Record<TriagedCall["urgency"], string> = {
  tonight: "Tonight",
  next_business_day: "Next business day",
  this_week: "This week",
  whenever: "Whenever",
};

export default function Home() {
  const [text, setText] = useState("");
  const [call, setCall] = useState<TriagedCall | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function triage() {
    setBusy(true);
    setError(null);
    setCall(null);
    try {
      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
      setCall(data.record);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Triage failed.");
    } finally {
      setBusy(false);
    }
  }

  const disabled = busy || text.trim().length === 0;

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <p className="text-label uppercase text-mute">
        Vivancedata demo — calls after you close
      </p>
      <h1 className="mt-4 font-display text-serif-lg text-balance">
        The 9pm voicemail, triaged by morning
      </h1>
      <p className="mt-4 max-w-prose text-muted-foreground">
        In production this sits behind your business number. This page is the
        simulation: paste a voicemail transcript and see what the dispatcher
        sees — intent, urgency, callback details, and a reply ready to send.
        Garbled parts get flagged, because a wrong callback number is worse
        than a flagged one. Nothing you submit is stored.
      </p>

      <div className="mt-10 rounded-md border border-border bg-card p-6">
        <div className="flex flex-wrap items-center gap-3">
          <button
            className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-accent"
            onClick={() => { setText(SAMPLE_NO_HEAT); setCall(null); }}
          >
            Sample: 9pm no-heat call
          </button>
          <button
            className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-accent"
            onClick={() => { setText(SAMPLE_QUOTE); setCall(null); }}
          >
            Sample: quote request
          </button>
        </div>

        <textarea
          className="mt-4 h-44 w-full resize-y rounded-md border border-border bg-background p-4 font-mono text-sm"
          placeholder="Paste a voicemail transcript here…"
          value={text}
          onChange={(e) => { setText(e.target.value); setCall(null); }}
        />

        <button
          className={`mt-4 inline-flex min-h-11 items-center rounded-md px-4 text-label uppercase transition-colors ${disabled
            ? "border border-rule text-mute"
            : "bg-primary text-primary-foreground hover:bg-primary/85"}`}
          disabled={disabled}
          onClick={triage}
        >
          {busy ? "Listening…" : "Triage the call"}
        </button>
        {/* The other half of a hollow control is saying what fills it. */}
        {disabled && !busy ? (
          <p className="mt-3 text-caption text-mute">Paste a transcript, or pick one of the samples above.</p>
        ) : null}
        {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
      </div>

      {call ? (
        <section className="mt-10">
          <div className="flex flex-wrap gap-3">
            <span className={`rounded-md border px-3 py-1.5 font-mono text-xs uppercase tracking-wider ${call.intent === "emergency" ? "border-destructive text-destructive" : "border-border text-muted-foreground"}`}>
              {INTENT_LABEL[call.intent]}
            </span>
            <span className="rounded-md border border-border px-3 py-1.5 font-mono text-xs uppercase tracking-wider text-muted-foreground">
              {URGENCY_LABEL[call.urgency]}
            </span>
          </div>

          <dl className="mt-6 grid grid-cols-2 gap-x-8 gap-y-4 text-sm sm:grid-cols-3">
            {[
              ["Caller", call.caller_name],
              ["Callback", call.callback_number],
              ["Location", call.address_or_location],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="font-mono text-xs uppercase tracking-wider text-muted-foreground">{label}</dt>
                <dd className="mt-1">{value || "—"}</dd>
              </div>
            ))}
          </dl>

          <p className="mt-6 text-sm">{call.issue_summary}</p>

          {call.suggested_reply ? (
            <div className="mt-6 rounded-md border border-border p-4">
              <h3 className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                Reply, ready to send
              </h3>
              <p className="mt-2 text-sm">{call.suggested_reply}</p>
            </div>
          ) : null}

          {call.flagged_as_unclear.length > 0 ? (
            <div className="mt-6 rounded-md border border-border p-4">
              <h3 className="text-label uppercase text-foreground">
                Flagged, not guessed
              </h3>
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                {call.flagged_as_unclear.map((f, i) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      ) : null}

      <footer className="mt-16 border-t border-border pt-6 text-sm text-muted-foreground">
        Built by{" "}
        <a className="text-foreground underline decoration-rule underline-offset-4 hover:decoration-current" href="https://www.vivancedata.com">
          Vivancedata
        </a>{" "}
        — in production this runs on your phone line, not a paste box.
      </footer>
    </main>
  );
}
