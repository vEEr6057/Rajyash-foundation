// Test shim: the real `server-only` package throws when imported outside a React
// Server Component (jsdom looks like a client env to it). Aliased here in
// vitest.config.ts so server-side repos/libs can be unit-tested. No-op by design.
export {};
