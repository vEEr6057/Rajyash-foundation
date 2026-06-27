import { describe, it, expect } from "vitest";
import { csvCell, toCsv } from "./csv";

describe("csvCell — OWASP formula-injection guard (D-08)", () => {
  it("prefixes a quote on a leading = (formula)", () => {
    expect(csvCell("=1+1")).toBe("'=1+1");
  });
  it("neutralizes +, -, @, tab leads too", () => {
    expect(csvCell("+1")).toBe("'+1");
    expect(csvCell("-1")).toBe("'-1");
    expect(csvCell("@SUM(A1)")).toBe("'@SUM(A1)");
    expect(csvCell("\tx")).toBe("'\tx");
  });
  it("leaves a benign value untouched", () => {
    expect(csvCell("Ramesh")).toBe("Ramesh");
    expect(csvCell("")).toBe("");
  });
});

describe("csvCell — RFC-4180 container escaping", () => {
  it("quotes a value with a comma", () => {
    expect(csvCell("a,b")).toBe('"a,b"');
  });
  it("doubles internal quotes and wraps", () => {
    expect(csvCell('he said "hi"')).toBe('"he said ""hi"""');
  });
  it("quotes a value with a newline", () => {
    expect(csvCell("a\nb")).toBe('"a\nb"');
  });
});

describe("csvCell — formula lead AND separator (order matters)", () => {
  it("neutralizes THEN quotes (single quote ends up inside the quoted cell)", () => {
    expect(csvCell("=cmd,calc")).toBe('"\'=cmd,calc"');
  });
});

describe("toCsv", () => {
  it("emits header + rows, comma-joined, CRLF-terminated", () => {
    const out = toCsv(
      ["id", "name"],
      [
        ["pk1", "Ramesh"],
        ["pk2", "Sita"],
      ],
    );
    expect(out).toBe("id,name\r\npk1,Ramesh\r\npk2,Sita\r\n");
  });
  it("renders null/undefined as empty and numbers via String()", () => {
    const out = toCsv(["a", "b", "c"], [[null, undefined, 42]]);
    expect(out).toBe("a,b,c\r\n,,42\r\n");
  });
  it("escapes an injected donor name inside a full row", () => {
    const out = toCsv(["id", "donor"], [["pk1", "=HYPERLINK(1)"]]);
    expect(out).toBe("id,donor\r\npk1,'=HYPERLINK(1)\r\n");
  });
});
