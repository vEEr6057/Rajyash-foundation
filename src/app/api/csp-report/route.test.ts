import { describe, it, expect, vi, beforeEach } from "vitest";

const warn = vi.fn();
vi.mock("@/lib/logger", () => ({
  logger: { warn: (...a: unknown[]) => warn(...a), error: vi.fn() },
}));

import { POST } from "./route";

const post = (body: string, contentType = "application/csp-report") =>
  POST(
    new Request("http://localhost/api/csp-report", {
      method: "POST",
      body,
      headers: { "content-type": contentType },
    }),
  );

beforeEach(() => warn.mockReset());

describe("POST /api/csp-report", () => {
  it("always answers 204, even for a garbage / non-JSON body", async () => {
    const res = await post("this is not json {{{");
    expect(res.status).toBe(204);
    expect(warn).not.toHaveBeenCalled();
  });

  it("parses the application/csp-report shape (hyphenated keys)", async () => {
    const res = await post(
      JSON.stringify({
        "csp-report": {
          "blocked-uri": "https://evil.example/x.js",
          "violated-directive": "script-src",
          "document-uri": "https://app.example/page",
        },
      }),
    );
    expect(res.status).toBe(204);
    expect(warn).toHaveBeenCalledWith("csp-violation", {
      blockedUri: "https://evil.example/x.js",
      violatedDirective: "script-src",
      documentUri: "https://app.example/page",
    });
  });

  it("parses the reports+json shape (array + body/camelCase keys)", async () => {
    const res = await post(
      JSON.stringify([
        {
          type: "csp-violation",
          body: {
            blockedURL: "https://evil.example/y.js",
            effectiveDirective: "script-src-elem",
            documentURL: "https://app.example/other",
          },
        },
      ]),
      "application/reports+json",
    );
    expect(res.status).toBe(204);
    expect(warn).toHaveBeenCalledWith("csp-violation", {
      blockedUri: "https://evil.example/y.js",
      violatedDirective: "script-src-elem",
      documentUri: "https://app.example/other",
    });
  });

  it("truncates over-long fields", async () => {
    const long = "https://evil.example/" + "a".repeat(1000);
    await post(JSON.stringify({ "csp-report": { "blocked-uri": long } }));
    const logged = warn.mock.calls[0][1] as { blockedUri: string };
    expect(logged.blockedUri.length).toBe(300);
  });
});
