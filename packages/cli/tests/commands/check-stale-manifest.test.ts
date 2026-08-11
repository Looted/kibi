// @ts-ignore
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { execSync, spawnSync } from "node:child_process";
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
    "documentation/requirements/REQ-GREET-001.md": `---
id: REQ-GREET-001
title: Greeting behavior
status: open
---

# Greeting behavior
`,
    "documentation/symbols.yaml": `symbols:
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

function writeSameCoordinateBehaviorEdit(root: string): void {
  writeFiles(root, {
    "src/greet.ts": `export function greet() {
  return "hullo";
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
    "documentation/requirements/REQ-GREET-001.md": `---
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

function commitRefreshedManifest(kibiBin: string, cwd: string): void {
  syncKb(kibiBin, cwd, ["--refresh-symbol-coordinates"]);
  execSync(
    "git add documentation/symbol-coordinates.yaml documentation/symbols.yaml",
    {
      cwd,
      stdio: "pipe",
    },
  );
  execSync('git commit -m "refresh manifest" --no-verify', {
    cwd,
    stdio: "pipe",
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
    "fails when source edits are staged after the refreshed symbols manifest was reverted",
    async () => {
      writeFiles(tmpDir, createTrackedFixture());
      commitAll(tmpDir, "initial");
      commitRefreshedManifest(kibiBin, tmpDir);

      writeShiftedBehaviorEdit(tmpDir);
      stageRequirementEvidence(
        tmpDir,
        "Staged requirement note proving KB evidence exists for this edit.",
      );
      syncKb(kibiBin, tmpDir, ["--refresh-symbol-coordinates"]);
      execSync(
        "git checkout -- documentation/symbol-coordinates.yaml documentation/symbols.yaml",
        {
          cwd: tmpDir,
          stdio: "pipe",
        },
      );
      execSync(
        "git add src/greet.ts documentation/requirements/REQ-GREET-001.md",
        {
          cwd: tmpDir,
          stdio: "pipe",
        },
      );

      const { status, stdout, stderr } = runKibi(
        kibiBin,
        ["check", "--staged"],
        tmpDir,
      );

      const output = stdoutToString(stdout || stderr);
      expect(status).toBe(1);
      expect(output).toContain("symbols_manifest_stale");
      expect(output).not.toContain("kibi_impact_evidence_missing");
    },
    TEST_TIMEOUT_MS,
  );

  test(
    "passes when the refreshed symbols manifest is staged with the source edit",
    async () => {
      writeFiles(tmpDir, createTrackedFixture());
      commitAll(tmpDir, "initial");
      commitRefreshedManifest(kibiBin, tmpDir);

      writeShiftedBehaviorEdit(tmpDir);
      syncKb(kibiBin, tmpDir, ["--refresh-symbol-coordinates"]);
      execSync(
        "git add src/greet.ts documentation/symbol-coordinates.yaml documentation/symbols.yaml",
        {
          cwd: tmpDir,
          stdio: "pipe",
        },
      );

      const { status, stdout, stderr } = runKibi(
        kibiBin,
        ["check", "--staged"],
        tmpDir,
      );

      const output = stdoutToString(stdout || stderr);
      expect(status).toBe(0);
      expect(output).not.toContain("symbols_manifest_stale");
    },
    TEST_TIMEOUT_MS,
  );

  test(
    "does not hard-fail when the staged manifest only has timestamp churn",
    async () => {
      writeFiles(tmpDir, createTrackedFixture());
      commitAll(tmpDir, "initial");
      commitRefreshedManifest(kibiBin, tmpDir);

      writeSameCoordinateBehaviorEdit(tmpDir);
      stageRequirementEvidence(
        tmpDir,
        "Staged requirement note covering the same-coordinate behavior edit.",
      );
      syncKb(kibiBin, tmpDir);
      execSync(
        "git add src/greet.ts documentation/requirements/REQ-GREET-001.md documentation/symbols.yaml",
        { cwd: tmpDir, stdio: "pipe" },
      );

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
    "emits stale diagnostics using configured docs/ symbol paths",
    async () => {
      writeFiles(tmpDir, {
        ".kb/config.json": JSON.stringify({
          $schema:
            "https://raw.githubusercontent.com/Looted/kibi/master/packages/cli/schema/config.json",
          schemaVersion: 4,
          paths: {
            requirements: "documentation/requirements",
            scenarios: "documentation/scenarios",
            tests: "documentation/tests",
            adr: "documentation/adr",
            flags: "documentation/flags",
            events: "documentation/events",
            facts: "documentation/facts",
            symbols: "docs/symbols.yaml",
          },
          checks: {
            rules: {
              "must-priority-coverage": true,
              "symbol-coverage": true,
              "symbol-traceability": true,
            },
          },
        }),
        "documentation/requirements/REQ-GREET-001.md": `---
id: REQ-GREET-001
title: Greeting behavior
status: open
---

# Greeting behavior
`,
        "docs/symbols.yaml": `symbols:
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

      syncKb(kibiBin, tmpDir, ["--refresh-symbol-coordinates"]);
      execSync("git add docs/symbol-coordinates.yaml docs/symbols.yaml", {
        cwd: tmpDir,
        stdio: "pipe",
      });
      execSync('git commit -m "refresh docs manifest" --no-verify', {
        cwd: tmpDir,
        stdio: "pipe",
      });

      writeShiftedBehaviorEdit(tmpDir);
      stageRequirementEvidence(
        tmpDir,
        "Staged requirement note proving KB evidence exists for this edit.",
      );
      execSync(
        "git checkout -- docs/symbol-coordinates.yaml docs/symbols.yaml",
        {
          cwd: tmpDir,
          stdio: "pipe",
        },
      );
      execSync(
        "git add src/greet.ts documentation/requirements/REQ-GREET-001.md",
        { cwd: tmpDir, stdio: "pipe" },
      );

      const { status, stdout, stderr } = runKibi(
        kibiBin,
        ["check", "--staged"],
        tmpDir,
      );

      const output = stdoutToString(stdout || stderr);
      expect(status).toBe(1);
      expect(output).toContain("symbols_manifest_stale");
      expect(output).toContain("docs/symbol-coordinates.yaml");
      expect(output).toContain(
        "git add docs/symbol-coordinates.yaml docs/symbols.yaml",
      );
      expect(output).not.toContain(
        "documentation/symbol-coordinates.yaml is stale",
      );
      expect(output).not.toContain("kibi_impact_evidence_missing");
    },
    TEST_TIMEOUT_MS,
  );
});
