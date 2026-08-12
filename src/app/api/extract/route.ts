import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
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
  image?: { media_type: "image/jpeg" | "image/png" | "image/webp"; data: string };
};

export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not configured on the server." },
      { status: 503 },
    );
  }

  let payload: Payload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Body must be JSON." }, { status: 400 });
  }

  const hasText = typeof payload.text === "string" && payload.text.trim().length > 0;
  const hasImage = Boolean(payload.image?.data && payload.image.media_type);
  if (!hasText && !hasImage) {
    return NextResponse.json(
      { error: "Provide `text` or `image` to extract from." },
      { status: 400 },
    );
  }
  // ~7MB base64 ≈ 5MB image, Claude's per-image ceiling.
  if (hasImage && payload.image!.data.length > 7_000_000) {
    return NextResponse.json({ error: "Image too large (5MB max)." }, { status: 413 });
  }

  const content: Anthropic.ContentBlockParam[] = hasImage
    ? [
        {
          type: "image",
          source: {
            type: "base64",
            media_type: payload.image!.media_type,
            data: payload.image!.data,
          },
        },
        { type: "text", text: "Extract this document into the record schema." },
      ]
    : [
        {
          type: "text",
          text: `Extract this document into the record schema.\n\n<document>\n${payload.text}\n</document>`,
        },
      ];

  const client = new Anthropic();
  try {
    const response = await client.messages.create({
      model: "claude-opus-5",
      max_tokens: 8000,
      system: SYSTEM,
      messages: [{ role: "user", content }],
      output_config: {
        format: { type: "json_schema", schema: TRIAGE_SCHEMA },
      },
    });

    const text = response.content.find((b) => b.type === "text");
    if (!text || text.type !== "text") {
      return NextResponse.json({ error: "Model returned no output." }, { status: 502 });
    }
    // output_config guarantees the text parses against TRIAGE_SCHEMA.
    return NextResponse.json({ record: JSON.parse(text.text) });
  } catch (error) {
    if (error instanceof Anthropic.APIError) {
      const friendly =
        error instanceof Anthropic.AuthenticationError
          ? "The server's API key was rejected."
          : error instanceof Anthropic.RateLimitError
            ? "Rate limited — try again in a moment."
            : `Extraction failed (${error.status}).`;
      return NextResponse.json({ error: friendly }, { status: 502 });
    }
    throw error;
  }
}
