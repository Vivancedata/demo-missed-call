import { describe, expect, expectTypeOf, it } from "vitest";
import { SAMPLE_NO_HEAT, SAMPLE_QUOTE } from "@/lib/samples";
import { TRIAGE_SCHEMA, type TriagedCall } from "@/lib/schema";

describe("TRIAGE_SCHEMA", () => {
  it("requires exactly the fields of TriagedCall and allows nothing else", () => {
    expect(TRIAGE_SCHEMA.additionalProperties).toBe(false);
    expect([...TRIAGE_SCHEMA.required].sort()).toEqual(Object.keys(TRIAGE_SCHEMA.properties).sort());
    expectTypeOf<(typeof TRIAGE_SCHEMA.required)[number]>().toEqualTypeOf<keyof TriagedCall>();
  });

  it("keeps its enums in step with the TypeScript unions the UI labels", () => {
    expectTypeOf<(typeof TRIAGE_SCHEMA.properties.intent.enum)[number]>().toEqualTypeOf<TriagedCall["intent"]>();
    expectTypeOf<(typeof TRIAGE_SCHEMA.properties.urgency.enum)[number]>().toEqualTypeOf<TriagedCall["urgency"]>();
    // "unclear" must stay available so the model never has to guess an intent.
    expect(TRIAGE_SCHEMA.properties.intent.enum).toContain("unclear");
  });
});

describe("samples", () => {
  it("are labelled fictional in their first line", () => {
    for (const sample of [SAMPLE_NO_HEAT, SAMPLE_QUOTE]) {
      expect(sample.split("\n")[0]).toMatch(/SAMPLE VOICEMAIL TRANSCRIPT.*fictional/);
    }
  });

  it("keep the deliberate defects that make flagging show on first click", () => {
    expect(SAMPLE_NO_HEAT).toContain("[garbled]");
    expect(SAMPLE_QUOTE).toContain("[message cuts off]");
  });

  it("use 555-01xx numbers, which are reserved for fiction", () => {
    expect(SAMPLE_NO_HEAT).toMatch(/555-01\d\d/);
  });
});
