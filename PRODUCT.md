# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

The owner of a trade or local-services business — HVAC and plumbing,
construction, logistics — evaluating Vivancedata before paying for anything.
They arrive from a link on vivancedata.com, often on a phone between jobs,
and have usually been sold software before that never got installed. They
give this page under a minute.

They are also, personally, the person the product replaces: the owner who
either answers the phone at 9pm or loses the job to whoever did.

## Product Purpose

A browser simulation of a single Vivancedata service: **the call that comes
in after you close becomes a triaged, bookable job instead of a voicemail
nobody hears until morning** — and an emergency gets seen tonight.

A visitor pastes a voicemail transcript and sees what a dispatcher would see:
intent, urgency, callback details, a one-line issue summary, and an SMS reply
ready to send.

Success is that the visitor recognises their own 9pm no-heat call in the
sample, trusts the triage not to invent a phone number, and books a call.

## Positioning

Two behaviours *are* the product, and both are restraints:

- **A wrong callback number is worse than a flagged one.** Garbled content is
  flagged verbatim, never guessed at. The bundled samples are deliberately
  garbled so the behaviour shows on the first click. A transposed digit means
  the job is lost silently, which is worse than an obvious gap.
- **The reply never promises a time the business has not agreed to.** The
  drafted SMS acknowledges and gathers; it does not book a slot the owner has
  not confirmed.

**This is deliberately a simulation, and says so.** In production the same
triage sits behind the business phone number with telephony and
transcription, and the paste box is replaced by the phone ringing. Presenting
the paste box as the product would be a misrepresentation; the honesty about
what is simulated is itself part of the pitch to a buyer who has been
oversold before.

## Operating Context

- Reached from the marketing site's "Calls after you close" tile and from
  `calls.vivancedata.com`. One of three sibling demos, alongside the
  paperwork demo and the field-capture demo.
- Read on a phone, often outdoors on a poor connection — plausibly by an
  owner who just missed a call.
- Real transcripts are worse than the samples: background noise, half-spoken
  addresses, callers who never say their name.
- The visitor is answering one question: "would this have got me that job?"

## Capabilities and Constraints

- Whole surface is one route (`src/app/page.tsx`) plus one API route
  (`src/app/api/extract/route.ts`). Around 470 lines total.
- Next.js App Router, React, Tailwind, `@anthropic-ai/sdk`. All tokens and
  components come from `@vivancedata/ui`; `src/app/globals.css` adds only the
  Tailwind component and utility layers.
- Input is a pasted voicemail transcript.
- Output is a typed triage record: intent, urgency, caller name, callback
  number, address or location, issue summary, a suggested reply, and a
  flagged-unclear list.
- **It is not a product.** No accounts, no database, no server-side
  persistence, and no telephony — the phone integration is the thing being
  simulated.
- Rate limited to 10 requests per IP per 10 minutes, in memory — deliberately
  not a billing guarantee, since a cold start or a second instance resets the
  counter. It exists to make abuse boring.
- The extraction API key lives in `.env.local` locally and in the Vercel
  project environment. Never read, printed or committed.
- Deployed on Vercel.

## Brand Commitments

- The name is **Vivancedata**, one word, capital V. The "VivanceData"
  spelling still present in this app's page title, eyebrow and footer link is
  a defect, not a variant.
- Voice is first person singular and names the job, not the technology,
  matching the marketing site's hero register.
- Visual language is the shared `@vivancedata/ui` contract: ink on a sheet,
  depth as a hairline, one green accent. This app ships **dark only** —
  `layout.tsx` hard-codes `class="dark"` and there is no toggle.
- Each demo takes one hue from the chart ramp for its page mark so the three
  read as siblings. This one's mark is a waveform.

## Evidence on Hand

- Two bundled fictional voicemail samples in `src/lib/samples.ts`: a no-heat
  emergency and a quote request. Both declare they are fictional in their
  first line and are deliberately garbled so the flagging behaviour shows.
- The live deployment at `calls.vivancedata.com`.

**Absences that must never be fabricated:** no real voicemails, no recovered
revenue figure, no response-time claim, no answer-rate statistic, no
testimonial, no certification. The practice has no client who has agreed to
be named. Any number shown must come from what the visitor just submitted.

## Product Principles

1. **Flagged beats guessed, and a phone number is the sharpest case.** A
   confidently wrong callback number loses the job silently.
2. **Promise nothing the business has not agreed to.** The drafted reply is
   bound by what the owner actually offers.
3. **Be honest that it is a simulation.** The buyer has been oversold before;
   naming the boundary is what earns the call.
4. **Prove on their voicemail, not ours.** Samples exist to reach the result
   fast; persuasion happens when they paste a real transcript.
5. **A demo that never converts is decoration.** Offer the next step at the
   moment the visitor is most convinced.

## Accessibility & Inclusion

WCAG 2.1 AA is the floor. The page is read on a phone in daylight and ships
dark-only, so contrast on the dark sheet carries the whole burden. Per the
shared token contract the `mute` and `faint` greys are decorative and must
never carry copy a visitor has to read, including hint copy explaining why a
control is disabled. Urgency must never be conveyed by colour alone.
