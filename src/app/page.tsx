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

/**
 * The waveform is this demo's signature. All three VivanceData demos share one
 * shell -- black ground, green mono eyebrow, a paste box -- which made them
 * indistinguishable from each other in a tab strip. The mark names the input
 * (a voicemail), and `--chart-1` tints it: the chart ramp is the same
 * green-to-cyan family as the brand and the hero mesh, so the three demos read
 * as siblings rather than as three unrelated pages.
 */
const Waveform = () => (
  <svg viewBox="0 0 20 20" className="h-5 w-5 shrink-0 text-chart-1" aria-hidden="true">
    <g stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <path d="M2.5 8.5v3M6 5.5v9M9.5 3v14M13 6.5v7M16.5 9v2" />
    </g>
  </svg>
);

const Spinner = () => (
  <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 animate-spin" fill="none" aria-hidden="true">
    <circle cx="8" cy="8" r="6" stroke="currentColor" strokeOpacity="0.35" strokeWidth="2" />
    <path d="M14 8a6 6 0 0 0-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

/**
 * The primary action carries the brand green the eyebrow already uses.
 *
 * It used to be `bg-primary ... disabled:opacity-50`. In dark mode `--primary`
 * is a near-white pill, so at 50% on a black sheet it landed as flat mid-grey --
 * and because the page loads with an empty box, that half-dead grey was the
 * FIRST thing anyone saw. The control was not broken, but it looked it.
 *
 * Five states, each distinguishable from the others by more than opacity:
 *   idle      solid brand green fill
 *   hover     brightened
 *   active    dimmed, nudged 1px down
 *   focus     a light ring, offset clear of the card
 *   busy      still green but dimmed, with a spinner -- work in flight
 *   disabled  hollow: hairline border, no fill, muted label, plus a line of
 *             copy saying what would turn it on
 */
const ACTION_BASE =
  "mt-4 inline-flex min-h-10 items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-card";
const ACTION_IDLE =
  "bg-brand text-brand-foreground hover:brightness-110 active:translate-y-px active:brightness-95";
const ACTION_BUSY = "cursor-progress bg-brand/70 text-brand-foreground";
const ACTION_OFF = "cursor-not-allowed border border-border bg-transparent text-mute";

/* Sample chips are real buttons and were already tabbable, but had no focus
 * style at all -- keyboard users could not see where they were. */
const CHIP =
  "rounded-md border border-border px-3 py-1.5 text-sm transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card";

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

  const hasInput = text.trim().length > 0;

  return (
    <>
      {/* flex-1 + justify-center: the card used to sit in the top third with
          the rest of the viewport left as void. Centring it and pinning the
          footer as a band makes the page look composed rather than truncated.
          `flex-1` in a column will not shrink below its content, so a long
          result still lays out top-down and scrolls normally. */}
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-6 py-16">
      <div className="flex items-center gap-2.5">
        <Waveform />
        <p className="font-mono text-xs uppercase tracking-widest text-brand">
          VivanceData demo — calls after you close
        </p>
      </div>
      <h1 className="mt-4 text-display text-balance">
        The 9pm voicemail, triaged by morning
      </h1>
      <p className="mt-4 max-w-prose text-muted-foreground">
        In production this sits behind your business number. This page is the
        simulation: paste a voicemail transcript and see what the dispatcher
        sees — intent, urgency, callback details, and a reply ready to send.
        Garbled parts get flagged, because a wrong callback number is worse
        than a flagged one. Nothing you submit is stored.
      </p>

      <div className="mt-10 rounded-md border border-t-2 border-border border-t-chart-1/60 bg-card p-6">
        <div className="flex flex-wrap items-center gap-3">
          <button
            className={CHIP}
            onClick={() => { setText(SAMPLE_NO_HEAT); setCall(null); }}
          >
            Sample: 9pm no-heat call
          </button>
          <button
            className={CHIP}
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
          className={`${ACTION_BASE} ${busy ? ACTION_BUSY : hasInput ? ACTION_IDLE : ACTION_OFF}`}
          disabled={busy || !hasInput}
          aria-busy={busy}
          onClick={triage}
        >
          {busy ? <Spinner /> : null}
          {busy ? "Listening…" : "Triage the call"}
        </button>
        {!busy && !hasInput ? (
          <p className="mt-3 text-sm text-mute">
            Paste a transcript, or take one of the samples above, and this turns on.
          </p>
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
              <h3 className="font-mono text-xs uppercase tracking-wider text-brand">
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

      </main>

      <footer className="border-t border-border bg-card">
        <div className="mx-auto max-w-3xl px-6 py-8 text-sm text-muted-foreground">
          Built by{" "}
          <a
            className="rounded-sm text-brand underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
            href="https://www.vivancedata.com"
          >
            VivanceData
          </a>{" "}
          — in production this runs on your phone line, not a paste box.
        </div>
      </footer>
    </>
  );
}
