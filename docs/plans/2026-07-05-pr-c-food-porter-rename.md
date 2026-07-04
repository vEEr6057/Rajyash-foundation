# PR-C — Rename: "Food Rescue" → "Food Porter"

Branch: `chore/food-porter-rename` → `main`. Foundation's official product name is
**Food Porter** (their 2023 program name). Mechanical sweep, but i18n needs care.

## Scope — what changes

1. **User-facing strings** — sweep `src/messages/en.json`, `gu.json`, `hi.json` for
   "Food Rescue"/"food rescue" (and any "Rajyash Food Rescue"). Replacements:
   - EN: `Food Porter` / `Rajyash Food Porter`
   - GU: `ફૂડ પોર્ટર` (transliteration; the program is known by this name)
   - HI: `फूड पोर्टर`
   Do NOT blind-replace generic uses of the *verb* "rescue" in copy ("rescued meals",
   "meals rescued") — those stay; only the product NAME changes. Review each hit.
2. **Metadata** — root layout `metadata` (title/description/openGraph), `manifest.ts`
   (name, short_name), `sitemap.ts`/`robots.ts` if they embed the name.
3. **Emails** — `src/server/notifications/email.ts` sender name + subjects/templates.
4. **PWA/install strings**, sign-in/up page headings, onboarding copy.
5. **Docs**: README title if present.

## Deliberately NOT changed

- `package.json` name + `wrangler.jsonc` `"name": "rajyash-food-rescue"` — internal ids;
  renaming the Worker would orphan the deployed one. Rename at domain-cutover time if
  desired (one line + `wrangler delete` of the old worker).
- Repo name, branch names, historical docs/plans/lessons.
- Code identifiers (routes, variables) — zero user visibility, pure churn.

## Method

`grep -rn -i "food rescue" src/ docs/README* --include="*.{ts,tsx,json}"` → classify each
hit (name vs verb) → edit. Then `pnpm test:run` (i18n key-parity tests exist and will
catch a broken JSON) + visually load / (all 3 locales), /donate, sign-in, onboarding.

## Definition of done

No user-visible "Food Rescue" remains in any locale; app title, manifest, and email
sender all say Food Porter; typecheck/lint/tests/build green.
