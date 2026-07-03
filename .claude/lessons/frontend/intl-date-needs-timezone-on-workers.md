# Date/time formatters render in Worker UTC unless timeZone is pinned

**2026-07-03 · frontend/MEDIUM/verified**

## Symptom
Pickup windows showed **5.5 h early** in prod (entered 2:00 pm → displayed 8:30 am), and
the edit form pre-filled the shifted value (compounding on re-save). Seed data looked fine
only because it happened to be stored at UTC-looking values.

## Root cause
`new Intl.DateTimeFormat("en-IN", { hour, minute, … })` and `toLocaleDateString(...)` with
**no `timeZone` option** format in the *runtime's* timezone. Cloudflare Workers run in
**UTC**, so a single-city IST app rendered every time 5:30 off. `toDatetimeLocal()` using
`d.getHours()` had the same bug (getHours = UTC on the Worker) → the edit prefill was wrong.

## Fix
Pin the app timezone on every date/time formatter that shows a time-of-day or a
date-at-boundary:
```ts
export const APP_TIME_ZONE = "Asia/Kolkata";
new Intl.DateTimeFormat("en-IN", { timeZone: APP_TIME_ZONE, hour: "numeric", … })
```
For `<input type="datetime-local">` prefill, build the value from IST parts via
`Intl.DateTimeFormat("en-CA", { timeZone: APP_TIME_ZONE, … }).formatToParts()`, not
`d.getHours()`. Also pin day-only formatters (`day/month`) — a UTC vs IST midnight can shift
the displayed day.

## Applies to
Any date/time rendered server-side on Workers (or any UTC runtime) for a fixed-locale app.
Grep for `Intl.DateTimeFormat`, `toLocale*String`, `getHours/getDate` in date code.
