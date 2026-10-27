// @ts-ignore
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  normalizeSemanticClause,
  semanticClaimKey,
} from "../../src/operations/semantic-advisor/clauses.js";
import { semanticSourceHash } from "../../src/operations/semantic-advisor/shared.js";
import { execSync, spawnSync } from "../helpers/isolated-env.js";

type FileMap = Record<string, string>;

function runKibi(
  kibiBin: string,
  args: string[],
  cwd: string,
): { status: number | null; stdout: string; stderr: string } {
  const result = spawnSync("bun", [kibiBin, ...args], {
    cwd,
    encoding: "utf8",
  });

  return {
    status: result.status,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

function stdoutToString(stdout: unknown): string {
  if (typeof stdout === "string") return stdout;
  if (
    stdout !== null &&
    typeof stdout === "object" &&
    "toString" in stdout &&
    typeof (stdout as { toString: unknown }).toString === "function"
  ) {
    return (stdout as { toString(): string }).toString();
  }

  return "";
}

function writeFiles(root: string, files: FileMap): void {
  for (const [relativePath, content] of Object.entries(files)) {
    const absolutePath = path.join(root, relativePath);
    mkdirSync(path.dirname(absolutePath), { recursive: true });
    writeFileSync(absolutePath, content);
  }
}

function commitAll(cwd: string, message: string): void {
  execSync("git add .", { cwd, stdio: "pipe" });
  execSync(`git commit -m "${message}" --no-verify`, {
    cwd,
    stdio: "pipe",
  });
}

function syncKb(kibiBin: string, cwd: string, args: string[] = []): void {
  execSync(
    `bun ${kibiBin} sync${args.length > 0 ? ` ${args.join(" ")}` : ""}`,
    {
      cwd,
      stdio: "pipe",
    },
  );
}

function createTrackedFixture(): FileMap {
  return {
    ".kb/requirements/REQ-GREET-001.md": `---
id: REQ-GREET-001
title: Greeting behavior
status: open
---

# Greeting behavior
`,
    // The requirement has no scenario, so a test that validates it directly
    // is qualifying symbol coverage for full and staged checks alike.
    ".kb/tests/TEST-GREET-001.md": `---
id: TEST-GREET-001
title: Greeting behavior test
status: active
links:
  - type: validates
    target: REQ-GREET-001
---

# Greeting behavior test
`,
    ".kb/symbols.yaml": `symbols:
  - id: SYM-GREET-001
    title: greet
    sourceFile: src/greet.ts
    links:
      - REQ-GREET-001
      - type: covered_by
        target: TEST-GREET-001
    status: active
`,
    "src/greet.ts": `export function greet() {
  return "hello";
}
`,
  };
}

function writeShiftedBehaviorEdit(root: string): void {
  writeFiles(root, {
    "src/greet.ts":
      `export function greet() {
  const subject = "world";
  return ` +
      "`hello ${subject}`" +
      `;
}
`,
  });
}

function semanticInventoryFrontmatter(source: string): string {
  const claimText = normalizeSemanticClause(source);
  const claimKey = semanticClaimKey(claimText);
  return `logic_claims:
  - ${claimKey}
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: ${semanticSourceHash(source)}
semantic_inventory:
  - claim_key: ${claimKey}
    claim_text: ${claimText}
    role: descriptive
    status: ontology_gap
    span: {start: 0, end: ${Buffer.byteLength(claimText, "utf8")}}`;
}

function stageRequirementEvidence(root: string, note: string): void {
  writeFiles(root, {
    ".kb/requirements/REQ-GREET-001.md": `---
id: REQ-GREET-001
title: Greeting behavior
status: open
${semanticInventoryFrontmatter(note)}
---

# Greeting behavior

${note}
`,
  });
}

// Coordinates stay a gitignored local cache; only the normalized authored
// manifest is committed.
function commitRefreshedManifest(kibiBin: string, cwd: string): void {
  syncKb(kibiBin, cwd, ["--refresh-symbol-coordinates"]);
  execSync("git add .kb/symbols.yaml", { cwd, stdio: "pipe" });
  execSync('git commit --allow-empty -m "refresh manifest" --no-verify', {
    cwd,
    stdio: "pipe",
  });
}

function writeRenamedBehaviorEdit(root: string): void {
  writeFiles(root, {
    "src/greet.ts": `export function hello() {
  return "hello";
}
`,
  });
}

describe("kibi check --staged stale symbols manifest detection", () => {
  const TEST_TIMEOUT_MS = 30000;
  const kibiBin = path.resolve(__dirname, "../../src/cli.ts");
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(path.join(os.tmpdir(), "kibi-stale-manifest-"));
    execSync("git init -b main", { cwd: tmpDir, stdio: "pipe" });
    execSync("git branch -M main", { cwd: tmpDir, stdio: "pipe" });
    execSync('git config user.email "test@example.com"', {
      cwd: tmpDir,
      stdio: "pipe",
    });
    execSync('git config user.name "Test User"', {
      cwd: tmpDir,
      stdio: "pipe",
    });
    execSync(`KB_PATH=.kb/branches/main bun ${kibiBin} init`, {
      cwd: tmpDir,
      stdio: "pipe",
    });
  });

  afterEach(() => {
    if (tmpDir && existsSync(tmpDir)) {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test(
    "passes a line-shifting behavior edit without staging any coordinates",
    async () => {
      writeFiles(tmpDir, createTrackedFixture());
      commitAll(tmpDir, "initial");
      commitRefreshedManifest(kibiBin, tmpDir);

      writeShiftedBehaviorEdit(tmpDir);
      stageRequirementEvidence(
        tmpDir,
        "Staged requirement note proving KB evidence exists for this edit.",
      );
      syncKb(kibiBin, tmpDir);
      execSync("git add src/greet.ts .kb/requirements/REQ-GREET-001.md", {
        cwd: tmpDir,
        stdio: "pipe",
      });

      const { status, stdout, stderr } = runKibi(
        kibiBin,
        ["check", "--staged"],
        tmpDir,
      );

      const output = stdoutToString(stdout || stderr);
      expect(status).toBe(0);
      expect(output).not.toContain("symbols_manifest_stale");
      expect(output).not.toContain("symbol-coordinates");
    },
    TEST_TIMEOUT_MS,
  );

  test(
    "names the uncovered symbol when a new export is staged without manifest entries",
    async () => {
      writeFiles(tmpDir, createTrackedFixture());
      commitAll(tmpDir, "initial");
      commitRefreshedManifest(kibiBin, tmpDir);

      writeFiles(tmpDir, {
        "src/greet.ts": `export function greet() {
  return "hello";
}

export interface GreetOptions {
  loud: boolean;
}
`,
      });
      execSync("git add src/greet.ts", { cwd: tmpDir, stdio: "pipe" });

      const { status, stdout, stderr } = runKibi(
        kibiBin,
        ["check", "--staged"],
        tmpDir,
      );

      const output = stdoutToString(stdout || stderr);
      expect(status).toBe(1);
      expect(output).toContain("symbols_manifest_stale");
      expect(output).toContain(
        "Not in .kb/symbols.yaml: GreetOptions (line 5)",
      );
      expect(output).toContain(
        "Author .kb/symbols.yaml entries for the uncovered symbols",
      );
    },
    TEST_TIMEOUT_MS,
  );

  test(
    "counts a covering symbols manifest as impact evidence for a line-shifting edit",
    async () => {
      writeFiles(tmpDir, createTrackedFixture());
      commitAll(tmpDir, "initial");
      commitRefreshedManifest(kibiBin, tmpDir);

      writeShiftedBehaviorEdit(tmpDir);
      syncKb(kibiBin, tmpDir);
      execSync("git add src/greet.ts", { cwd: tmpDir, stdio: "pipe" });

      const { status, stdout, stderr } = runKibi(
        kibiBin,
        ["check", "--staged"],
        tmpDir,
      );

      const output = stdoutToString(stdout || stderr);
      expect(status).toBe(0);
      expect(output).not.toContain("symbols_manifest_stale");
      expect(output).not.toContain("kibi_impact_evidence_missing");
    },
    TEST_TIMEOUT_MS,
  );

  test(
    "hard-fails when a staged rename leaves a manifest entry without its declaration",
    async () => {
      writeFiles(tmpDir, createTrackedFixture());
      commitAll(tmpDir, "initial");
      commitRefreshedManifest(kibiBin, tmpDir);

      writeRenamedBehaviorEdit(tmpDir);
      stageRequirementEvidence(
        tmpDir,
        "Staged requirement note covering the renamed greeting.",
      );
      execSync("git add src/greet.ts .kb/requirements/REQ-GREET-001.md", {
        cwd: tmpDir,
        stdio: "pipe",
      });

      const { status, stdout, stderr } = runKibi(
        kibiBin,
        ["check", "--staged"],
        tmpDir,
      );

      const output = stdoutToString(stdout || stderr);
      expect(status).toBe(1);
      expect(output).toContain("symbols_manifest_stale");
      expect(output).toContain("Not in .kb/symbols.yaml: hello (line 1)");
      expect(output).toContain("Evidence without a matching symbol: greet");
      expect(output).toContain(
        "re-point or remove (kibi delete) the .kb/symbols.yaml entries whose declaration is gone",
      );
      expect(output).not.toContain("kibi_impact_evidence_missing");
    },
    TEST_TIMEOUT_MS,
  );

  test(
    "emits stale diagnostics using canonical .kb/ symbol paths",
    async () => {
      writeFiles(tmpDir, {
        ".kb/manifest.json": JSON.stringify({
          manifestVersion: 1,
          schemaVersion: 5,
          semanticAdvisorBackfill: "not_applicable",
        }),
        ".kb/requirements/REQ-GREET-001.md": `---
id: REQ-GREET-001
title: Greeting behavior
status: open
---

# Greeting behavior
`,
        ".kb/symbols.yaml": `symbols:
  - id: SYM-GREET-001
    title: greet
    sourceFile: src/greet.ts
    links:
      - REQ-GREET-001
    status: active
`,
        "src/greet.ts": `export function greet() {
  return "hello";
}
`,
      });
      commitAll(tmpDir, "initial");

      commitRefreshedManifest(kibiBin, tmpDir);

      writeRenamedBehaviorEdit(tmpDir);
      stageRequirementEvidence(
        tmpDir,
        "Staged requirement note proving KB evidence exists for this edit.",
      );
      execSync("git add src/greet.ts .kb/requirements/REQ-GREET-001.md", {
        cwd: tmpDir,
        stdio: "pipe",
      });

      const { status, stdout, stderr } = runKibi(
        kibiBin,
        ["check", "--staged"],
        tmpDir,
      );

      const output = stdoutToString(stdout || stderr);
      expect(status).toBe(1);
      expect(output).toContain(
        "[ERROR symbols_manifest_stale] .kb/symbols.yaml does not cover the declarations of staged source files: src/greet.ts",
      );
      expect(output).toContain(
        "Stage .kb/symbols.yaml with the behavior edit, then re-run kibi check --staged.",
      );
      expect(output).not.toContain("symbol-coordinates");
      expect(output).not.toContain("kibi_impact_evidence_missing");
    },
    TEST_TIMEOUT_MS,
  );
});
