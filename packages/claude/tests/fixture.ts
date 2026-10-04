// implements REQ-claude-code-kibi-plugin-v1
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export type Fixture = {
  root: string;
  pluginData: string;
  cleanup: () => void;
};

const temporaryRoots: string[] = [];

export function tempDir(prefix: string): string {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  temporaryRoots.push(directory);
  return directory;
}

export function cleanupTempDirs(): void {
  for (const directory of temporaryRoots.splice(0)) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

export function write(root: string, relativePath: string, content: string) {
  const target = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
}

/** Source file whose `computeTotal` spans lines 3-7 and `formatTotal` 9-11. */
export const CHECKOUT_SOURCE = [
  "// checkout",
  "",
  "export function computeTotal(items: number[]): number {",
  "  let total = 0;",
  "  for (const item of items) total += item;",
  "  return Math.round(total * 100) / 100;",
  "}",
  "",
  "export function formatTotal(total: number): string {",
  "  return `$${total.toFixed(2)}`;",
  "}",
  "",
].join("\n");

export const SYMBOLS_YAML = `symbols:
  - id: SYM-computeTotal
    title: computeTotal
    sourceFile: src/checkout.ts
    status: active
    relationships:
      - type: implements
        target: REQ-checkout-rounding
      - type: covered_by
        target: TEST-checkout-rounding
  - id: SYM-formatTotal
    title: 'formatTotal'
    sourceFile: src/checkout.ts
    links:
      - REQ-currency-display
  - id: SYM-checkout-test
    title: checkout suite
    sourceFile: tests/checkout.test.ts
    relationships:
      - type: executable_for
        target: TEST-checkout-rounding
  - id: SYM-unlinked
    title: helper
    sourceFile: src/helper.ts
`;

export const COORDINATES_YAML = `version: 1
coordinates:
  SYM-computeTotal:
    identityHash: abc
    sourceFile: src/checkout.ts
    sourceLine: 3
    sourceColumn: 0
    sourceEndLine: 7
    sourceEndColumn: 1
  SYM-formatTotal:
    sourceFile: src/checkout.ts
    sourceLine: 9
    sourceEndLine: 11
`;

/** A Kibi-enabled workspace with a small, fully linked knowledge base. */
export function createKibiWorkspace(): Fixture {
  const root = tempDir("kibi-claude-ws-");
  const pluginData = tempDir("kibi-claude-data-");
  fs.mkdirSync(path.join(root, ".git"));
  write(root, ".kb/manifest.json", '{"manifestVersion":1}\n');
  write(root, ".kb/symbols.yaml", SYMBOLS_YAML);
  write(root, ".kb/symbol-coordinates.yaml", COORDINATES_YAML);
  write(
    root,
    ".kb/requirements/REQ-checkout-rounding.md",
    "---\nid: REQ-checkout-rounding\ntitle: Checkout totals round to cents\nstatus: open\nlinks:\n  - type: constrains\n    target: FACT-checkout-total\n  - type: requires_property\n    target: FACT-total-rounding-cents\n  - ADR-money-as-decimal\n---\n\nTotals round half up to two decimals.\n",
  );
  write(
    root,
    ".kb/facts/FACT-total-rounding-cents.md",
    "---\nid: FACT-total-rounding-cents\ntitle: Totals round half up to two decimals\nstatus: active\n---\n",
  );
  write(
    root,
    ".kb/adr/ADR-money-as-decimal.md",
    "---\nid: ADR-money-as-decimal\ntitle: Money is computed as decimal cents\nstatus: accepted\n---\n",
  );
  write(
    root,
    ".kb/requirements/REQ-currency-display.md",
    "---\nid: REQ-currency-display\ntitle: 'Totals display with a currency symbol'\nstatus: superseded\n---\n\nBody.\n",
  );
  write(root, "src/checkout.ts", CHECKOUT_SOURCE);
  write(root, "src/helper.ts", "export const helper = 1;\n");
  write(root, "tests/checkout.test.ts", "test('x', () => {});\n");
  return { root, pluginData, cleanup: cleanupTempDirs };
}

export function snapshotTree(root: string): string[] {
  const entries: string[] = [];
  const visit = (directory: string) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      const relative = path.relative(root, absolute);
      if (entry.isDirectory()) {
        entries.push(`${relative}/`);
        visit(absolute);
      } else {
        entries.push(`${relative}:${fs.readFileSync(absolute, "utf8")}`);
      }
    }
  };
  visit(root);
  return entries.sort();
}
