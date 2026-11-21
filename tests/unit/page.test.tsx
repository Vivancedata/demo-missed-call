// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import Home from "@/app/page";
import { SAMPLE_NO_HEAT, SAMPLE_QUOTE } from "@/lib/samples";
import type { TriagedCall } from "@/lib/schema";

const EMERGENCY: TriagedCall = {
  intent: "emergency",
  urgency: "tonight",
  caller_name: "Marta Villegas",
  callback_number: "555-0163",
  address_or_location: "615 Cordell Ave",
  issue_summary: "Furnace quit; freezing night; baby in the house.",
  suggested_reply: "Hi Marta, we got your message about the furnace and are calling you back now.",
  flagged_as_unclear: ["[garbled] before “otherwise first thing tomorrow”"],
};

const SPAM: TriagedCall = {
  intent: "vendor_or_spam",
  urgency: "whenever",
  caller_name: "",
  callback_number: "",
  address_or_location: "",
  issue_summary: "Robocall about extended warranties.",
  suggested_reply: "",
  flagged_as_unclear: [],
};

function mockFetch(status: number, body: unknown) {
  const fetchMock = vi.fn<typeof fetch>(async () =>
    new Response(typeof body === "string" ? body : JSON.stringify(body), { status }),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

const submit = () => screen.getByRole("button", { name: /triage the call/i });
const transcript = () => screen.getByRole("textbox", { name: /voicemail transcript/i });

describe("missed-call page", () => {
  it("renders the pitch and a disabled submit with a hint", () => {
    render(<Home />);
    expect(screen.getByRole("heading", { level: 1, name: /9pm voicemail, triaged by morning/i })).toBeVisible();
    expect(transcript()).toHaveValue("");
    expect(submit()).toBeDisabled();
    expect(screen.getByText(/paste a transcript, or pick one of the samples/i)).toBeVisible();
  });

  it("loads either sample transcript", async () => {
    const user = userEvent.setup();
    render(<Home />);
    await user.click(screen.getByRole("button", { name: /9pm no-heat call/i }));
    expect(transcript()).toHaveValue(SAMPLE_NO_HEAT);
    await user.click(screen.getByRole("button", { name: /quote request/i }));
    expect(transcript()).toHaveValue(SAMPLE_QUOTE);
    expect(submit()).toBeEnabled();
  });

  it("does not enable triage for whitespace", async () => {
    const user = userEvent.setup();
    render(<Home />);
    await user.type(transcript(), "   ");
    expect(submit()).toBeDisabled();
  });

  it("posts the transcript and shows what the dispatcher needs", async () => {
    const user = userEvent.setup();
    const fetchMock = mockFetch(200, { record: EMERGENCY });
    render(<Home />);
    await user.click(screen.getByRole("button", { name: /9pm no-heat call/i }));
    await user.click(submit());

    expect(await screen.findByText("Emergency")).toBeVisible();
    expect(fetchMock).toHaveBeenCalledWith("/api/extract", expect.objectContaining({ method: "POST" }));
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({ text: SAMPLE_NO_HEAT });

    expect(screen.getByText("Emergency")).toHaveClass("text-destructive");
    expect(screen.getByText("Tonight")).toBeVisible();
    expect(screen.getByText("Marta Villegas")).toBeVisible();
    expect(screen.getByText("555-0163")).toBeVisible();
    expect(screen.getByText("615 Cordell Ave")).toBeVisible();
    expect(screen.getByRole("heading", { name: /reply, ready to send/i })).toBeVisible();
    expect(screen.getByText(EMERGENCY.suggested_reply)).toBeVisible();
    expect(screen.getByRole("heading", { name: /flagged, not guessed/i })).toBeVisible();
    expect(screen.getByText("Call triaged. The result is below.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /book a call/i })).toHaveAttribute(
      "href",
      "https://www.vivancedata.com/contact?utm_source=demo-missed-call",
    );
  });

  it("shows dashes for missing details and no reply or flags when there are none", async () => {
    const user = userEvent.setup();
    mockFetch(200, { record: SPAM });
    render(<Home />);
    await user.type(transcript(), "Congratulations, your warranty…");
    await user.click(submit());

    const badge = await screen.findByText("Vendor / spam");
    expect(badge).not.toHaveClass("text-destructive");
    expect(screen.getByText("Whenever")).toBeVisible();
    for (const label of ["Caller", "Callback", "Location"]) {
      expect(screen.getByText(label).nextElementSibling).toHaveTextContent("—");
    }
    expect(screen.queryByRole("heading", { name: /reply, ready to send/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /flagged, not guessed/i })).not.toBeInTheDocument();
  });

  it("clears a stale result as soon as the transcript is edited", async () => {
    const user = userEvent.setup();
    mockFetch(200, { record: EMERGENCY });
    render(<Home />);
    await user.click(screen.getByRole("button", { name: /9pm no-heat call/i }));
    await user.click(submit());
    await screen.findByText("Emergency");

    await user.type(transcript(), "!");
    expect(screen.queryByText("Emergency")).not.toBeInTheDocument();
  });

  it("shows the server's error message", async () => {
    const user = userEvent.setup();
    mockFetch(503, { error: "The demo is offline: ANTHROPIC_API_KEY is not configured on the server." });
    render(<Home />);
    await user.click(screen.getByRole("button", { name: /quote request/i }));
    await user.click(submit());
    expect(await screen.findByText(/the demo is offline/i)).toBeVisible();
  });

  it("falls back to a status message when the response is not JSON (proxy timeout)", async () => {
    const user = userEvent.setup();
    mockFetch(504, "<html>Gateway Timeout</html>");
    render(<Home />);
    await user.click(screen.getByRole("button", { name: /quote request/i }));
    await user.click(submit());
    expect(await screen.findByText(/request failed \(504\)/i)).toBeVisible();
  });
});
