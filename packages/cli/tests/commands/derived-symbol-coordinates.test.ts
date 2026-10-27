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
import { execSync, spawnSync } from "../helpers/isolated-env.js";

// implements REQ-symbol-coordinates-derived-locally

const kibiBin = path.resolve(__dirname, "../../src/cli.ts");
const TEST_TIMEOUT_MS = 180_000;
const COORDINATES = ".kb/symbol-coordinates.yaml";

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

function git(cwd: string, command: string): string {
  return execSync(`git ${command}`, {
    cwd,
    stdio: "pipe",
    encoding: "utf8",
  }) as string;
}

function write(root: string, relativePath: string, content: string): void {
  const target = path.join(root, relativePath);
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, content);
}

function tracked(root: string, relativePath: string): boolean {
  return git(root, `ls-files -- ${relativePath}`).trim() !== "";
}

function symbolLine(root: string, id: string): number {
  const queried = kibi(root, [
    "query",
    "symbol",
    "--id",
    id,
    "--format",
    "json",
  ]);
  expect(queried.status, queried.output).toBe(0);
  const [symbol] = JSON.parse(
    queried.output.slice(queried.output.indexOf("[")),
  ) as Array<{ sourceLine?: number }>;
  return symbol?.sourceLine ?? -1;
}

const GREET = `export function greet(name: string): string {
  return \`Hello \${name}\`;
}

export function farewell(): string {
  return "bye";
}
`;

const SYMBOLS = `symbols:
  - id: SYM-greet
    title: greet
    sourceFile: src/greet.ts
    status: active
    links:
      - REQ-greet
  - id: SYM-farewell
    title: farewell
    sourceFile: src/greet.ts
    status: active
    links:
      - REQ-greet
`;

/** An initialized repository whose authored KB and source are committed. */
function commitBaseline(root: string): void {
  const init = kibi(root, ["init", "--no-hooks"]);
  expect(init.status, init.output).toBe(0);
  write(root, "src/greet.ts", GREET);
  write(
    root,
    ".kb/requirements/REQ-greet.md",
    "---\nid: REQ-greet\ntitle: Greet\nstatus: open\n---\n\nThe greeter must greet the person by name and say goodbye when they leave.\n",
  );
  write(root, ".kb/symbols.yaml", SYMBOLS);
  git(root, "add -A");
  git(root, 'commit -q --no-verify -m "baseline"');
  const sync = kibi(root, ["sync", "--refresh-symbol-coordinates"]);
  expect(sync.status, sync.output).toBe(0);
  git(root, "add -A");
  git(root, 'commit -q --no-verify --allow-empty -m "normalized manifest"');
}

