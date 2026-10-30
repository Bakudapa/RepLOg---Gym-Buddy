import { describe, expect, it } from "vitest";
import { safeRedirect } from "@/lib/safe-redirect";

describe("safeRedirect", () => {
  it.each([
    "/app",
    "/app/history",
    "/app/history?page=2",
    "/app/exercises/bench%20press#top",
  ])("accepts internal path %s", (path) => {
    expect(safeRedirect(path)).toBe(path);
  });

  it.each([
    "//evil.com",
    "https://evil.com",
    "http://evil.com/app",
    "/\\evil.com",
    "\\\\evil.com",
    "javascript:alert(1)",
    "app/history",
    "/\t/evil.com",
    "",
    null,
    undefined,
    42,
  ])("rejects %j", (value) => {
    expect(safeRedirect(value)).toBe("/app");
  });

  it("uses the given fallback", () => {
    expect(safeRedirect("//evil.com", "/")).toBe("/");
  });
});
