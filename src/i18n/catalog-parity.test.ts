// src/i18n/catalog-parity.test.ts
// Verifies GU/HI catalogs have the same top-level keys as EN + a _review marker.
// This catches missing translations early. Per testing-practices.md: this IS worth
// testing — a missing key causes a runtime error or falls back silently in production.

import { describe, it, expect } from "vitest";
import enCommon from "./messages/en/common.json";
import enLanding from "./messages/en/landing.json";
import enPortal from "./messages/en/portal.json";
import enAdmin from "./messages/en/admin.json";
import guCommon from "./messages/gu/common.json";
import guLanding from "./messages/gu/landing.json";
import guPortal from "./messages/gu/portal.json";
import guAdmin from "./messages/gu/admin.json";
import hiCommon from "./messages/hi/common.json";
import hiLanding from "./messages/hi/landing.json";
import hiPortal from "./messages/hi/portal.json";
import hiAdmin from "./messages/hi/admin.json";

type MsgFile = Record<string, unknown>;

function topLevelKeys(obj: MsgFile): string[] {
  return Object.keys(obj).filter((k) => k !== "_review" && k !== "_meta");
}

const cases: Array<{ name: string; en: MsgFile; gu: MsgFile; hi: MsgFile }> = [
  { name: "common", en: enCommon, gu: guCommon, hi: hiCommon },
  { name: "landing", en: enLanding, gu: guLanding, hi: hiLanding },
  { name: "portal", en: enPortal, gu: guPortal, hi: hiPortal },
  { name: "admin", en: enAdmin, gu: guAdmin, hi: hiAdmin },
];

describe("Catalog parity (GU/HI ⊇ EN top-level keys)", () => {
  for (const { name, en, gu, hi } of cases) {
    const enKeys = topLevelKeys(en);

    it(`gu/${name}.json has all EN top-level keys`, () => {
      const guKeys = topLevelKeys(gu);
      for (const key of enKeys) {
        expect(guKeys, `missing key "${key}" in gu/${name}.json`).toContain(key);
      }
    });

    it(`hi/${name}.json has all EN top-level keys`, () => {
      const hiKeys = topLevelKeys(hi);
      for (const key of enKeys) {
        expect(hiKeys, `missing key "${key}" in hi/${name}.json`).toContain(key);
      }
    });

    it(`gu/${name}.json has _review: "pending"`, () => {
      expect((gu as { _review?: string })._review).toBe("pending");
    });

    it(`hi/${name}.json has _review: "pending"`, () => {
      expect((hi as { _review?: string })._review).toBe("pending");
    });
  }
});
