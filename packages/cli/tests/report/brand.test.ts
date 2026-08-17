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
      const tokens = data?.match(/[A-Za-z]|-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/g) ?? [];
      expect(tokens.length).toBeGreaterThanOrEqual(5);
      return [
        "path",
        fill,
        ...tokens.map((token) => (/[A-Za-z]/.test(token) ? token : rounded(token))),
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
    const logo = readFileSync(path.join(REPO_ROOT, "assets", "logo.svg"), "utf8");
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
    const logo = readFileSync(path.join(REPO_ROOT, "assets", "logo.svg"), "utf8");
    const badge = renderKibiBadge("0% proven", "#f2b84b");
    const badgeLogo = badge.match(/<svg x="6" y="2"[\s\S]*?<\/svg>/)?.[0];
    expect(badgeLogo).toBeTruthy();
    expect(svgVisualFingerprint(badgeLogo ?? "")).toEqual(svgVisualFingerprint(logo));
  });
});