describe("symbol coordinates are a local cache derived from source", () => {
  let root: string;

  beforeEach(() => {
    root = mkdtempSync(path.join(os.tmpdir(), "kibi-derived-coordinates-"));
    git(root, "init -q -b main");
    git(root, 'config user.email "test@example.com"');
    git(root, 'config user.name "Test User"');
  });

  afterEach(() => {
    if (root && existsSync(root))
      rmSync(root, { recursive: true, force: true });
  });

  test(
    "parallel edits to one source file merge cleanly and sync rebuilds the cache",
    () => {
      commitBaseline(root);
      expect(readFileSync(path.join(root, ".gitignore"), "utf8")).toContain(
        COORDINATES,
      );
      expect(existsSync(path.join(root, COORDINATES))).toBe(true);
      expect(tracked(root, COORDINATES)).toBe(false);
      const symbolsBefore = readFileSync(
        path.join(root, ".kb/symbols.yaml"),
        "utf8",
      );

      // One branch moves every declaration down; the other edits a body.
      git(root, "checkout -q -b shift");
      write(root, "src/greet.ts", `// Greeting helpers.\n\n${GREET}`);
      git(root, 'commit -q --no-verify -am "document greeter"');
      git(root, "checkout -q main");
      write(root, "src/greet.ts", GREET.replace('"bye"', '"goodbye"'));
      git(root, 'commit -q --no-verify -am "longer farewell"');
      git(root, 'merge -q --no-edit -m "merge shift" shift');
      expect(git(root, "status --porcelain").trim()).toBe("");

      const sync = kibi(root, ["sync"]);
      expect(sync.status, sync.output).toBe(0);
      expect(symbolLine(root, "SYM-greet")).toBe(3);
      expect(symbolLine(root, "SYM-farewell")).toBe(7);
      expect(readFileSync(path.join(root, ".kb/symbols.yaml"), "utf8")).toBe(
        symbolsBefore,
      );
      expect(git(root, "status --porcelain").trim()).toBe("");

      // The moved declarations need nothing staged beyond the edit.
      write(root, "src/greet.ts", `// Greeting helpers.\n\n\n${GREET}`);
      git(root, "add src/greet.ts");
      const generated = kibi(root, [
        "check-generated",
        "--staged",
        "--changed-only",
      ]);
      expect(generated.status, generated.output).toBe(0);
      const staged = kibi(root, ["check", "--staged"]);
      expect(staged.output).not.toContain("symbols_manifest_stale");
      expect(staged.output).not.toContain(COORDINATES);
    },
    TEST_TIMEOUT_MS,
  );

  test(
    "the staged gate names the declarations the authored manifest does not cover",
    () => {
      commitBaseline(root);
      write(
        root,
        "src/greet.ts",
        `${GREET.replace("export function farewell", "export function goodbye")}`,
      );
      git(root, "add src/greet.ts");
      const staged = kibi(root, ["check", "--staged"]);
      expect(staged.status).toBe(1);
      expect(staged.output).toContain(
        "[ERROR symbols_manifest_stale] .kb/symbols.yaml does not cover the declarations of staged source files: src/greet.ts",
      );
      expect(staged.output).toContain("Not in .kb/symbols.yaml: goodbye");
      expect(staged.output).toContain(
        "Evidence without a matching symbol: farewell",
      );
    },
    TEST_TIMEOUT_MS,
  );

  test(
    "check-generated rejects a commit that stages the coordinate cache",
    () => {
      commitBaseline(root);
      git(root, `add -f -- ${COORDINATES}`);
      const indexBefore = git(root, "write-tree").trim();
      const generated = kibi(root, [
        "check-generated",
        "--staged",
        "--changed-only",
      ]);
      expect(generated.status).toBe(1);
      expect(generated.output).toContain(
        `${COORDINATES} is staged, but symbol coordinates are derived locally and never committed.`,
      );
      expect(git(root, "write-tree").trim()).toBe(indexBefore);
    },
    TEST_TIMEOUT_MS,
  );

  test(
    "kibi migrate untracks a coordinate artifact an older schema committed",
    () => {
      commitBaseline(root);
      // Rewind to a schema 12 repository that still commits the artifact.
      const manifestPath = path.join(root, ".kb/manifest.json");
      const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
      writeFileSync(
        manifestPath,
        `${JSON.stringify({ ...manifest, schemaVersion: 12 }, null, 2)}\n`,
      );
      const gitignorePath = path.join(root, ".gitignore");
      writeFileSync(
        gitignorePath,
        readFileSync(gitignorePath, "utf8")
          .split("\n")
          .filter((line) => line !== COORDINATES)
          .join("\n"),
      );
      git(root, "add -A");
      git(root, `add -f -- ${COORDINATES}`);
      git(
        root,
        'commit -q --no-verify -m "schema 12 with tracked coordinates"',
      );
      expect(tracked(root, COORDINATES)).toBe(true);

      const migrated = kibi(root, ["migrate", "--yes"]);
      expect(migrated.status, migrated.output).toBe(0);
      expect(tracked(root, COORDINATES)).toBe(false);
      expect(existsSync(path.join(root, COORDINATES))).toBe(true);
      expect(readFileSync(gitignorePath, "utf8")).toContain(COORDINATES);
      expect(JSON.parse(readFileSync(manifestPath, "utf8")).schemaVersion).toBe(
        13,
      );

      git(root, "add .gitignore .kb");
      expect(git(root, "diff --cached --name-status")).toContain(
        `D\t${COORDINATES}`,
      );
      const generated = kibi(root, [
        "check-generated",
        "--staged",
        "--changed-only",
      ]);
      expect(generated.status, generated.output).toBe(0);
    },
    TEST_TIMEOUT_MS,
  );
});
