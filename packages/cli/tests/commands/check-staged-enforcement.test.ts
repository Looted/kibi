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

function commitRefreshedCoordinates(kibiBin: string, cwd: string): void {
  syncKb(kibiBin, cwd, ["--refresh-symbol-coordinates"]);
  execSync(
    "git add documentation/symbol-coordinates.yaml documentation/symbols.yaml",
    {
      cwd,
      stdio: "pipe",
    },
  );
  execSync('git commit -m "refresh symbol coordinates" --no-verify', {
    cwd,
    stdio: "pipe",
  });
}

function createBehaviorLinkedFixture(): FileMap {
  return {
    "documentation/requirements/REQ-BEHAVIOR-001.md": `---
id: REQ-BEHAVIOR-001
title: Greeting behavior
status: open
---

# Greeting behavior
`,
    "documentation/symbols.yaml": `symbols:
  - id: SYM-BEHAVIOR-001
    title: greet
    sourceFile: src/greet.ts
    links:
      - REQ-BEHAVIOR-001
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
    "documentation/requirements/REQ-BEHAVIOR-001.md": `---
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
    "documentation/requirements/REQ-GRANULAR-001.md": `---
id: REQ-GRANULAR-001
title: Granular ownership requirement
status: open
---

# Granular ownership requirement

${note}
`,
  });
}

function stageAuthoredSymbolsEvidence(root: string): void {
  writeFiles(root, {
    "documentation/symbols.yaml": `symbols:
  - id: SYM-BEHAVIOR-001
    title: greet
    sourceFile: src/greet.ts
    links:
      - REQ-BEHAVIOR-001
    status: deprecated
`,
  });
}

function createExecutableTestFixture(): FileMap {
  return {
    "documentation/tests/TEST-EXEC-001.md": `---
id: TEST-EXEC-001
title: Widget executable test
status: passing
---

# Widget executable test
`,
    "documentation/symbols.yaml": `symbols:
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
    "documentation/symbols.yaml": `symbols:
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
    "documentation/requirements/REQ-MULTI-001.md": `---
id: REQ-MULTI-001
title: Multi requirement one
status: open
---

# Multi requirement one
`,
    "documentation/requirements/REQ-MULTI-002.md": `---
id: REQ-MULTI-002
title: Multi requirement two
status: open
---

# Multi requirement two
`,
    "documentation/requirements/REQ-MULTI-003.md": `---
id: REQ-MULTI-003
title: Multi requirement three
status: open
---

# Multi requirement three
`,
    "documentation/symbols.yaml": `symbols:
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
`,
    "src/multi.ts": `export function multiAction() {
  return "initial";
}
`,
  };
}

