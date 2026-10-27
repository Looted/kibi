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
import { withSemanticInventory } from "../helpers/inventory-fixture.js";
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

// Coordinates stay a gitignored local cache; only the normalized authored
// manifest is committed.
function commitRefreshedManifest(kibiBin: string, cwd: string): void {
  syncKb(kibiBin, cwd, ["--refresh-symbol-coordinates"]);
  execSync("git add .kb/symbols.yaml", { cwd, stdio: "pipe" });
  execSync(
    'git commit --allow-empty -m "refresh symbols manifest" --no-verify',
    {
      cwd,
      stdio: "pipe",
    },
  );
}

/**
 * A test that verifies the requirement directly. The requirement has no
 * scenario, so `covered_by` this test is qualifying symbol coverage for both
 * full `kibi check` and the staged gate.
 */
function coveringTest(testId: string, requirementId: string): FileMap {
  return {
    [`.kb/tests/${testId}.md`]: `---
id: ${testId}
title: ${testId} coverage
status: active
links:
  - type: validates
    target: ${requirementId}
---

# ${testId} coverage

Calls the covered function through its public export and asserts the value it returns for the fixture input.
`,
  };
}

function createBehaviorLinkedFixture(): FileMap {
  return {
    ".kb/requirements/REQ-BEHAVIOR-001.md": `---
id: REQ-BEHAVIOR-001
title: Greeting behavior
status: open
---

# Greeting behavior
`,
    ...coveringTest("TEST-BEHAVIOR-001", "REQ-BEHAVIOR-001"),
    ".kb/symbols.yaml": `symbols:
  - id: SYM-BEHAVIOR-001
    title: greet
    sourceFile: src/greet.ts
    links:
      - REQ-BEHAVIOR-001
      - type: covered_by
        target: TEST-BEHAVIOR-001
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
  return "howdy";
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
    ".kb/requirements/REQ-BEHAVIOR-001.md": `---
id: REQ-BEHAVIOR-001
title: Greeting behavior
status: open
${semanticInventoryFrontmatter(note)}
---

# Greeting behavior

${note}
`,
  });
}

function stageGranularRequirementEvidence(root: string, note: string): void {
  writeFiles(root, {
    // The note changes the statement, so the staged gate needs its inventory.
    ".kb/requirements/REQ-GRANULAR-001.md": withSemanticInventory(`---
id: REQ-GRANULAR-001
title: Granular ownership requirement
status: open
---

# Granular ownership requirement

${note}
`),
  });
}

function stageAuthoredSymbolsEvidence(root: string): void {
  writeFiles(root, {
    ".kb/symbols.yaml": `symbols:
  - id: SYM-BEHAVIOR-001
    title: greet
    sourceFile: src/greet.ts
    links:
      - REQ-BEHAVIOR-001
      - type: covered_by
        target: TEST-BEHAVIOR-001
    status: deprecated
`,
  });
}

function createExecutableTestFixture(): FileMap {
  return {
    ".kb/tests/TEST-EXEC-001.md": `---
id: TEST-EXEC-001
title: Widget executable test
status: passing
---

# Widget executable test
`,
    ".kb/symbols.yaml": `symbols:
  - id: SYM-EXEC-001
    title: widgetSpec
    sourceFile: tests/widget.test.ts
    relationships:
      - type: executable_for
        target: TEST-EXEC-001
    status: active
`,
    "tests/widget.test.ts": `export function widgetSpec() {
  return "ok";
}
`,
  };
}

function createUnlinkedSymbolFixture(): FileMap {
  return {
    ".kb/symbols.yaml": `symbols:
  - id: SYM-UNLINKED-001
    title: unlinkedAction
    sourceFile: src/unlinked.ts
    status: active
`,
    "src/unlinked.ts": `export function unlinkedAction() {
  return "initial";
}
`,
  };
}

function createMultiRequirementSymbolFixture(): FileMap {
  return {
    ".kb/requirements/REQ-MULTI-001.md": `---
id: REQ-MULTI-001
title: Multi requirement one
status: open
---

# Multi requirement one

## Context

Fixture requirement for the staged gate test: one symbol implements several requirements at once.
`,
    ".kb/requirements/REQ-MULTI-002.md": `---
id: REQ-MULTI-002
title: Multi requirement two
status: open
---

# Multi requirement two

## Context

Fixture requirement for the staged gate test: one symbol implements several requirements at once.
`,
    ".kb/requirements/REQ-MULTI-003.md": `---
id: REQ-MULTI-003
title: Multi requirement three
status: open
---

# Multi requirement three

## Context

Fixture requirement for the staged gate test: one symbol implements several requirements at once.
`,
    ".kb/symbols.yaml": `symbols:
  - id: SYM-MULTI-001
    title: multiAction
    sourceFile: src/multi.ts
    status: active
    symbol_kind: function
    symbol_role: behavioral
    relationships:
      - type: implements
        target: REQ-MULTI-001
      - type: implements
        target: REQ-MULTI-002
      - type: implements
        target: REQ-MULTI-003
      - type: covered_by
        target: TEST-MULTI-001
`,
    ...coveringTest("TEST-MULTI-001", "REQ-MULTI-001"),
    "src/multi.ts": `export function multiAction() {
  return "initial";
}
`,
  };
}

function createCoarseSymbolFixture(reason?: string): FileMap {
  const reasonLine = reason ? `    granularity_reason: ${reason}\n` : "";
  return {
    ".kb/requirements/REQ-GRANULAR-001.md": `---
id: REQ-GRANULAR-001
title: Granular ownership requirement
status: open
---

# Granular ownership requirement
`,
    ".kb/symbols.yaml": `symbols:
  - id: SYM-GREET-FILE
    title: greet.ts
    sourceFile: src/greet.ts
    sourceLine: 1
    sourceColumn: 1
    sourceEndLine: 1
    sourceEndColumn: 1
    links:
      - REQ-GRANULAR-001
${reasonLine}    status: active
`,
    "src/greet.ts": `export const greetModule = {};

export function greet() {
  return "hello";
}

export function farewell() {
  return "bye";
}
`,
  };
}

function createJustifiedCoarseAndGranularFixture(): FileMap {
  return {
    ".kb/requirements/REQ-GRANULAR-001.md": `---
id: REQ-GRANULAR-001
title: Granular ownership requirement
status: open
---

# Granular ownership requirement
`,
    ".kb/symbols.yaml": `symbols:
  - id: SYM-GREET-FILE
    title: greet.ts
    sourceFile: src/greet.ts
    sourceLine: 1
    sourceColumn: 1
    sourceEndLine: 1
    sourceEndColumn: 1
    links:
      - REQ-GRANULAR-001
    granularity_reason: module-level-behavior
    status: active
  - id: SYM-GREET-FUNCTION
    title: greet
    sourceFile: src/greet.ts
    links:
      - REQ-GRANULAR-001
    status: active
`,
    "src/greet.ts": `export const greetModule = {};

export function greet() {
  return "hello";
}

export function farewell() {
  return "bye";
}
`,
  };
}

function writeGranularBehaviorEdit(root: string): void {
  writeFiles(root, {
    "src/greet.ts": `export const greetModule = {};

export function greet() {
  return "howdy";
}

export function farewell() {
  return "bye";
}
`,
  });
}

function createGranularitySourceOnlyFixture(): FileMap {
  return {
    ...coveringTest("TEST-GRANULAR-001", "REQ-GRANULAR-001"),
    ".kb/requirements/REQ-GRANULAR-001.md": `---
id: REQ-GRANULAR-001
title: Granular ownership requirement
status: open
---

# Granular ownership requirement
`,
    "src/greet.ts": `export const greetModule = {};

export function greet() {
  return "hello";
}
`,
  };
}

function writeCoarseSymbolsManifest(
  root: string,
  options?: { reason?: string; interfaceSource?: boolean },
): void {
  const reasonLine = options?.reason
    ? `    granularity_reason: ${options.reason}\n`
    : "";
  const sourceFile = options?.interfaceSource
    ? "src/config.ts"
    : "src/greet.ts";
  const title = options?.interfaceSource ? "config.ts" : "greet.ts";
  writeFiles(root, {
    ".kb/symbols.yaml": `symbols:
  - id: SYM-COARSE-ONLY
    title: ${title}
    sourceFile: ${sourceFile}
    links:
      - REQ-GRANULAR-001
      - type: covered_by
        target: TEST-GRANULAR-001
${reasonLine}    status: active
`,
  });
}

function createInterfaceGranularityFixture(): FileMap {
  return {
    ...coveringTest("TEST-GRANULAR-001", "REQ-GRANULAR-001"),
    ".kb/requirements/REQ-GRANULAR-001.md": `---
id: REQ-GRANULAR-001
title: Granular ownership requirement
status: open
---

# Granular ownership requirement
`,
    "src/config.ts": `export const configModule = {};

export interface ConfigOptions {
  enabled: boolean;
}
`,
  };
}

describe("kibi check --staged impact enforcement", () => {
  const TEST_TIMEOUT_MS = 20000;
  const kibiBin = path.resolve(__dirname, "../../src/cli.ts");
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(path.join(os.tmpdir(), "kibi-staged-enforcement-"));
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
    "ignores staged README markdown without frontmatter under typed documentation paths",
    async () => {
      writeFiles(tmpDir, {
        "README.md": "# Initial\n",
      });
      commitAll(tmpDir, "initial");

      writeFiles(tmpDir, {
        "documentation/tests/e2e/README.md": "# E2E test notes\n",
      });
      execSync("git add documentation/tests/e2e/README.md", {
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
      expect(output).not.toContain("Missing required field: title");
    },
    TEST_TIMEOUT_MS,
  );

  test(
    "prints advisory quality diagnostics for staged symbols without failing",
    async () => {
      writeFiles(tmpDir, {
        "README.md": "# Initial\n",
      });
      commitAll(tmpDir, "initial");

      writeFiles(tmpDir, createMultiRequirementSymbolFixture());
      execSync("git add .kb/requirements .kb/tests .kb/symbols.yaml", {
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
      expect(output).toContain("multi_requirement_symbol_review");
      expect(output).toContain("SYM-MULTI-001");
      expect(output).not.toContain("kibi_impact_evidence_missing");
    },
    TEST_TIMEOUT_MS,
  );

  test(
    "fails behavior edits that add a declaration without staged Kibi evidence",
    async () => {
      writeFiles(tmpDir, createBehaviorLinkedFixture());
      commitAll(tmpDir, "initial");
      commitRefreshedManifest(kibiBin, tmpDir);

      writeFiles(tmpDir, {
        "src/greet.ts": `export function greet() {
  return "hello";
}

export function farewell() {
  return "bye";
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
      expect(output).toContain("kibi_impact_evidence_missing");
      expect(output).toContain("symbols without authored evidence: farewell");
    },
    TEST_TIMEOUT_MS,
  );

  test(
    "passes behavior edits when the linked requirement is staged",
    async () => {
      writeFiles(tmpDir, createBehaviorLinkedFixture());
      commitAll(tmpDir, "initial");
      commitRefreshedManifest(kibiBin, tmpDir);

      writeSameCoordinateBehaviorEdit(tmpDir);
      stageRequirementEvidence(
        tmpDir,
        "Updated to reflect the staged greeting change.",
      );
      execSync("git add src/greet.ts .kb/requirements/REQ-BEHAVIOR-001.md", {
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
      expect(output).not.toContain("kibi_impact_evidence_missing");
      expect(output).not.toContain("symbols_manifest_stale");
    },
    TEST_TIMEOUT_MS,
  );

  test(
    "passes behavior edits when authored symbols metadata is staged",
    async () => {
      writeFiles(tmpDir, createBehaviorLinkedFixture());
      commitAll(tmpDir, "initial");
      commitRefreshedManifest(kibiBin, tmpDir);

      writeSameCoordinateBehaviorEdit(tmpDir);
      stageAuthoredSymbolsEvidence(tmpDir);
      execSync("git add src/greet.ts .kb/symbols.yaml", {
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
      expect(output).not.toContain("kibi_impact_evidence_missing");
      expect(output).not.toContain("symbols_manifest_stale");
    },
    TEST_TIMEOUT_MS,
  );

  test(
    "passes a line-shifting behavior edit without staging any coordinates",
    async () => {
      writeFiles(tmpDir, createBehaviorLinkedFixture());
      commitAll(tmpDir, "initial");
      commitRefreshedManifest(kibiBin, tmpDir);

      writeShiftedBehaviorEdit(tmpDir);
      stageRequirementEvidence(
        tmpDir,
        "Staged requirement note proving KB evidence exists for this edit.",
      );
      execSync("git add src/greet.ts .kb/requirements/REQ-BEHAVIOR-001.md", {
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
    "treats a covering symbols manifest as evidence for a body-only edit, with the semantic review warning",
    async () => {
      writeFiles(tmpDir, createBehaviorLinkedFixture());
      commitAll(tmpDir, "initial");
      commitRefreshedManifest(kibiBin, tmpDir);

      writeSameCoordinateBehaviorEdit(tmpDir);
      execSync("git add src/greet.ts", { cwd: tmpDir, stdio: "pipe" });

      const { status, stdout, stderr } = runKibi(
        kibiBin,
        ["check", "--staged"],
        tmpDir,
      );

      const output = stdoutToString(stdout || stderr);
      expect(status).toBe(0);
      expect(output).not.toContain("kibi_impact_evidence_missing");
      expect(output).toContain("symbol_semantic_review_needed");
    },
    TEST_TIMEOUT_MS,
  );

  test(
    "rejects a changed symbol whose coverage full check rejects: a direct req test does not count once the requirement has a scenario",
    async () => {
      writeFiles(tmpDir, {
        ...createBehaviorLinkedFixture(),
        ".kb/scenarios/SCEN-BEHAVIOR-001.md": `---
id: SCEN-BEHAVIOR-001
title: Greeting scenario
status: active
---

# Greeting scenario
`,
      });
      writeFiles(tmpDir, {
        ".kb/requirements/REQ-BEHAVIOR-001.md": `---
id: REQ-BEHAVIOR-001
title: Greeting behavior
status: open
links:
  - type: specified_by
    target: SCEN-BEHAVIOR-001
---

# Greeting behavior
`,
      });
      commitAll(tmpDir, "initial");
      commitRefreshedManifest(kibiBin, tmpDir);

      writeShiftedBehaviorEdit(tmpDir);
      execSync("git add src/greet.ts", { cwd: tmpDir, stdio: "pipe" });

      const rejected = runKibi(kibiBin, ["check", "--staged"], tmpDir);
      const rejectedOutput = stdoutToString(rejected.stdout || rejected.stderr);
      expect(rejected.status).toBe(1);
      expect(rejectedOutput).toContain("[symbol-coverage] SYM-BEHAVIOR-001");
      expect(rejectedOutput).toContain(
        "Production symbol lacks qualifying requirement coverage: SYM-BEHAVIOR-001 is covered_by TEST-BEHAVIOR-001, but TEST-BEHAVIOR-001 does not verify REQ-BEHAVIOR-001, which SYM-BEHAVIOR-001 implements.",
      );
      expect(rejectedOutput).toContain(
        "Add verified_by(SCEN-BEHAVIOR-001, TEST-BEHAVIOR-001) (REQ-BEHAVIOR-001 is specified_by SCEN-BEHAVIOR-001)",
      );

      // The scenario-backed path satisfies the rule in both checks.
      writeFiles(tmpDir, {
        ".kb/tests/TEST-BEHAVIOR-001.md": `---
id: TEST-BEHAVIOR-001
title: TEST-BEHAVIOR-001 coverage
status: active
links:
  - type: validates
    target: SCEN-BEHAVIOR-001
---

# TEST-BEHAVIOR-001 coverage

Calls the covered function through its public export and asserts the value it returns for the fixture input.
`,
      });
      execSync("git add .kb/tests/TEST-BEHAVIOR-001.md", {
        cwd: tmpDir,
        stdio: "pipe",
      });
      const accepted = runKibi(kibiBin, ["check", "--staged"], tmpDir);
      const acceptedOutput = stdoutToString(accepted.stdout || accepted.stderr);
      expect(acceptedOutput).not.toContain("symbol-coverage");
      expect(accepted.status).toBe(0);
    },
    TEST_TIMEOUT_MS,
  );

  test(
    "rejects a manifest-only edit that drops a symbol's coverage",
    async () => {
      writeFiles(tmpDir, createBehaviorLinkedFixture());
      commitAll(tmpDir, "initial");

      writeFiles(tmpDir, {
        ".kb/symbols.yaml": `symbols:
  - id: SYM-BEHAVIOR-001
    title: greet
    sourceFile: src/greet.ts
    links:
      - REQ-BEHAVIOR-001
    status: active
`,
      });
      execSync("git add .kb/symbols.yaml", { cwd: tmpDir, stdio: "pipe" });

      const { status, stdout, stderr } = runKibi(
        kibiBin,
        ["check", "--staged"],
        tmpDir,
      );
      const output = stdoutToString(stdout || stderr);
      expect(output).toContain("[symbol-coverage] SYM-BEHAVIOR-001");
      expect(status).toBe(1);
    },
    TEST_TIMEOUT_MS,
  );

  test(
    "does not emit impact diagnostics for test-only executable test edits",
    async () => {
      writeFiles(tmpDir, createExecutableTestFixture());
      commitAll(tmpDir, "initial");
      syncKb(kibiBin, tmpDir);

      writeFiles(tmpDir, {
        "tests/widget.test.ts": `export function widgetSpec() {
  return "updated";
}
`,
      });
      execSync("git add tests/widget.test.ts", { cwd: tmpDir, stdio: "pipe" });

      const { status, stdout, stderr } = runKibi(
        kibiBin,
        ["check", "--staged"],
        tmpDir,
      );

      const output = stdoutToString(stdout || stderr);
      expect(status).toBe(0);
      expect(output).not.toContain("kibi_impact_evidence_missing");
    },
    TEST_TIMEOUT_MS,
  );

  test(
    "does not emit impact diagnostics for docs-only edits",
    async () => {
      writeFiles(tmpDir, {
        "README.md": "# Kibi\n",
      });
      commitAll(tmpDir, "initial");

      writeFiles(tmpDir, {
        "README.md": "# Kibi\n\nUpdated docs only.\n",
      });
      execSync("git add README.md", { cwd: tmpDir, stdio: "pipe" });

      const { status, stdout, stderr } = runKibi(
        kibiBin,
        ["check", "--staged"],
        tmpDir,
      );

      const output = stdoutToString(stdout || stderr);
      expect(status).toBe(0);
      expect(output).not.toContain("kibi_impact_evidence_missing");
    },
    TEST_TIMEOUT_MS,
  );

  test(
    "keeps changed_symbol_violation output for an unlinked changed symbol",
    async () => {
      writeFiles(tmpDir, createUnlinkedSymbolFixture());
      commitAll(tmpDir, "initial");
      commitRefreshedManifest(kibiBin, tmpDir);

      writeFiles(tmpDir, {
        "src/unlinked.ts": `export function unlinkedAction() {
  return "changed";
}
`,
      });
      execSync("git add src/unlinked.ts", { cwd: tmpDir, stdio: "pipe" });

      const { status, stdout, stderr } = runKibi(
        kibiBin,
        ["check", "--staged"],
        tmpDir,
      );

      const output = stdoutToString(stdout || stderr);
      expect(status).toBe(1);
      expect(output).toContain("[symbol-coverage] SYM-UNLINKED-001");
      expect(output).toContain("Traceability failed");
    },
    TEST_TIMEOUT_MS,
  );

  test(
    "fails staged code when a coarse symbol owns a file that has granular symbols",
    async () => {
      writeFiles(tmpDir, createCoarseSymbolFixture());
      commitAll(tmpDir, "initial");
      commitRefreshedManifest(kibiBin, tmpDir);

      writeGranularBehaviorEdit(tmpDir);
      stageGranularRequirementEvidence(
        tmpDir,
        "Staged requirement note proving KB evidence exists for this edit.",
      );
      execSync("git add src/greet.ts .kb/requirements/REQ-GRANULAR-001.md", {
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
      expect(output).toContain("symbol_granularity_violation");
      expect(output).toContain("SYM-GREET-FILE");
      expect(output).toContain("greet");
    },
    TEST_TIMEOUT_MS,
  );

  test(
    "allows justified coarse symbols when granular ownership is present",
    async () => {
      writeFiles(tmpDir, createJustifiedCoarseAndGranularFixture());
      commitAll(tmpDir, "initial");
      commitRefreshedManifest(kibiBin, tmpDir);

      writeGranularBehaviorEdit(tmpDir);
      stageGranularRequirementEvidence(
        tmpDir,
        "Staged requirement note proving KB evidence exists for this edit.",
      );
      execSync(
        "git add src/greet.ts .kb/requirements/REQ-GRANULAR-001.md .kb/symbols.yaml",
        { cwd: tmpDir, stdio: "pipe" },
      );

      const { status, stdout, stderr } = runKibi(
        kibiBin,
        ["check", "--staged"],
        tmpDir,
      );

      const output = stdoutToString(stdout || stderr);
      expect(status).toBe(1);
      expect(output).not.toContain("symbol_granularity_violation");
    },
    TEST_TIMEOUT_MS,
  );

  test(
    "fails when only symbols.yaml adds an unjustified coarse link",
    async () => {
      writeFiles(tmpDir, createGranularitySourceOnlyFixture());
      commitAll(tmpDir, "initial");

      writeCoarseSymbolsManifest(tmpDir);
      execSync("git add .kb/symbols.yaml", {
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
      expect(output).toContain("symbol_granularity_violation");
      expect(output).toContain("SYM-COARSE-ONLY");
      expect(output).toContain("greet");
    },
    TEST_TIMEOUT_MS,
  );

  test(
    "passes when only symbols.yaml adds a justified coarse link",
    async () => {
      writeFiles(tmpDir, createGranularitySourceOnlyFixture());
      commitAll(tmpDir, "initial");

      writeCoarseSymbolsManifest(tmpDir, { reason: "module-level-behavior" });
      execSync("git add .kb/symbols.yaml", {
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
      expect(output).not.toContain("symbol_granularity_violation");
    },
    TEST_TIMEOUT_MS,
  );

  test(
    "passes coarse links when only type-shape symbols are available",
    async () => {
      writeFiles(tmpDir, createInterfaceGranularityFixture());
      commitAll(tmpDir, "initial");

      writeCoarseSymbolsManifest(tmpDir, { interfaceSource: true });
      execSync("git add .kb/symbols.yaml", {
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
      expect(output).not.toContain("symbol_granularity_violation");
    },
    TEST_TIMEOUT_MS,
  );

  describe("a commit that moves a legacy symbols manifest into .kb/", () => {
    const legacyRecord = (id: string, title: string, extra = "") =>
      `  - id: ${id}
    title: ${title}
    sourceFile: src/${title}.ts
    links:
      - REQ-LEGACY-001
    status: active
${extra}`;

    function commitLegacyLayout(): void {
      writeFiles(tmpDir, {
        ".kb/requirements/REQ-LEGACY-001.md": `---
id: REQ-LEGACY-001
title: Legacy behavior
status: open
---

# Legacy behavior
`,
        "src/alpha.ts": 'export function alpha() {\n  return "a";\n}\n',
        "src/beta.ts": 'export function beta() {\n  return "b";\n}\n',
        "src/gamma.ts": 'export function gamma() {\n  return "c";\n}\n',
        // Neither symbol has qualifying coverage: debt that predates the move.
        "documentation/symbols.yaml": `symbols:\n${legacyRecord("SYM-LEGACY-ALPHA", "alpha")}${legacyRecord("SYM-LEGACY-BETA", "beta")}`,
      });
      rmSync(path.join(tmpDir, ".kb/symbols.yaml"), { force: true });
      commitAll(tmpDir, "legacy layout");
      execSync("git mv documentation/symbols.yaml .kb/symbols.yaml", {
        cwd: tmpDir,
        stdio: "pipe",
      });
    }

    test(
      "reports coverage only for the record the commit edited",
      async () => {
        commitLegacyLayout();
        writeFiles(tmpDir, {
          ".kb/symbols.yaml": `symbols:\n${legacyRecord("SYM-LEGACY-ALPHA", "alpha")}${legacyRecord("SYM-LEGACY-BETA", "beta", "    owner: platform\n")}`,
        });
        execSync("git add .kb/symbols.yaml", { cwd: tmpDir, stdio: "pipe" });

        const { status, stdout, stderr } = runKibi(
          kibiBin,
          ["check", "--staged"],
          tmpDir,
        );
        const output = stdoutToString(stdout || stderr);
        expect(output).toContain(
          "Baseline: HEAD with 1 staged knowledge rename(s) into .kb/ resolved",
        );
        expect(output).toContain("[symbol-coverage] SYM-LEGACY-BETA");
        expect(output).not.toContain("SYM-LEGACY-ALPHA");
        expect(status).toBe(1);
      },
      TEST_TIMEOUT_MS,
    );

    test(
      "still reports an uncovered symbol the commit adds",
      async () => {
        commitLegacyLayout();
        writeFiles(tmpDir, {
          ".kb/symbols.yaml": `symbols:\n${legacyRecord("SYM-LEGACY-ALPHA", "alpha")}${legacyRecord("SYM-LEGACY-BETA", "beta")}${legacyRecord("SYM-LEGACY-GAMMA", "gamma")}`,
        });
        execSync("git add .kb/symbols.yaml", { cwd: tmpDir, stdio: "pipe" });

        const { status, stdout, stderr } = runKibi(
          kibiBin,
          ["check", "--staged"],
          tmpDir,
        );
        const output = stdoutToString(stdout || stderr);
        expect(output).toContain("[symbol-coverage] SYM-LEGACY-GAMMA");
        expect(output).not.toContain("SYM-LEGACY-ALPHA");
        expect(output).not.toContain("SYM-LEGACY-BETA");
        expect(status).toBe(1);
      },
      TEST_TIMEOUT_MS,
    );

    test(
      "passes a pure move and leaves the debt to the full check",
      async () => {
        commitLegacyLayout();

        const staged = runKibi(kibiBin, ["check", "--staged"], tmpDir);
        const stagedOutput = stdoutToString(staged.stdout || staged.stderr);
        expect(stagedOutput).toContain(
          "No staged changes beyond the resolved renames.",
        );
        expect(stagedOutput).not.toContain("symbol-coverage");
        expect(staged.status).toBe(0);
      },
      TEST_TIMEOUT_MS,
    );
  });
});
