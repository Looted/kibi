import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import path from "node:path";

import {
  renderKibiBadge,
  renderKibiLogo,
  renderKibiWordmark,
} from "../../src/report/brand.js";

const REPO_ROOT = path.resolve(import.meta.dir, "../../../..");

function svgFill(element: string): string {
  const hex = element.match(/\bfill="(#[0-9a-f]{6})"/i)?.[1];
  if (hex) return hex.toLowerCase();
  const rgb = element.match(/\bfill:\s*rgb\((\d+),\s*(\d+),\s*(\d+)\)/i);
  expect(rgb).toBeTruthy();
  return `#${rgb
    ?.slice(1)
    .map((channel) => Number(channel).toString(16).padStart(2, "0"))
    .join("")}`;
}

function rounded(value: string): string {
  return Number(value).toFixed(1);
}

function svgVisualFingerprint(svg: string): string[] {
  return [...svg.matchAll(/<(path|circle|ellipse)\b[^>]*>/g)].map((match) => {
    const [element = "", kind = ""] = match;
    const fill = svgFill(element);
    if (kind === "path") {
      const data = element.match(/\bd="([^"]+)"/)?.[1];
      expect(data).toBeTruthy();
      const tokens =
        data?.match(/[A-Za-z]|-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/g) ?? [];
      expect(tokens.length).toBeGreaterThanOrEqual(5);
      return [
        "path",
        fill,
        ...tokens.map((token) =>
          /[A-Za-z]/.test(token) ? token : rounded(token),
        ),
      ].join(":");
    }

    const attribute = (name: string): string => {
      const value = element.match(new RegExp(`\\b${name}="([^"]+)"`))?.[1];
      expect(value).toBeTruthy();
      return value ?? "";
    };
    const radius =
      kind === "circle"
        ? Number(attribute("r"))
        : (Number(attribute("rx")) + Number(attribute("ry"))) / 2;
    return [
      "round",
      fill,
      rounded(attribute("cx")),
      rounded(attribute("cy")),
      radius.toFixed(1),
    ].join(":");
  });
}

describe("canonical brand marks", () => {
  test("inline logo and wordmark match the canonical asset fingerprints", () => {
    const logo = readFileSync(
      path.join(REPO_ROOT, "assets", "logo.svg"),
      "utf8",
    );
    const wordmark = readFileSync(
      path.join(REPO_ROOT, "assets", "wordmark.svg"),
      "utf8",
    );

    expect(svgVisualFingerprint(renderKibiLogo("brand__logo"))).toEqual(
      svgVisualFingerprint(logo),
    );
    expect(svgVisualFingerprint(renderKibiWordmark("brand__wordmark"))).toEqual(
      svgVisualFingerprint(wordmark),
    );
  });

  test("badge embeds the canonical logo fingerprint", () => {
    const logo = readFileSync(
      path.join(REPO_ROOT, "assets", "logo.svg"),
      "utf8",
    );
    const badge = renderKibiBadge("0% proven", "#f2b84b");
    const badgeLogo = badge.match(/<svg x="\d+" y="\d+"[\s\S]*?<\/svg>/)?.[0];
    expect(badgeLogo).toBeTruthy();
    expect(
      svgVisualFingerprint((badgeLogo ?? "").replaceAll("#555", "#1d1e23")),
    ).toEqual(svgVisualFingerprint(logo));
  });

  test("badge uses compact Codecov-style chrome sized to its message", () => {
    const short = renderKibiBadge("0% proven", "#f2b84b");
    const long = renderKibiBadge("100% proven", "#a2d3f4");
    const shortWidth = Number(short.match(/\bwidth="(\d+)"/)?.[1]);
    const longWidth = Number(long.match(/\bwidth="(\d+)"/)?.[1]);
    expect(short).toContain("kibi</text>");
    expect(short).toContain("0% proven</text>");
    expect(short).toContain('fill="#555"');
    expect(short).toContain(
      'font-family="DejaVu Sans,Verdana,Geneva,sans-serif"',
    );
    expect(short).toContain('font-size="11"');
    expect(short).toContain('rx="3"');
    expect(short).toContain("linearGradient");
    expect(short).not.toContain("textLength");
    expect(short).toMatch(/<rect width="\d+" height="20" fill="#555"/);
    expect(short).not.toContain('font-weight="700"');
    expect(short).not.toMatch(/<rect[^>]*fill="#1d1e23"/);
    expect(short).not.toContain('fill="#111318"');
    expect(shortWidth).toBeLessThan(160);
    expect(shortWidth).toBeGreaterThan(100);
    expect(longWidth).toBeGreaterThan(shortWidth);
    expect(short).toContain('height="20"');
  });
});
