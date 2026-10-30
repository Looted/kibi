import { describe, expect, test } from "bun:test";
import {
  type CodeCertificate,
  exhaustiveCertificate,
  regexCertificate,
  writeCodeCertificate,
} from "../../../src/public/proof-certificates.js";
import { KIBI_BRAND } from "../../../src/report/brand.js";

// implements REQ-kibi-report-brand-colors

/**
 * The brand colours the health report and badge are drawn with. Kibi reads every value itself at ingest, so the certificate is checked against the code.
 */

/** A Kibi brand colour shall be carbon, deepCarbon, panel, ice, signal, snow, mist, rail, success, warning or danger. */
export async function brandColorNamesCertificate(): Promise<CodeCertificate> {
  return exhaustiveCertificate({
    testId: "TEST-proof-brand-color-names",
    domain: {
      symbolId: "SYM-cli-report-brand-tokens",
      members: [...Object.keys(KIBI_BRAND)],
    },
    check: (member) => {
      expect(typeof member).toBe("string");
    },
  });
}

/** The Kibi carbon brand colour shall be #1d1e23. */
export function brandCarbonColorCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-brand-carbon-color",
    symbolId: "SYM-cli-report-brand-tokens",
    value: KIBI_BRAND.carbon,
  });
}

/** The Kibi deep carbon brand colour shall be #111318. */
export function brandDeepcarbonColorCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-brand-deepcarbon-color",
    symbolId: "SYM-cli-report-brand-tokens",
    value: KIBI_BRAND.deepCarbon,
  });
}

/** The Kibi panel brand colour shall be #191c22. */
export function brandPanelColorCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-brand-panel-color",
    symbolId: "SYM-cli-report-brand-tokens",
    value: KIBI_BRAND.panel,
  });
}

/** The Kibi ice brand colour shall be #a2d3f4. */
export function brandIceColorCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-brand-ice-color",
    symbolId: "SYM-cli-report-brand-tokens",
    value: KIBI_BRAND.ice,
  });
}

/** The Kibi signal brand colour shall be #3e8ed6. */
export function brandSignalColorCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-brand-signal-color",
    symbolId: "SYM-cli-report-brand-tokens",
    value: KIBI_BRAND.signal,
  });
}

/** The Kibi snow brand colour shall be #f4f8fb. */
export function brandSnowColorCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-brand-snow-color",
    symbolId: "SYM-cli-report-brand-tokens",
    value: KIBI_BRAND.snow,
  });
}

/** The Kibi mist brand colour shall be #aab8c2. */
export function brandMistColorCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-brand-mist-color",
    symbolId: "SYM-cli-report-brand-tokens",
    value: KIBI_BRAND.mist,
  });
}

/** The Kibi rail brand colour shall be #34434f. */
export function brandRailColorCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-brand-rail-color",
    symbolId: "SYM-cli-report-brand-tokens",
    value: KIBI_BRAND.rail,
  });
}

/** The Kibi success brand colour shall be #63c99a. */
export function brandSuccessColorCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-brand-success-color",
    symbolId: "SYM-cli-report-brand-tokens",
    value: KIBI_BRAND.success,
  });
}

/** The Kibi warning brand colour shall be #f2b84b. */
export function brandWarningColorCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-brand-warning-color",
    symbolId: "SYM-cli-report-brand-tokens",
    value: KIBI_BRAND.warning,
  });
}

/** The Kibi danger brand colour shall be #f07178. */
export function brandDangerColorCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-brand-danger-color",
    symbolId: "SYM-cli-report-brand-tokens",
    value: KIBI_BRAND.danger,
  });
}

describe("Health report brand colours", () => {
  test("A Kibi brand colour shall be carbon, deepCarbon, panel, ice, signal, snow, mist, rail, success, warning or danger", async () => {
    writeCodeCertificate(await brandColorNamesCertificate());
    expect([...Object.keys(KIBI_BRAND)].sort()).toEqual([
      "carbon",
      "danger",
      "deepCarbon",
      "ice",
      "mist",
      "panel",
      "rail",
      "signal",
      "snow",
      "success",
      "warning",
    ]);
  });

  test("The Kibi carbon brand colour shall be #1d1e23", () => {
    writeCodeCertificate(brandCarbonColorCertificate());
    expect(KIBI_BRAND.carbon).toBe("#1d1e23");
  });

  test("The Kibi deep carbon brand colour shall be #111318", () => {
    writeCodeCertificate(brandDeepcarbonColorCertificate());
    expect(KIBI_BRAND.deepCarbon).toBe("#111318");
  });

  test("The Kibi panel brand colour shall be #191c22", () => {
    writeCodeCertificate(brandPanelColorCertificate());
    expect(KIBI_BRAND.panel).toBe("#191c22");
  });

  test("The Kibi ice brand colour shall be #a2d3f4", () => {
    writeCodeCertificate(brandIceColorCertificate());
    expect(KIBI_BRAND.ice).toBe("#a2d3f4");
  });

  test("The Kibi signal brand colour shall be #3e8ed6", () => {
    writeCodeCertificate(brandSignalColorCertificate());
    expect(KIBI_BRAND.signal).toBe("#3e8ed6");
  });

  test("The Kibi snow brand colour shall be #f4f8fb", () => {
    writeCodeCertificate(brandSnowColorCertificate());
    expect(KIBI_BRAND.snow).toBe("#f4f8fb");
  });

  test("The Kibi mist brand colour shall be #aab8c2", () => {
    writeCodeCertificate(brandMistColorCertificate());
    expect(KIBI_BRAND.mist).toBe("#aab8c2");
  });

  test("The Kibi rail brand colour shall be #34434f", () => {
    writeCodeCertificate(brandRailColorCertificate());
    expect(KIBI_BRAND.rail).toBe("#34434f");
  });

  test("The Kibi success brand colour shall be #63c99a", () => {
    writeCodeCertificate(brandSuccessColorCertificate());
    expect(KIBI_BRAND.success).toBe("#63c99a");
  });

  test("The Kibi warning brand colour shall be #f2b84b", () => {
    writeCodeCertificate(brandWarningColorCertificate());
    expect(KIBI_BRAND.warning).toBe("#f2b84b");
  });

  test("The Kibi danger brand colour shall be #f07178", () => {
    writeCodeCertificate(brandDangerColorCertificate());
    expect(KIBI_BRAND.danger).toBe("#f07178");
  });
});
