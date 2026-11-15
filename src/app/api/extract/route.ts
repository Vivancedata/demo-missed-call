import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { isAllowedOrigin } from "@/lib/origin";
import { rateLimit } from "@/lib/rate-limit";
import { TRIAGE_SCHEMA } from "@/lib/schema";

export const maxDuration = 120;

const SYSTEM = `You triage after-hours voicemails for a trades business so the
morning dispatcher can act in one glance -- or so an emergency gets seen
tonight instead of tomorrow.

Rules that are the product, not suggestions:
- Use only what the caller actually said. Never invent a name, number or
  address; absent means an empty string.
- Anything garbled or uncertain goes in flagged_as_unclear verbatim.
  A wrong callback number is worse than a flagged one.
- "emergency" is for safety or property-damage-in-progress (no heat in
  freezing weather, active leak, gas smell). When in doubt between two
  urgency levels, take the more urgent.
- suggested_reply is a short SMS the business could send as-is: plain,
  concrete, no marketing voice, and it must not promise a time the
  business has not agreed to.`;

type Payload = {
  text?: string;
};

export async function POST(request: Request) {
  if (!isAllowedOrigin(request)) {
    return NextResponse.json(
      { error: "This endpoint only serves the demo page it ships with." },
      { status: 403 },
    );
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "The demo is offline: ANTHROPIC_API_KEY is not configured on the server. Set it in the project environment and redeploy." },
      { status: 503 },
    );
  }

  const limit = rateLimit(request);
  if (!limit.ok) {
    return NextResponse.json(
      { error: `Rate limited — try again in ${limit.retryAfterSec}s. This demo allows 10 extractions per 10 minutes.` },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = undefined;
  }
  // `null`, an array or a bare string is valid JSON but not a payload;
  // without this check `payload.text` throws and the route 500s.
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return NextResponse.json({ error: "Body must be JSON. Send `{ \"text\": \"…\" }`." }, { status: 400 });
  }
  const payload = body as Payload;

  if (typeof payload.text === "string" && payload.text.length > 20_000) {
    return NextResponse.json({ error: "Text too long (20k characters max). Shorten it and try again." }, { status: 413 });
  }
  // Transcripts only: the page never sends images, and this prompt is about
  // voicemails, so an image would only be a second, unadvertised way to spend
  // the API key.
  if (typeof payload.text !== "string" || payload.text.trim().length === 0) {
    return NextResponse.json(
      { error: "Provide the voicemail transcript as `text`." },
      { status: 400 },
    );
  }

  const content: Anthropic.ContentBlockParam[] = [
    {
      type: "text",
      text: `Triage this voicemail transcript.\n\n<transcript>\n${payload.text}\n</transcript>`,
    },
  ];

  const client = new Anthropic();
  try {
    const response = await client.messages.create({
      // Haiku: the schema is flat (strings, enums, string arrays) and the job is
      // transcription and matching, not open-ended reasoning. max_tokens covers
      // the largest realistic record plus low-effort thinking, and caps what one
      // request can cost.
      model: "claude-haiku-5-5",
      max_tokens: 2048,
      system: SYSTEM,
      messages: [{ role: "user", content }],
      output_config: {
        effort: "low",
        format: { type: "json_schema", schema: TRIAGE_SCHEMA },
      },
    });

    if (response.stop_reason === "refusal") {
      return NextResponse.json({ error: "The model declined this input. Try a different sample." }, { status: 502 });
    }
    if (response.stop_reason === "max_tokens") {
      return NextResponse.json({ error: "The input produced more output than this demo allows. Try a shorter one." }, { status: 502 });
    }
    const text = response.content.find((b) => b.type === "text");
    if (!text || text.type !== "text") {
      return NextResponse.json({ error: "Model returned no output. Try again." }, { status: 502 });
    }
    // output_config guarantees the text parses against TRIAGE_SCHEMA.
    return NextResponse.json({ record: JSON.parse(text.text) });
  } catch (error) {
    if (error instanceof Anthropic.APIError) {
      const friendly =
        error instanceof Anthropic.AuthenticationError
          ? "The server’s API key was rejected. Check the key in the project environment."
          : error instanceof Anthropic.RateLimitError
            ? "Rate limited — try again in a moment."
            : `Extraction failed (${error.status}). Try again in a moment.`;
      return NextResponse.json({ error: friendly }, { status: 502 });
    }
    throw error;
  }
}
