// app/sw.ts — stub for Wave 0 build test; full content added in Plan 07-04
/// <reference lib="webworker" />
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}
declare const self: ServiceWorkerGlobalScope;

// Wave 0: reference __SW_MANIFEST so Serwist InjectManifest plugin can inject it.
// Full Serwist setup (Serwist class, push handlers, precache) is in Plan 07-04.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _manifest = self.__SW_MANIFEST;

export {};
