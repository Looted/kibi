// implements REQ-kb-check-unverified-requirement-statements
import { afterEach, describe, expect, it } from "bun:test";
import { execFileSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { analyzeChangedFileImpact } from "../../src/public/impact/analyzer.js";
import { buildSummary } from "../../src/public/operations/check-format-shared.js";

const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

function write(root: string, file: string, content: string): void {
  fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
  fs.writeFileSync(path.join(root, file), content);
}

const FLOOR = "Kibi must reject a swipl on PATH older than version 9.0.";

function floorWorkspace(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-statements-"));
  roots.push(root);
  write(
    root,
    ".kb/requirements/REQ-swipl-floor.md",
    `---\nid: REQ-swipl-floor\ntitle: Kibi rejects an old swipl\nstatus: open\nsemantic_text: ${FLOOR}\n---\n\n${FLOOR}\n`,
  );
  write(
    root,
    ".kb/requirements/REQ-swipl-message.md",
    "---\nid: REQ-swipl-message\ntitle: The not-found error names the platform\nstatus: open\norigin:\n  kind: agent\n---\n\nThe not-found error names the platform.\n",
  );
  write(
    root,
    ".kb/requirements/REQ-swipl-old.md",
    "---\nid: REQ-swipl-old\ntitle: Kibi accepts swipl 8\nstatus: closed\n---\n\nKibi accepts swipl 8.\n",
  );
  write(
    root,
    "src/resolver.ts",
    [
      "// implements REQ-swipl-floor, REQ-swipl-old",
      "export function minimumSwiplMajor(): number {",
      "  return 9;",
      "}",
      "",
      "// implements REQ-swipl-message",
      "export function notFoundMessage(platform: string): string {",
      "  return `no swipl for ${platform}`;",
      "}",
      "",
    ].join("\n"),
  );
  return root;
}

async function statements(root: string) {
  const result = await analyzeChangedFileImpact({
    workspaceRoot: root,
    sourceFiles: ["src/resolver.ts"],
    includeImpactDiagnostics: true,
  });
  return {
    result,
    diagnostics: result.impactDiagnostics.filter(
      (diagnostic) => diagnostic.id === "requirement_statement_unverified",
    ),
  };
}

describe("kb_check quotes the requirements changed code implements", () => {
  it("names each current requirement with its statement and firmness", async () => {
    const { diagnostics } = await statements(floorWorkspace());
    expect(diagnostics.map((diagnostic) => diagnostic.entityId)).toEqual([
      "REQ-swipl-floor",
      "REQ-swipl-message",
    ]);
    const [floor, message] = diagnostics;
    expect(floor).toMatchObject({
      severity: "warning",
      blocking: false,
      files: ["src/resolver.ts"],
      evidence: {
        requirement: "REQ-swipl-floor",
        firmness: "firm",
        statement: FLOOR,
        symbols: ["minimumSwiplMajor"],
      },
    });
    expect(floor?.message).toContain(
      `minimumSwiplMajor, which implements REQ-swipl-floor [firm: ask before changing]: "${FLOOR}"`,
    );
    expect(floor?.message).toContain(
      "no violation here does not mean the change keeps it",
    );
    expect(floor?.suggestion).toContain("stop and ask whether to change");
    expect(message?.evidence).toMatchObject({ firmness: "default" });
    expect(message?.suggestion).toContain(
      "ask whether to change REQ-swipl-message before keeping the change",
    );
  });

  it("leaves a requirement whose own document changed to the firmness checks", async () => {
    const root = floorWorkspace();
    const git = (...args: string[]) =>
      execFileSync("git", args, { cwd: root, stdio: "ignore" });
    git("init", "-q");
    git("-c", "user.email=t@example.com", "-c", "user.name=t", "add", ".");
    git(
      "-c",
      "user.email=t@example.com",
      "-c",
      "user.name=t",
      "commit",
      "-qm",
      "base",
    );
    write(
      root,
      ".kb/requirements/REQ-swipl-floor.md",
      "---\nid: REQ-swipl-floor\ntitle: Kibi rejects an old swipl\nstatus: open\nsemantic_text: Kibi must reject a swipl older than 10.0.\n---\n\nKibi must reject a swipl older than 10.0.\n",
    );
    const { diagnostics } = await statements(root);
    expect(diagnostics.map((diagnostic) => diagnostic.entityId)).toEqual([
      "REQ-swipl-message",
    ]);
  });

  it("the check summary does not lead with a bare no-violations line", async () => {
    const { result } = await statements(floorWorkspace());
    const summary = buildSummary({
      violations: [],
      impactResult: result,
      qualityDiagnostics: [],
    });
    expect(summary.split("\n")[0]).toStartWith(
      "No structural violations found. The changed code implements REQ-swipl-floor, REQ-swipl-message; Kibi did not compare the code with their statements",
    );
    expect(
      buildSummary({
        violations: [],
        impactResult: undefined,
        qualityDiagnostics: [],
      }),
    ).toStartWith("No violations found");
  });
});
