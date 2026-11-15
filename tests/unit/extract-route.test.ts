import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/extract/route";
import { SAMPLE_NO_HEAT } from "@/lib/samples";
import type { TriagedCall } from "@/lib/schema";

const RECORD: TriagedCall = {
  intent: "emergency",
  urgency: "tonight",
  caller_name: "Marta Villegas",
  callback_number: "555-0163",
  address_or_location: "615 Cordell Ave",
  issue_summary: "Furnace quit; freezing night; baby in the house.",
  suggested_reply: "Hi Marta, we got your message about the furnace and are calling you back now.",
  flagged_as_unclear: ["[garbled] before “otherwise first thing tomorrow”"],
};

let ipCounter = 0;

function post(body: unknown, headers: Record<string, string> = {}): Request {
  ipCounter += 1;
  return new Request("https://calls.vivancedata.com/api/extract", {
    method: "POST",
    headers: {
      origin: "https://calls.vivancedata.com",
      "content-type": "application/json",
      // A distinct client per request keeps the in-memory rate limit out of
      // the way unless a test is about it.
      "x-forwarded-for": `198.51.100.${ipCounter}`,
      ...headers,
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

function anthropicMessage(overrides: Record<string, unknown> = {}) {
  return {
    id: "msg_test",
    type: "message",
    role: "assistant",
    model: "claude-haiku-5-5",
    content: [{ type: "text", text: JSON.stringify(RECORD) }],
    stop_reason: "end_turn",
    stop_sequence: null,
    usage: { input_tokens: 1, output_tokens: 1 },
    ...overrides,
  };
}

/** Stub the network under the real Anthropic SDK. */
function mockAnthropic(status: number, body: unknown) {
  const fetchMock = vi.fn<typeof fetch>(async () =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json", "x-should-retry": "false" },
    }),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function sentBody(fetchMock: ReturnType<typeof mockAnthropic>) {
  return JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
}

beforeEach(() => {
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("ANTHROPIC_API_KEY", "sk-ant-test");
});

describe("POST /api/extract — guards", () => {
  it("refuses requests from other origins before doing anything else", async () => {
    const fetchMock = mockAnthropic(200, anthropicMessage());
    const res = await POST(post({ text: "x" }, { origin: "https://evil.example" }));
    expect(res.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("reports the demo as offline when no API key is configured", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    const res = await POST(post({ text: "x" }));
    expect(res.status).toBe(503);
    expect((await res.json()).error).toMatch(/ANTHROPIC_API_KEY/);
  });

  it.each([
    ["not JSON", "{oops"],
    ["JSON null", "null"],
    ["a JSON array", "[]"],
    ["a JSON string", '"hello"'],
  ])("rejects a body that is %s with 400, not a crash", async (_label, body) => {
    const res = await POST(post(body));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/Body must be JSON/);
  });

  it("requires a non-blank transcript", async () => {
    expect((await POST(post({ text: "   " }))).status).toBe(400);
    expect((await POST(post({}))).status).toBe(400);
  });

  it("does not accept images: the product is transcripts, and images would only spend the key", async () => {
    const fetchMock = mockAnthropic(200, anthropicMessage());
    const res = await POST(post({ image: { media_type: "image/png", data: "iVBORw0KGgo=" } }));
    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("caps the transcript at 20k characters", async () => {
    const res = await POST(post({ text: "a".repeat(20_001) }));
    expect(res.status).toBe(413);
  });

  it("rate-limits one client after 10 triages", async () => {
    mockAnthropic(200, anthropicMessage());
    const headers = { "x-forwarded-for": "192.0.2.77" };
    for (let i = 0; i < 10; i++) {
      expect((await POST(post({ text: "call" }, headers))).status).toBe(200);
    }
    const res = await POST(post({ text: "call" }, headers));
    expect(res.status).toBe(429);
    expect(Number(res.headers.get("retry-after"))).toBeGreaterThan(0);
  });
});

describe("POST /api/extract — triage", () => {
  it("sends the transcript with the triage schema and returns the triaged call", async () => {
    const fetchMock = mockAnthropic(200, anthropicMessage());
    const res = await POST(post({ text: SAMPLE_NO_HEAT }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ record: RECORD });

    const sent = sentBody(fetchMock);
    expect(sent.model).toBe("claude-haiku-5-5");
    expect(sent.output_config.format.type).toBe("json_schema");
    expect(sent.output_config.format.schema.required).toContain("callback_number");
    expect(sent.messages[0].content).toEqual([
      { type: "text", text: `Triage this voicemail transcript.\n\n<transcript>\n${SAMPLE_NO_HEAT}\n</transcript>` },
    ]);
    expect(sent.system).toMatch(/Never invent a name, number or\s+address/);
  });

  it.each([
    ["refusal", "declined"],
    ["max_tokens", "more output"],
  ])("turns stop_reason %s into a readable 502", async (stop_reason, message) => {
    mockAnthropic(200, anthropicMessage({ stop_reason }));
    const res = await POST(post({ text: "call" }));
    expect(res.status).toBe(502);
    expect((await res.json()).error).toMatch(message);
  });

  it("returns 502 when the model produced no text block", async () => {
    mockAnthropic(200, anthropicMessage({ content: [] }));
    const res = await POST(post({ text: "call" }));
    expect(res.status).toBe(502);
  });

  it.each([
    [401, { type: "error", error: { type: "authentication_error", message: "bad key" } }, /API key was rejected/],
    [429, { type: "error", error: { type: "rate_limit_error", message: "slow down" } }, /Rate limited/],
    [400, { type: "error", error: { type: "invalid_request_error", message: "nope" } }, /Extraction failed \(400\)/],
  ])("maps an upstream %i into a friendly 502", async (status, body, message) => {
    mockAnthropic(status, body);
    const res = await POST(post({ text: "call" }));
    expect(res.status).toBe(502);
    expect((await res.json()).error).toMatch(message);
  });
});