function createCoarseSymbolFixture(reason?: string): FileMap {
  const reasonLine = reason ? `    granularity_reason: ${reason}\n` : "";
  return {
    "documentation/requirements/REQ-GRANULAR-001.md": `---
id: REQ-GRANULAR-001
title: Granular ownership requirement
status: open
---

# Granular ownership requirement
`,
    "documentation/symbols.yaml": `symbols:
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
    "documentation/requirements/REQ-GRANULAR-001.md": `---
id: REQ-GRANULAR-001
title: Granular ownership requirement
status: open
---

# Granular ownership requirement
`,
    "documentation/symbols.yaml": `symbols:
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
    "documentation/requirements/REQ-GRANULAR-001.md": `---
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
    "documentation/symbols.yaml": `symbols:
  - id: SYM-COARSE-ONLY
    title: ${title}
    sourceFile: ${sourceFile}
    links:
      - REQ-GRANULAR-001
${reasonLine}    status: active
`,
  });
}

function createInterfaceGranularityFixture(): FileMap {
  return {
    "documentation/requirements/REQ-GRANULAR-001.md": `---
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
      execSync(
        "git add documentation/requirements documentation/symbols.yaml",
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
      expect(output).toContain("multi_requirement_symbol_review");
      expect(output).toContain("SYM-MULTI-001");
      expect(output).not.toContain("kibi_impact_evidence_missing");
    },
    TEST_TIMEOUT_MS,
  );

  test(
    "fails behavior edits without staged Kibi evidence",
    async () => {
      writeFiles(tmpDir, createBehaviorLinkedFixture());
      commitAll(tmpDir, "initial");
      commitRefreshedCoordinates(kibiBin, tmpDir);

      writeSameCoordinateBehaviorEdit(tmpDir);
      execSync("git add src/greet.ts", { cwd: tmpDir, stdio: "pipe" });

      const { status, stdout, stderr } = runKibi(
        kibiBin,
        ["check", "--staged"],
        tmpDir,
      );

      const output = stdoutToString(stdout || stderr);
      expect(status).toBe(1);
      expect(output).toContain("kibi_impact_evidence_missing");
      expect(output).toContain("src/greet.ts");
    },
    TEST_TIMEOUT_MS,
  );

  test(
    "passes behavior edits when linked requirement markdown is staged too",
    async () => {
      writeFiles(tmpDir, createBehaviorLinkedFixture());
      commitAll(tmpDir, "initial");
      commitRefreshedCoordinates(kibiBin, tmpDir);

      writeSameCoordinateBehaviorEdit(tmpDir);
      stageRequirementEvidence(
        tmpDir,
        "Updated to reflect the staged greeting change.",
      );
      execSync(
        "git add src/greet.ts documentation/requirements/REQ-BEHAVIOR-001.md",
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
      expect(output).not.toContain("kibi_impact_evidence_missing");
      expect(output).not.toContain("symbols_manifest_stale");
    },
    TEST_TIMEOUT_MS,
  );

  test(
    "passes behavior edits when authored symbols metadata is staged without coordinate changes",
    async () => {
      writeFiles(tmpDir, createBehaviorLinkedFixture());
      commitAll(tmpDir, "initial");
      commitRefreshedCoordinates(kibiBin, tmpDir);

      writeSameCoordinateBehaviorEdit(tmpDir);
      stageAuthoredSymbolsEvidence(tmpDir);
      execSync("git add src/greet.ts documentation/symbols.yaml", {
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
    "fails behavior edits when symbol coordinates are stale and unstaged",
    async () => {
      writeFiles(tmpDir, createBehaviorLinkedFixture());
      commitAll(tmpDir, "initial");
      commitRefreshedCoordinates(kibiBin, tmpDir);

      writeShiftedBehaviorEdit(tmpDir);
      stageRequirementEvidence(
        tmpDir,
        "Staged requirement note proving KB evidence exists for this edit.",
      );
      execSync(
        "git add src/greet.ts documentation/requirements/REQ-BEHAVIOR-001.md",
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
      expect(output).toContain("documentation/symbol-coordinates.yaml");
      expect(output).toContain(
        "kibi sync --refresh-symbol-coordinates && git add documentation/symbol-coordinates.yaml documentation/symbols.yaml",
      );
      expect(output).not.toContain("kibi_impact_evidence_missing");
    },
    TEST_TIMEOUT_MS,
  );

  test(
    "fails when refreshed symbol coordinates exist only in the working tree",
    async () => {
      writeFiles(tmpDir, createBehaviorLinkedFixture());
      commitAll(tmpDir, "initial");
      commitRefreshedCoordinates(kibiBin, tmpDir);

      writeShiftedBehaviorEdit(tmpDir);
      stageRequirementEvidence(
        tmpDir,
        "Staged requirement note proving KB evidence exists for this edit.",
      );
      syncKb(kibiBin, tmpDir, ["--refresh-symbol-coordinates"]);
      execSync(
        "git add src/greet.ts documentation/requirements/REQ-BEHAVIOR-001.md",
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
      expect(output).toContain("documentation/symbol-coordinates.yaml");
      expect(output).toContain(
        "kibi sync --refresh-symbol-coordinates && git add documentation/symbol-coordinates.yaml documentation/symbols.yaml",
      );
      expect(output).not.toContain("kibi_impact_evidence_missing");
    },
    TEST_TIMEOUT_MS,
  );

  test(
    "passes behavior edits when refreshed symbol coordinates are staged",
    async () => {
      writeFiles(tmpDir, createBehaviorLinkedFixture());
      commitAll(tmpDir, "initial");
      commitRefreshedCoordinates(kibiBin, tmpDir);

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
      expect(output).not.toContain("kibi_impact_evidence_missing");
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
    "keeps changed_symbol_violation output alongside the new impact diagnostic",
    async () => {
      writeFiles(tmpDir, createUnlinkedSymbolFixture());
      commitAll(tmpDir, "initial");
      commitRefreshedCoordinates(kibiBin, tmpDir);

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
      expect(output).toContain("kibi_impact_evidence_missing");
      expect(output).toContain("Traceability failed");
    },
    TEST_TIMEOUT_MS,
  );

  test(
    "fails staged code when a coarse symbol owns a file that has granular symbols",
    async () => {
      writeFiles(tmpDir, createCoarseSymbolFixture());
      commitAll(tmpDir, "initial");
      commitRefreshedCoordinates(kibiBin, tmpDir);

      writeGranularBehaviorEdit(tmpDir);
      stageGranularRequirementEvidence(
        tmpDir,
        "Staged requirement note proving KB evidence exists for this edit.",
      );
      execSync(
        "git add src/greet.ts documentation/requirements/REQ-GRANULAR-001.md",
        { cwd: tmpDir, stdio: "pipe" },
      );

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
      commitRefreshedCoordinates(kibiBin, tmpDir);

      writeGranularBehaviorEdit(tmpDir);
      execSync("git add src/greet.ts", { cwd: tmpDir, stdio: "pipe" });
      syncKb(kibiBin, tmpDir, ["--refresh-symbol-coordinates"]);
      stageGranularRequirementEvidence(
        tmpDir,
        "Staged requirement note proving KB evidence exists for this edit.",
      );
      execSync(
        "git add src/greet.ts documentation/requirements/REQ-GRANULAR-001.md documentation/symbol-coordinates.yaml documentation/symbols.yaml",
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
      execSync("git add documentation/symbols.yaml", {
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
      execSync("git add documentation/symbols.yaml", {
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
      execSync("git add documentation/symbols.yaml", {
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
});
