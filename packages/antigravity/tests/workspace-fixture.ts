import { afterEach } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const tempDirs: string[] = [];

export function makeTempDir(prefix: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) fs.rmSync(dir, { recursive: true, force: true });
  }
});

export function createKibiWorkspace(options?: {
  firmRequirement?: boolean;
  includeGitHooks?: boolean;
}): { root: string; pluginData: string } {
  const root = makeTempDir("kibi-agy-ws-");
  const pluginData = makeTempDir("kibi-agy-data-");

  fs.mkdirSync(path.join(root, ".git", "hooks"), { recursive: true });
  fs.mkdirSync(path.join(root, ".kb", "requirements"), { recursive: true });
  fs.mkdirSync(path.join(root, ".kb", "facts"), { recursive: true });
  fs.mkdirSync(path.join(root, "src"), { recursive: true });

  fs.writeFileSync(
    path.join(root, ".kb", "manifest.json"),
    JSON.stringify({ schemaVersion: 19 }),
  );

  const firmness = options?.firmRequirement ? "firm" : "default";
  fs.writeFileSync(
    path.join(root, ".kb", "requirements", "REQ-checkout-rounding.md"),
    [
      "---",
      "id: REQ-checkout-rounding",
      "type: req",
      "title: Checkout totals must round half-up to two decimals",
      "status: open",
      `firmness: ${firmness}`,
      "origin:",
      "  kind: user",
      "  ref: User stated rounding rule",
      "requires_property:",
      "  - FACT-checkout-scale",
      "---",
      "",
      "Checkout totals must round half-up to two decimal places.",
      "",
      "## Why",
      "Accounting requires consistent cent rounding across invoices.",
    ].join("\n"),
  );

  fs.writeFileSync(
    path.join(root, ".kb", "facts", "FACT-checkout-scale.md"),
    [
      "---",
      "id: FACT-checkout-scale",
      "type: fact",
      "fact_kind: property_value",
      "title: Checkout currency precision is 2 decimal places",
      "status: active",
      "subject_key: checkout.rounding",
      "property_key: decimal_places",
      "operator: eq",
      "value: 2",
      "---",
    ].join("\n"),
  );

  fs.writeFileSync(
    path.join(root, "src", "checkout.ts"),
    [
      "export function roundTotal(amount: number): number {",
      "  return Math.round(amount * 100) / 100;",
      "}",
      "",
      "export function helperNote(): string {",
      '  return "ok";',
      "}",
      "",
    ].join("\n"),
  );

  fs.writeFileSync(
    path.join(root, "src", "unowned.ts"),
    "export const version = 1;\n",
  );

  fs.writeFileSync(
    path.join(root, ".kb", "symbols.yaml"),
    [
      "symbols:",
      "  - id: SYM-checkout-roundTotal",
      "    title: roundTotal",
      "    sourceFile: src/checkout.ts",
      "    status: active",
      "    relationships:",
      "      - type: implements",
      "        target: REQ-checkout-rounding",
      "      - type: covered_by",
      "        target: TEST-checkout-rounding",
    ].join("\n"),
  );

  fs.writeFileSync(
    path.join(root, ".kb", "symbol-coordinates.yaml"),
    [
      "version: 1",
      "coordinates:",
      "  SYM-checkout-roundTotal:",
      "    sourceFile: src/checkout.ts",
      "    sourceLine: 1",
      "    sourceEndLine: 3",
    ].join("\n"),
  );

  if (options?.includeGitHooks) {
    fs.writeFileSync(
      path.join(root, ".git", "hooks", "pre-commit"),
      "#!/bin/sh\n# kibi-managed\nnpx --no-install kibi check --staged\n",
    );
  }

  return { root, pluginData };
}
