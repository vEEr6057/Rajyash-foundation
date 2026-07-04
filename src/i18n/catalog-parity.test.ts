// src/i18n/catalog-parity.test.ts
// Verifies GU/HI catalogs have the same key paths as EN (recursive deep check) + a _review marker.
// This catches missing translations early. Per testing-practices.md: this IS worth
// testing — a missing key causes a runtime error or falls back silently in production.

import { describe, it, expect } from "vitest";
import enCommon from "./messages/en/common.json";
import enLanding from "./messages/en/landing.json";
import enPortal from "./messages/en/portal.json";
import enAdmin from "./messages/en/admin.json";
import enOnboarding from "./messages/en/onboarding.json";
import enPrivacy from "./messages/en/privacy.json";
import guCommon from "./messages/gu/common.json";
import guLanding from "./messages/gu/landing.json";
import guPortal from "./messages/gu/portal.json";
import guAdmin from "./messages/gu/admin.json";
import guOnboarding from "./messages/gu/onboarding.json";
import guPrivacy from "./messages/gu/privacy.json";
import hiCommon from "./messages/hi/common.json";
import hiLanding from "./messages/hi/landing.json";
import hiPortal from "./messages/hi/portal.json";
import hiAdmin from "./messages/hi/admin.json";
import hiOnboarding from "./messages/hi/onboarding.json";
import hiPrivacy from "./messages/hi/privacy.json";

type MsgObj = Record<string, unknown>;

const META_KEYS = new Set(["_review", "_meta"]);

/**
 * Recursively collect all leaf key-paths from an object, ignoring _review and _meta.
 * e.g. { a: { b: "x", c: "y" } } → ["a.b", "a.c"]
 */
function collectKeyPaths(obj: MsgObj, prefix = ""): string[] {
  const paths: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    if (META_KEYS.has(k)) continue;
    const full = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === "object" && !Array.isArray(v)) {
      paths.push(...collectKeyPaths(v as MsgObj, full));
    } else {
      paths.push(full);
    }
  }
  return paths;
}

const cases: Array<{ name: string; en: MsgObj; gu: MsgObj; hi: MsgObj }> = [
  { name: "common", en: enCommon, gu: guCommon, hi: hiCommon },
  { name: "landing", en: enLanding, gu: guLanding, hi: hiLanding },
  { name: "portal", en: enPortal, gu: guPortal, hi: hiPortal },
  { name: "admin", en: enAdmin, gu: guAdmin, hi: hiAdmin },
  { name: "onboarding", en: enOnboarding, gu: guOnboarding, hi: hiOnboarding },
  { name: "privacy", en: enPrivacy, gu: guPrivacy, hi: hiPrivacy },
];

describe("Catalog parity (GU/HI ⊇ EN — recursive deep key paths)", () => {
  for (const { name, en, gu, hi } of cases) {
    const enPaths = collectKeyPaths(en);

    it(`gu/${name}.json has all EN key paths (deep)`, () => {
      const guPaths = new Set(collectKeyPaths(gu));
      for (const path of enPaths) {
        expect(guPaths, `missing path "${path}" in gu/${name}.json`).toContain(path);
      }
    });

    it(`hi/${name}.json has all EN key paths (deep)`, () => {
      const hiPaths = new Set(collectKeyPaths(hi));
      for (const path of enPaths) {
        expect(hiPaths, `missing path "${path}" in hi/${name}.json`).toContain(path);
      }
    });

    // onboarding.json is EN-only (no _review needed for EN), GU/HI require the marker
    if (name !== "onboarding") {
      it(`gu/${name}.json has _review: "pending"`, () => {
        expect((gu as { _review?: string })._review).toBe("pending");
      });

      it(`hi/${name}.json has _review: "pending"`, () => {
        expect((hi as { _review?: string })._review).toBe("pending");
      });
    } else {
      it(`gu/${name}.json has _review: "pending"`, () => {
        expect((gu as { _review?: string })._review).toBe("pending");
      });

      it(`hi/${name}.json has _review: "pending"`, () => {
        expect((hi as { _review?: string })._review).toBe("pending");
      });
    }
  }
});
