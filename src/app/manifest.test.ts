import { describe, it, expect } from "vitest";
import manifest from "./manifest";

describe("manifest() — PWA manifest route handler (PUB-04)", () => {
  const result = manifest();

  it("test 1: name === 'Rajyash Food Rescue'", () => {
    expect(result.name).toBe("Rajyash Food Rescue");
  });

  it("test 2: display === 'standalone'", () => {
    expect(result.display).toBe("standalone");
  });

  it("test 3: icons array contains /icon-192.png, /icon-512.png, /icon-512-maskable.png", () => {
    const srcs = result.icons?.map((i) => i.src) ?? [];
    expect(srcs).toContain("/icon-192.png");
    expect(srcs).toContain("/icon-512.png");
    expect(srcs).toContain("/icon-512-maskable.png");
  });

  it("test 4: theme_color === '#C04E12' and background_color === '#FBF7F0'", () => {
    expect(result.theme_color).toBe("#C04E12");
    expect(result.background_color).toBe("#FBF7F0");
  });
});
