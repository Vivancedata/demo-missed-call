# demo-missed-call

A browser simulation of one VivanceData service: **the call that comes in
after you close becomes a triaged, bookable job instead of a voicemail
nobody hears until morning** — and an emergency gets seen tonight.

Paste a voicemail transcript and see what the dispatcher sees: intent,
urgency, callback details, a one-line issue summary, and an SMS reply ready
to send. Two behaviours are the product:

- **A wrong callback number is worse than a flagged one.** Garbled content
  is flagged verbatim, never guessed at — the bundled samples are
  deliberately garbled so that shows on first click.
- **The reply never promises a time the business hasn't agreed to.**

This is deliberately a simulation: in production the same triage sits behind
the business phone number (telephony + transcription), and the paste box is
replaced by the phone ringing. The samples are fictional and say so in their
first line. No accounts, no storage.

## Run it

```bash
npm install
cp .env.example .env.local   # add a real ANTHROPIC_API_KEY
npm run dev                  # http://localhost:3000
```

## How it works

One route handler sends the transcript to Claude (`claude-opus-5`) with a
JSON Schema enforced via `output_config`, so the response always parses
against `src/lib/schema.ts`. "When in doubt, take the more urgent" is in the
system prompt because under-triaging a no-heat call costs more than
over-triaging a quote request.

Sibling demos: [demo-paperwork](https://github.com/Vivancedata/demo-paperwork)
· [demo-field-photos](https://github.com/Vivancedata/demo-field-photos).
All three render in [@vivancedata/ui](https://github.com/Vivancedata/ui).
