import { describe, expect, it } from "vitest";
import { routeRedirect } from "@/lib/auth/route-rules";

describe("routeRedirect", () => {
  it("sends signed-out visitors of /app to /login with the path in next", () => {
    expect(routeRedirect("/app", "", false)).toBe("/login?next=%2Fapp");
    expect(routeRedirect("/app/history", "?page=2", false)).toBe(
      "/login?next=%2Fapp%2Fhistory%3Fpage%3D2",
    );
  });

  it("lets signed-in users into /app", () => {
    expect(routeRedirect("/app/workout/x", "", true)).toBeNull();
  });

  it("sends signed-in users away from /login and /signup", () => {
    expect(routeRedirect("/login", "", true)).toBe("/app");
    expect(routeRedirect("/signup", "", true)).toBe("/app");
    expect(routeRedirect("/login", "", false)).toBeNull();
  });

  it("keeps the admin rules", () => {
    expect(routeRedirect("/admin", "", false)).toBe("/admin/login");
    expect(routeRedirect("/admin/login", "", false)).toBeNull();
    expect(routeRedirect("/admin/login", "", true)).toBe("/admin");
    expect(routeRedirect("/admin", "", true)).toBeNull();
  });

  it("does not treat look-alike paths as protected", () => {
    expect(routeRedirect("/application", "", false)).toBeNull();
    expect(routeRedirect("/administrator", "", false)).toBeNull();
  });
});
