import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { withSemanticInventory } from "../helpers/inventory-fixture.js";
import { execSync, spawnSync } from "../helpers/isolated-env.js";

// implements REQ-cli-migration-first-commit

const kibiBin = path.resolve(__dirname, "../../src/cli.ts");
const TEST_TIMEOUT_MS = 120_000;

function kibi(
  cwd: string,
  args: string[],
): { status: number | null; output: string } {
  const result = spawnSync("bun", [kibiBin, ...args], {
    cwd,
    encoding: "utf8",
  });
  return {
    status: result.status,
    output: `${result.stdout ?? ""}${result.stderr ?? ""}`,
  };
}

function git(cwd: string, command: string): void {
  execSync(`git ${command}`, { cwd, stdio: "pipe" });
}

function write(root: string, relativePath: string, content: string): void {
  const target = path.join(root, relativePath);
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, content);
}

// A class whose methods are the behavioral symbols: `kibi migrate` marks the
// class-level link legacy-link. Neither legacy symbol has a covering test,
// debt that predates the migration.
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

const LEGACY_SYMBOLS = `symbols:
  - id: SYM-greeter
    title: Greeter
    sourceFile: src/greeter.ts
    status: active
    links:
      - REQ-greet
  - id: SYM-farewell
    title: farewell
    sourceFile: src/greeter.ts
    status: active
    links:
      - REQ-greet
`;

/** A committed legacy-layout KB at schema 4, outside the canonical .kb/. */
function commitLegacyKb(root: string): void {
  write(root, "src/greeter.ts", GREETER);
  write(
    root,
    "documentation/requirements/REQ-greet.md",
    "---\nid: REQ-greet\ntitle: Greet\nstatus: open\n---\n\nThe greeter must greet.\n",
  );
  write(root, "documentation/symbols.yaml", LEGACY_SYMBOLS);
  // A generated artifact older than the manifest: it moves with the
  // migration and is stale until refreshed.
  write(
    root,
    "documentation/symbol-coordinates.yaml",
    "version: 2\ncoordinates: {}\n",
  );
  write(root, ".kb/config.json", `${JSON.stringify({ schemaVersion: 4 })}\n`);
  git(root, "add -A");
  git(root, 'commit -m "legacy kb" --no-verify');
}

/** The documented onboarding: migrate, init, sync, stage everything. */
function migrateAndStage(root: string): string {
  const migrate = kibi(root, ["migrate", "--yes"]);
  expect(migrate.status).toBe(0);
  const init = kibi(root, ["init"]);
  expect(init.status).toBe(0);
  const sync = kibi(root, ["sync"]);
  expect(sync.status).toBe(0);
  git(root, "add -A");
  return migrate.output;
}

function readSymbols(root: string): string {
  return readFileSync(path.join(root, ".kb", "symbols.yaml"), "utf8");
}

describe("the first commit after kibi migrate", () => {
  let root: string;

  beforeEach(() => {
    root = mkdtempSync(path.join(os.tmpdir(), "kibi-migrate-commit-"));
    git(root, "init -b main");
    git(root, 'config user.email "test@example.com"');
    git(root, 'config user.name "Test User"');
    commitLegacyKb(root);
  });

  afterEach(() => {
    if (root && existsSync(root))
      rmSync(root, { recursive: true, force: true });
  });

  test(
    "passes both pre-commit gates when the commit adds nothing else",
    () => {
      const migrateOutput = migrateAndStage(root);
      expect(migrateOutput).toContain(
        "Marked 1 existing coarse symbol link(s) as legacy-link.",
      );
      expect(migrateOutput).toContain(
        "Refreshed generated symbol coordinates for the migrated .kb/symbols.yaml",
      );
      expect(
        existsSync(path.join(root, ".kb", "symbol-coordinates.yaml")),
      ).toBe(true);

      const generated = kibi(root, [
        "check-generated",
        "--staged",
        "--changed-only",
      ]);
      expect(generated.output).not.toContain("generated manifest drift");
      expect(generated.status).toBe(0);

      const staged = kibi(root, ["check", "--staged"]);
      // The small legacy files fall under Git's rename similarity once
      // migrated; they are still judged as moves, not as new files.
      expect(staged.output).toContain(
        "Baseline: HEAD with 3 staged knowledge rename(s) into .kb/ resolved",
      );
      expect(staged.output).toContain(
        "Migration commit: 1 symbol record(s) changed only by kibi migrate",
      );
      expect(staged.output).toContain("SYM-greeter");
      expect(staged.output).not.toContain("symbol-coverage");
      expect(staged.status).toBe(0);
    },
    TEST_TIMEOUT_MS,
  );

  test(
    "still reports a new uncovered symbol the commit adds",
    () => {
      migrateAndStage(root);
      write(
        root,
        "src/hello.ts",
        "export function hello() {\n  return 1;\n}\n",
      );
      write(
        root,
        ".kb/symbols.yaml",
        `${readSymbols(root)}  - id: SYM-hello
    title: hello
    sourceFile: src/hello.ts
    status: active
    links:
      - REQ-greet
`,
      );
      git(root, "add -A");

      const staged = kibi(root, ["check", "--staged"]);
      expect(staged.output).toContain("[symbol-coverage] SYM-hello");
      expect(staged.output).not.toContain("[symbol-coverage] SYM-greeter");
      expect(staged.status).toBe(1);
    },
    TEST_TIMEOUT_MS,
  );

  test(
    "still judges a legacy symbol whose implements link the commit edits",
    () => {
      migrateAndStage(root);
      write(
        root,
        ".kb/requirements/REQ-wave.md",
        withSemanticInventory(
          "---\nid: REQ-wave\ntitle: Wave\nstatus: open\n---\n\nThe greeter must wave.\n",
        ),
      );
      const symbols = readSymbols(root);
      const edited = symbols.replace(
        /(id: SYM-greeter[\s\S]*?- REQ-greet\n)/,
        "$1      - REQ-wave\n",
      );
      expect(edited).not.toBe(symbols);
      write(root, ".kb/symbols.yaml", edited);
      git(root, "add -A");

      const staged = kibi(root, ["check", "--staged"]);
      expect(staged.output).toContain("[symbol-coverage] SYM-greeter");
      expect(staged.output).not.toContain("Migration commit:");
      expect(staged.status).toBe(1);
    },
    TEST_TIMEOUT_MS,
  );
});
