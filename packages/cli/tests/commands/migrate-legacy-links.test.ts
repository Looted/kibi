import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { load as loadYaml } from "js-yaml";
import { migrateCommand } from "../../src/commands/migrate.js";
import { extractFromManifest } from "../../src/extractors/manifest.js";
import { buildSchema6MigrationFragment } from "../../src/operations/migration/schema6.js";
import { createSymbolGranularityDiagnostics } from "../../src/public/impact/diagnostics.js";
import {
  captureIo,
  createGitWorkspace,
  isolateKibiEnv,
  removeTempDir,
  restoreWorkspaceCwd,
} from "../helpers/in-process-workspace.js";

const roots: string[] = [];
const restores: Array<() => void> = [];

afterEach(() => {
  for (const restore of restores.splice(0)) restore();
  restoreWorkspaceCwd();
  for (const root of roots.splice(0)) removeTempDir(root);
});

function workspace(): string {
  restores.push(isolateKibiEnv());
  const cwd = createGitWorkspace();
  roots.push(cwd);
  return cwd;
}

function io() {
  const captured = captureIo();
  restores.push(captured.restore);
  return captured;
}

// A class whose methods are the behavioral symbols: a link on the class is
// coarse for the staged gate, although the class itself is declared.
const GREETER = `export class Greeter {
  greet(name: string): string {
    return \`Hello \${name}\`;
  }
  wave(): string {
    return "wave";
  }
}

export function farewell(): string {
  return "bye";
}
`;

const SYMBOLS = `symbols:
  - id: SYM-greeter
    title: Greeter
    sourceFile: src/greeter.ts
    status: active
    relationships:
      - type: implements
        target: REQ-greet
  - id: SYM-farewell
    title: farewell
    sourceFile: src/greeter.ts
    status: active
    relationships:
      - type: implements
        target: REQ-greet
`;

function writeSource(cwd: string): void {
  mkdirSync(path.join(cwd, "src"), { recursive: true });
  writeFileSync(path.join(cwd, "src", "greeter.ts"), GREETER);
}

function writeRequirement(cwd: string, lane: string): void {
  mkdirSync(path.join(cwd, lane), { recursive: true });
  writeFileSync(
    path.join(cwd, lane, "REQ-greet.md"),
    "---\nid: REQ-greet\ntitle: Greet\nstatus: open\n---\n\nThe greeter must greet.\n",
  );
}

function writeManifest(cwd: string, schemaVersion: number): void {
  mkdirSync(path.join(cwd, ".kb"), { recursive: true });
  writeFileSync(
    path.join(cwd, ".kb", "manifest.json"),
    JSON.stringify({
      manifestVersion: 1,
      schemaVersion,
      semanticAdvisorBackfill: "completed",
    }),
  );
}

function reasons(cwd: string): Record<string, unknown> {
  const parsed = loadYaml(
    readFileSync(path.join(cwd, ".kb", "symbols.yaml"), "utf8"),
  ) as { symbols: Array<{ id: string; granularity_reason?: unknown }> };
  return Object.fromEntries(
    parsed.symbols.map((symbol) => [symbol.id, symbol.granularity_reason]),
  );
}

/** What the staged granularity gate reports for the canonical manifest. */
function gateViolations(cwd: string): string[] {
  const manifest = path.join(cwd, ".kb", "symbols.yaml");
  const results = extractFromManifest(manifest).map((result) => ({
    ...result,
    sourceFile: "src/greeter.ts",
  }));
  return createSymbolGranularityDiagnostics({
    manifestResults: results,
    symbolsByFile: new Map(),
    workspaceRoot: cwd,
  } as never).map((diagnostic) => diagnostic.message);
}

describe("kibi migrate marks coarse symbol links legacy-link", () => {
  test("a schema 4 legacy layout gets its class-level link marked", async () => {
    const cwd = workspace();
    writeSource(cwd);
    writeRequirement(cwd, "documentation/requirements");
    writeFileSync(path.join(cwd, "documentation", "symbols.yaml"), SYMBOLS);
    mkdirSync(path.join(cwd, ".kb"), { recursive: true });
    writeFileSync(
      path.join(cwd, ".kb", "config.json"),
      JSON.stringify({ schemaVersion: 4 }),
    );
    const out = io();

    const preview = await migrateCommand({
      dryRun: true,
      yes: true,
      workspaceRoot: cwd,
    });
    expect(preview.exitCode).toBe(0);
    expect(out.logText()).toContain(
      "would mark 1 coarse symbol link(s) as legacy-link",
    );

    const result = await migrateCommand({ yes: true, workspaceRoot: cwd });
    expect(result.exitCode).toBe(0);
    expect(out.logText()).toContain("(was 4)");
    expect(out.logText()).toContain(
      "Marked 1 existing coarse symbol link(s) as legacy-link.",
    );
    // The class link is coarse (its methods are narrower behavioral
    // symbols); the function link is not.
    expect(reasons(cwd)).toEqual({
      "SYM-greeter": "legacy-link",
      "SYM-farewell": undefined,
    });
    expect(gateViolations(cwd)).toEqual([]);
    const audit = JSON.parse(
      readFileSync(path.join(cwd, ".kb", "migrations", "main.json"), "utf8"),
    ) as { symbolGranularityLegacyLinks: number };
    expect(audit.symbolGranularityLegacyLinks).toBe(1);
  });

  test("a current KB is marked by the gate's rule, planned as an automatic rewrite, and stays idempotent", async () => {
    const cwd = workspace();
    writeSource(cwd);
    writeManifest(cwd, 8);
    writeRequirement(cwd, ".kb/requirements");
    writeFileSync(path.join(cwd, ".kb", "symbols.yaml"), SYMBOLS);
    // The gate blocks exactly the link the migration plans to mark.
    expect(gateViolations(cwd)).toEqual([
      expect.stringContaining("Symbol SYM-greeter links src/greeter.ts"),
    ]);

    const fragment = buildSchema6MigrationFragment({
      workspaceRoot: cwd,
      currentSchemaVersion: 8,
    });
    const action = fragment.actions.find(
      (candidate) => candidate.id === "symbol-legacy-link-mark",
    );
    expect(action).toMatchObject({
      code: "symbol_legacy_link_mark",
      safety: "automatic",
      autoApplicable: true,
      affectedEntityIds: ["SYM-greeter"],
      affectedFiles: [".kb/symbols.yaml"],
      evidence: {
        count: 1,
        manifestHash: expect.stringMatching(/^[0-9a-f]{64}$/),
        symbols: [
          expect.objectContaining({
            id: "SYM-greeter",
            granularSymbols: ["Greeter.greet", "Greeter.wave"],
          }),
        ],
      },
    });
    expect(fragment.sourceRewriteActionIds).toContain(
      "symbol-legacy-link-mark",
    );

    const out = io();
    const result = await migrateCommand({ yes: true, workspaceRoot: cwd });
    expect(result.exitCode).toBe(0);
    expect(out.logText()).toContain(
      "Marked 1 existing coarse symbol link(s) as legacy-link.",
    );
    expect(reasons(cwd)["SYM-greeter"]).toBe("legacy-link");
    expect(gateViolations(cwd)).toEqual([]);

    const again = await migrateCommand({ yes: true, workspaceRoot: cwd });
    expect(again.exitCode).toBe(0);
    expect(out.logText()).toContain("No migration needed");
    expect(
      buildSchema6MigrationFragment({
        workspaceRoot: cwd,
        currentSchemaVersion: 8,
      }).actions.some(
        (candidate) => candidate.id === "symbol-legacy-link-mark",
      ),
    ).toBe(false);
  });
});
