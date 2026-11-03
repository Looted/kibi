import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { applySchema6MigrationAction } from "../../../src/operations/migration/schema6.js";
import * as coordinates from "../../../src/operations/migration/symbol-coordinates-refresh.js";
import {
  SYMBOL_LEGACY_LINK_MARK_CODE,
  applySymbolLegacyLinks,
  planSymbolLegacyLinks,
} from "../../../src/operations/migration/symbol-legacy-links.js";
import type { MigrationAction } from "../../../src/public/operations/migration-plan.js";
import { scratch } from "../helpers.js";

const spies: { mockRestore: () => void }[] = [];
const cleanups: (() => void)[] = [];
afterEach(() => {
  for (const spy of spies.splice(0)) spy.mockRestore();
  for (const cleanup of cleanups.splice(0)) cleanup();
});

const GREET = 'export function greet() {\n  return "hello";\n}\n';

function workspace(manifest: string): string {
  const ws = scratch({
    "src/greet.ts": GREET,
    "src/notes.txt": "plain notes\n",
    ".kb/symbols.yaml": manifest,
  });
  cleanups.push(ws.cleanup);
  return ws.root;
}

const entry = (lines: string[]) => ["symbols:", ...lines, ""].join("\n");

describe("legacy symbol links", () => {
  test("plan nothing for a manifest that does not parse", () => {
    expect(
      planSymbolLegacyLinks(workspace("symbols: [unclosed\n")).targets,
    ).toStrictEqual([]);
  });

  test("plan a typed coarse link under a quoted id, and skip unreadable sources", () => {
    const root = workspace(
      entry([
        '  - id: "SYM-GREET-FILE"',
        "    title: greet.ts",
        "    sourceFile: src/greet.ts",
        "    links:",
        "      - type: implements",
        "        target: REQ-GREET",
        "    status: active",
        "  - id: SYM-NOTES",
        "    title: notes.txt",
        "    sourceFile: src/notes.txt",
        "    links:",
        "      - REQ-NOTES",
        "      - 7",
      ]),
    );
    const plan = planSymbolLegacyLinks(root);
    expect(plan.targets.map((target) => target.id)).toStrictEqual([
      "SYM-GREET-FILE",
    ]);
    expect(() =>
      applySymbolLegacyLinks(root, { expectedHash: "stale" }),
    ).toThrow(
      ".kb/symbols.yaml changed since planning; rerun kibi migrate and approve the new plan.",
    );
    expect(applySymbolLegacyLinks(root)).toStrictEqual({
      marked: ["SYM-GREET-FILE"],
      unmarked: [],
    });
  });

  test("refuse a mark that would change another field", () => {
    const root = workspace(
      entry([
        "  - id: SYM-GREET-FILE",
        "    title: greet.ts",
        "    sourceFile: src/greet.ts",
        "    links:",
        "      - type: implements",
        "        target: REQ-GREET",
        "        status: active",
      ]),
    );
    expect(() => applySymbolLegacyLinks(root)).toThrow(
      ".kb/symbols.yaml: legacy-link reasons could not be added without changing other symbol fields; add granularity_reason: legacy-link by hand.",
    );
  });
});

describe("the legacy-link migration action", () => {
  const action = (ids: string[]) =>
    ({
      id: "symbol-legacy-link-mark",
      code: SYMBOL_LEGACY_LINK_MARK_CODE,
      evidence: {},
      affectedEntityIds: ids,
    }) as unknown as MigrationAction;
  const context = (root: string) => ({
    workspaceRoot: root,
    clock: () => new Date("2026-11-01T00:00:00Z"),
  });

  test("refuses a planned link it cannot mark in place", async () => {
    const root = workspace(
      entry([
        "  - title: greet.ts",
        "    id: SYM-GREET-FILE",
        "    sourceFile: src/greet.ts",
        "    links: [REQ-GREET]",
      ]),
    );
    await expect(
      applySchema6MigrationAction(action(["SYM-GREET-FILE"]), context(root)),
    ).rejects.toThrow(
      "Could not mark SYM-GREET-FILE as legacy-link in place; add granularity_reason: legacy-link to them by hand.",
    );
  });

  test("warns when the coordinates cannot be refreshed afterwards", async () => {
    const root = workspace(
      entry([
        "  - id: SYM-GREET-FILE",
        "    title: greet.ts",
        "    sourceFile: src/greet.ts",
        "    links: [REQ-GREET]",
      ]),
    );
    const warnings: string[] = [];
    spies.push(
      spyOn(coordinates, "refreshCoordinatesAfterMigration").mockResolvedValue({
        outcome: "failed",
        reason: "compiler busy",
      }),
      spyOn(console, "warn").mockImplementation((message: string) => {
        warnings.push(message);
      }),
    );
    await applySchema6MigrationAction(
      action(["SYM-GREET-FILE"]),
      context(root),
    );
    expect(warnings).toStrictEqual([
      `Warning: ${coordinates.coordinateRefreshFailureMessage("compiler busy")}`,
    ]);
  });
});
