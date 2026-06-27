import { describe, it, expect } from "vitest";
import {
  parseLatLngFromGoogleMapsUrl,
  isGoogleMapsUrl,
  isShortGoogleMapsUrl,
  googleMapsDirectionsUrl,
} from "./maps-link";

describe("parseLatLngFromGoogleMapsUrl", () => {
  it("reads the @lat,lng viewport form", () => {
    expect(parseLatLngFromGoogleMapsUrl("https://www.google.com/maps/@23.0225,72.5714,15z"))
      .toEqual({ lat: 23.0225, lng: 72.5714 });
  });
  it("prefers the !3d!4d place pin over the @ viewport", () => {
    const url =
      "https://www.google.com/maps/place/Foo/@23.01,72.50,17z/data=!3m1!4b1!3d23.0225!4d72.5714";
    expect(parseLatLngFromGoogleMapsUrl(url)).toEqual({ lat: 23.0225, lng: 72.5714 });
  });
  it("reads the ?q=lat,lng query form", () => {
    expect(parseLatLngFromGoogleMapsUrl("https://maps.google.com/?q=23.0225,72.5714"))
      .toEqual({ lat: 23.0225, lng: 72.5714 });
  });
  it("reads the api=1 &query= form", () => {
    expect(parseLatLngFromGoogleMapsUrl("https://www.google.com/maps/search/?api=1&query=23.0225%2C72.5714"))
      .toEqual({ lat: 23.0225, lng: 72.5714 });
  });
  it("reads a &destination= directions form", () => {
    expect(parseLatLngFromGoogleMapsUrl("https://www.google.com/maps/dir/?api=1&destination=23.0225,72.5714"))
      .toEqual({ lat: 23.0225, lng: 72.5714 });
  });
  it("returns null when there are no coordinates (e.g. an unresolved short link or a place name)", () => {
    expect(parseLatLngFromGoogleMapsUrl("https://maps.app.goo.gl/abc123")).toBeNull();
    expect(parseLatLngFromGoogleMapsUrl("https://www.google.com/maps/place/Some+Restaurant")).toBeNull();
  });
  it("rejects out-of-range coordinates", () => {
    expect(parseLatLngFromGoogleMapsUrl("https://www.google.com/maps/@999,72.5,15z")).toBeNull();
  });
  it("returns null for non-URLs / plain addresses", () => {
    expect(parseLatLngFromGoogleMapsUrl("Satellite, Ahmedabad")).toBeNull();
  });
});

describe("URL classifiers", () => {
  it("recognises google maps URLs", () => {
    expect(isGoogleMapsUrl("https://www.google.com/maps/@23,72,15z")).toBe(true);
    expect(isGoogleMapsUrl("https://maps.app.goo.gl/abc")).toBe(true);
    expect(isGoogleMapsUrl("Satellite, Ahmedabad")).toBe(false);
  });
  it("recognises short links that need redirect-following", () => {
    expect(isShortGoogleMapsUrl("https://maps.app.goo.gl/abc")).toBe(true);
    expect(isShortGoogleMapsUrl("https://goo.gl/maps/abc")).toBe(true);
    expect(isShortGoogleMapsUrl("https://www.google.com/maps/@23,72,15z")).toBe(false);
  });
});

describe("googleMapsDirectionsUrl", () => {
  it("builds a zero-cost dir deep link", () => {
    expect(googleMapsDirectionsUrl(23.0225, 72.5714))
      .toBe("https://www.google.com/maps/dir/?api=1&destination=23.0225,72.5714");
  });
});
