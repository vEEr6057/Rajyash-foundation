import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { geocodeAddress } from "./geocoding";

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("geocodeAddress — memo + normalization (B1 note 4)", () => {
  it("caches by normalized query so an identical address skips the network", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => [
        { lat: "23.0225", lon: "72.5714", display_name: "Ellisbridge, Ahmedabad" },
      ],
    });

    // Two calls that normalize to the same key (case + whitespace differ).
    const first = await geocodeAddress("Ellisbridge, Ahmedabad");
    const second = await geocodeAddress("  ellisbridge,   ahmedabad ");

    expect(fetchMock).toHaveBeenCalledTimes(1); // second call served from the memo
    expect(second).toEqual(first);
    expect(first).toMatchObject({ lat: 23.0225, lng: 72.5714 });
  });

  it("returns null for a blank address without hitting the network", async () => {
    expect(await geocodeAddress("   ")).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
