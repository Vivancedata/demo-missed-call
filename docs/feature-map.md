# Feature map

Everything a visitor can reach in the demo, from their side. The whole app is
one page (`/`) and one route behind it (`POST /api/extract`).

| Feature | Where | How to reach it | How to check it works |
|---|---|---|---|
| See what the demo does | `/` | Open the page | Tab title is "Missed-call demo — Vivancedata"; the heading reads "The 9pm voicemail, triaged by morning"; the intro says nothing you submit is stored. |
| Told what to add before triaging | `/`, under "Triage the call" | Open the page with the transcript box empty | "Triage the call" is disabled and the hint "Paste a transcript, or pick one of the samples above." shows under it. |
| Paste your own voicemail transcript | `/`, "Voicemail transcript" box | Type or paste into "Paste a voicemail transcript here…" | "Triage the call" becomes enabled and the hint goes away. Whitespace alone does not enable it. |
| Load the 9pm no-heat sample | `/`, "Sample: 9pm no-heat call" button | Click it | The box fills with text starting `[SAMPLE VOICEMAIL TRANSCRIPT -- fictional]` (Marta Villegas, furnace out, a `[garbled]` stretch) and triage is enabled. |
| Load the quote-request sample | `/`, "Sample: quote request" button | Click it | The box fills with the fictional Gene mini-split call, ending `[message cuts off]`. |
| Triage a call | `/`, "Triage the call" button | Load a sample, click "Triage the call" | Needs `ANTHROPIC_API_KEY` on the server. With it: the button shows "Listening…", then an intent badge (Emergency for the no-heat sample) and an urgency badge (Tonight), Caller, Callback and Location (— when absent), a summary, "Reply, ready to send", and a "Flagged, not guessed" list for the garbled callback number. Editing the transcript clears the result. |
| See why triage failed | `/`, under the "Triage the call" button | Trigger an error, e.g. no API key on the server | Without the key: "The demo is offline: ANTHROPIC_API_KEY is not configured on the server…" appears in red under the button. Other failures show the server's message, or "Request failed (status). Try again in a moment." |
| Be offered a call | `/`, "Book a call" link, after a result | Triage a call, scroll below the result | "Book a call" links to `https://www.vivancedata.com/contact?utm_source=demo-missed-call`. |
| Visit Vivancedata | `/`, footer | Click "Vivancedata" in "Built by Vivancedata" | Opens `https://www.vivancedata.com`. |
| The triage endpoint | `POST /api/extract` with `{"text": "…"}` | Used by the page; only from the demo's own origin | Another origin gets 403; no API key 503; blank text 400; over 20,000 characters 413; the 11th request from one client within 10 minutes 429 "Rate limited — try again in 600s". |
