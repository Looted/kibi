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
  execSync(`bun ${kibiBin} sync${args.length > 0 ? ` ${args.join(" ")}` : ""}`, {
    cwd,
    stdio: "pipe",
  });
}

function commitRefreshedCoordinates(kibiBin: string, cwd: string): void {
  syncKb(kibiBin, cwd, ["--refresh-symbol-coordinates"]);
  execSync("git add documentation/symbol-coordinates.yaml documentation/symbols.yaml", {
    cwd,
    stdio: "pipe",
  });
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
    "src/greet.ts": `export function greet() {
  const subject = "world";
  return ` + "`hello ${subject}`" + `;
}
`,
  });
}

function writeSameCoordinateBehaviorEdit(root: string): void {
  writeFiles(root, {
    "src/greet.ts": `export function greet() {
  return "hello world";
}
`,
  });
}

function stageRequirementEvidence(root: string, note: string): void {
  writeFiles(root, {
    "documentation/requirements/REQ-BEHAVIOR-001.md": `---
id: REQ-BEHAVIOR-001
title: Greeting behavior
status: open
---

# Greeting behavior

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

describe("kibi check --staged impact enforcement", () => {
  const TEST_TIMEOUT_MS = 20000;
  const kibiBin = path.resolve(__dirname, "../../src/cli.ts");
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(path.join(os.tmpdir(), "kibi-staged-enforcement-"));
    execSync("git init", { cwd: tmpDir, stdio: "pipe" });
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
});
