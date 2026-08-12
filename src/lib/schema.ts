/**
 * A voicemail triaged into something the morning dispatcher can act on in
 * one glance. Browser simulation of the phone-line service: in production
 * this sits behind the business number; here the transcript is pasted in.
 */
export interface TriagedCall {
  intent: "emergency" | "service_request" | "quote_request" | "reschedule" | "vendor_or_spam" | "unclear";
  urgency: "tonight" | "next_business_day" | "this_week" | "whenever";
  caller_name: string;
  callback_number: string;
  address_or_location: string;
  /** The problem in the caller's own terms, one line. */
  issue_summary: string;
  /** Ready-to-send reply draft. Empty when intent is vendor_or_spam. */
  suggested_reply: string;
  /** Anything garbled or uncertain in the transcript, verbatim. */
  flagged_as_unclear: string[];
}

export const TRIAGE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "intent", "urgency", "caller_name", "callback_number",
    "address_or_location", "issue_summary", "suggested_reply",
    "flagged_as_unclear",
  ],
  properties: {
    intent: {
      type: "string",
      enum: ["emergency", "service_request", "quote_request", "reschedule", "vendor_or_spam", "unclear"],
    },
    urgency: {
      type: "string",
      enum: ["tonight", "next_business_day", "this_week", "whenever"],
    },
    caller_name: { type: "string" },
    callback_number: { type: "string" },
    address_or_location: { type: "string" },
    issue_summary: { type: "string" },
    suggested_reply: { type: "string" },
    flagged_as_unclear: { type: "array", items: { type: "string" } },
  },
} as const;
