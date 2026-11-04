// implements REQ-vscode-traceability
import { afterEach, describe, expect, spyOn, test } from "bun:test";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import * as runtime from "kibi-runtime";

import {
  handleKbSymbolsRefresh,
  refreshCoordinatesForSymbolId,
} from "../../src/tools/symbols.js";

const roots: string[] = [];
const spies: { mockRestore: () => void }[] = [];
afterEach(() => {
  for (const spy of spies.splice(0)) spy.mockRestore();
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

function workspace(source: string): string {
  const root = realpathSync(
    mkdtempSync(path.join(tmpdir(), "kibi-mcp-symbols-fallback-")),
  );
  roots.push(root);
  mkdirSync(path.join(root, ".kb"), { recursive: true });
  mkdirSync(path.join(root, "src"), { recursive: true });
  writeFileSync(path.join(root, "src", "a.ts"), source);
  return root;
}

/** An enricher that hands entries back without their source and title. */
function stripSourceAndTitle(): void {
  spies.push(
    spyOn(runtime, "enrichSymbolCoordinates").mockImplementation(
      async (entries) =>
        entries.map(({ sourceFile: _s, title: _t, ...rest }) => rest) as never,
    ),
  );
}

describe("symbol refresh falls back to the manifest entry", () => {
  test("the manifest source and title locate the declaration", async () => {
    const root = workspace("const x = 1;\nexport function alpha() {}\n");
    writeFileSync(
      path.join(root, ".kb", "symbols.yaml"),
      "symbols:\n  - id: SYM-A\n    title: alpha\n    sourceFile: src/a.ts\n",
    );
    stripSourceAndTitle();
    const result = await handleKbSymbolsRefresh({
      workspaceRoot: root,
      dryRun: true,
    });
    expect(result.structuredContent).toStrictEqual({
      refreshed: 1,
      failed: 0,
      unchanged: 0,
      dryRun: true,
    });
  });

  test("an entry the fallback cannot locate counts as failed", async () => {
    const root = workspace("const x = 1;\n");
    writeFileSync(
      path.join(root, ".kb", "symbols.yaml"),
      "symbols:\n  - id: SYM-A\n    title: alpha\n    sourceFile: src/a.ts\n",
    );
    stripSourceAndTitle();
    const result = await handleKbSymbolsRefresh({
      workspaceRoot: root,
      dryRun: true,
    });
    expect(result.structuredContent).toStrictEqual({
      refreshed: 0,
      failed: 1,
      unchanged: 0,
      dryRun: true,
    });
  });

  test("a single-symbol refresh uses the same fallback", async () => {
    const root = workspace("const x = 1;\n  export function alpha() {}\n");
    writeFileSync(
      path.join(root, ".kb", "symbols.yaml"),
      "symbols:\n  - id: SYM-A\n    title: alpha\n    sourceFile: src/a.ts\n",
    );
    stripSourceAndTitle();
    expect(await refreshCoordinatesForSymbolId("SYM-A", root)).toStrictEqual({
      refreshed: true,
      found: true,
    });
    // The located span has no source of its own, so it is not written.
    expect(readFileSync(path.join(root, ".kb", "symbols.yaml"), "utf8")).toBe(
      "symbols:\n  - id: SYM-A\n    title: alpha\n    sourceFile: src/a.ts\n",
    );
  });

  test("an entry without a title is sent to the enricher with an empty one", async () => {
    const root = workspace("export function alpha() {}\n");
    writeFileSync(
      path.join(root, ".kb", "symbols.yaml"),
      "symbols:\n  - id: SYM-A\n    title: 7\n    sourceFile: src/a.ts\n",
    );
    const spy = spyOn(runtime, "enrichSymbolCoordinates").mockImplementation(
      async (entries) => entries as never,
    );
    spies.push(spy);
    await refreshCoordinatesForSymbolId("SYM-A", root);
    expect(spy.mock.calls[0]?.[0]).toStrictEqual([
      { id: "SYM-A", title: "", sourceFile: "src/a.ts" },
    ]);
    expect(spy.mock.calls[0]?.[2]).toStrictEqual({
      allowPythonDecoratorCoordinates: true,
    });
  });
});
