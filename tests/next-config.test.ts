import { describe, expect, it } from "vitest";
import nextConfig from "@/next.config";

describe("security headers", () => {
  it("sets the NFR4 headers on every route", async () => {
    const rules = await nextConfig.headers!();
    const all = rules.find((rule) => rule.source === "/:path*");
    const headers = Object.fromEntries(
      all!.headers.map((header) => [header.key, header.value]),
    );
    expect(headers["X-Content-Type-Options"]).toBe("nosniff");
    expect(headers["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
    expect(headers["X-Frame-Options"]).toBe("DENY");
    expect(headers["Permissions-Policy"]).toMatch(/camera=\(\)/);
    expect(headers["Permissions-Policy"]).toMatch(/microphone=\(\)/);
    expect(headers["Permissions-Policy"]).toMatch(/geolocation=\(\)/);
  });
});
