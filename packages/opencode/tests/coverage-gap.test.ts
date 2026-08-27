import { afterEach, beforeEach, describe, test } from "bun:test";
import { strict as assert } from "node:assert";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { analyzeCodeFile } from "../src/comment-analysis";
import { getKbExistenceTargets, loadKbSyncPaths } from "../src/file-filter";
import kibiOpencodePlugin from "../src/index";
import { buildPrompt } from "../src/prompt";
import { detectPosture } from "../src/repo-posture";
import {
  getRequirementPriority,
  isMustPriorityRequirement,
} from "../src/requirement-doc";
import { checkWorkspaceHealth } from "../src/workspace-health";

describe("opencode coverage gaps", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-opencode-gaps-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  // implements REQ-opencode-comment-routing
  test("analyzeCodeFile ignores Python assignment docstrings at module and class scope", () => {
    const pyFile = path.join(tmpDir, "assignment-docstrings.py");
    fs.writeFileSync(
      pyFile,
      `module_text = """
This looks durable.
But it is assigned at module scope.
So it is not a docstring.
"""

class Example:
    details = '''
    This is assigned inside a class body.
    It must not count as a class docstring.
    It only exists as data.
    '''

    def build(self):
        return self.details
`,
    );

    assert.equal(analyzeCodeFile(pyFile, { minLines: 3 }), null);
  });

  // implements REQ-opencode-comment-routing
  test("analyzeCodeFile skips standalone Python triple quotes after a real statement", () => {
    const pyFile = path.join(tmpDir, "post-statement-triple-quotes.py");
    fs.writeFileSync(
      pyFile,
      `value = 1
"""
This block comes after executable code.
It is not a module docstring anymore.
It should be ignored.
"""
`,
    );

    assert.equal(analyzeCodeFile(pyFile, { minLines: 3 }), null);
  });

  // implements REQ-opencode-comment-routing
  test("analyzeCodeFile ignores empty Python class docstrings", () => {
    const pyFile = path.join(tmpDir, "empty-class-docstring.py");
    fs.writeFileSync(
      pyFile,
      `class Example:
    """
    """

    def build(self):
        return 1
`,
    );

    assert.equal(analyzeCodeFile(pyFile, { minLines: 1 }), null);
  });

  // implements REQ-opencode-kibi-plugin-v1
  test("loadKbSyncPaths falls back to defaults when config JSON is invalid", () => {
    fs.mkdirSync(path.join(tmpDir, ".kb"), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, ".kb", "manifest.json"), "{not-json");

    const paths = loadKbSyncPaths(tmpDir);

    assert.equal(paths.requirements, ".kb/requirements/**/*.md");
    assert.equal(paths.symbols, ".kb/symbols.yaml");
  });

  // implements REQ-opencode-kibi-plugin-v1
  test("getKbExistenceTargets always reports canonical .kb/ lanes", () => {
    fs.mkdirSync(path.join(tmpDir, ".kb"), { recursive: true });
    fs.writeFileSync(
      path.join(tmpDir, ".kb", "manifest.json"),
      JSON.stringify({
        paths: {
          requirements: "",
          symbols: "docs/symbols.yml",
        },
      }),
    );

    const targets = getKbExistenceTargets(tmpDir);

    assert.equal(
      targets.some((target) => target.key === "requirements"),
      true,
    );
    assert.deepEqual(
      targets.find((target) => target.key === "symbols"),
      {
        key: "symbols",
        relativePath: ".kb/symbols.yaml",
        kind: "file",
      },
    );
  });

  // implements REQ-opencode-kibi-plugin-v1
  test("detectPosture treats AGENTS guidance as root Kibi intent", () => {
    fs.writeFileSync(
      path.join(tmpDir, "AGENTS.md"),
      "Always use kb_search before kb_query.\n",
    );

    const posture = detectPosture(tmpDir);

    assert.equal(posture.state, "root_uninitialized");
    assert.equal(posture.needsBootstrap, true);
    assert.match(posture.reason, /intent detected at root/);
  });

  // implements REQ-opencode-kibi-plugin-v1
  test("requirement-doc parses numeric and quoted frontmatter values conservatively", () => {
    const numericFile = path.join(tmpDir, "REQ-NUMERIC.md");
    fs.writeFileSync(
      numericFile,
      `---
id: REQ-NUMERIC
title: 'Priority # stays quoted' # trailing comment
priority: 1
---
`,
    );

    assert.equal(isMustPriorityRequirement(numericFile), false);
    assert.equal(getRequirementPriority(numericFile), null);
  });

  // implements REQ-opencode-kibi-plugin-v1
  test("checkWorkspaceHealth uses defaults when config exists but is unreadable", () => {
    fs.mkdirSync(path.join(tmpDir, ".kb"), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, ".kb", "manifest.json"), "{not-json");
    fs.mkdirSync(path.join(tmpDir, ".kb", "requirements"), {
      recursive: true,
    });

    const result = checkWorkspaceHealth(tmpDir);

    assert.equal(result.missingConfig, false);
    assert.ok(result.missingDocDirs.includes(".kb/scenarios"));
  });

  // implements REQ-opencode-kibi-plugin-v1
  test("checkWorkspaceHealth keeps partial roots advisory when only two targets are missing", () => {
    fs.mkdirSync(path.join(tmpDir, ".kb"), { recursive: true });
    fs.writeFileSync(
      path.join(tmpDir, ".kb", "manifest.json"),
      JSON.stringify({}),
    );

    const docDirs = [
      ".kb/requirements",
      ".kb/scenarios",
      ".kb/tests",
      ".kb/adr",
      ".kb/flags",
      ".kb/events",
    ];
    for (const dir of docDirs) {
      fs.mkdirSync(path.join(tmpDir, dir), { recursive: true });
    }
    fs.writeFileSync(path.join(tmpDir, ".kb", "symbols.yaml"), "[]\n");

    const result = checkWorkspaceHealth(tmpDir);

    assert.deepEqual(result.missingDocDirs, [".kb/facts"]);
    assert.equal(result.needsBootstrap, false);
  });

  // implements REQ-opencode-smart-enforcement-v1
  test("buildPrompt appends completion reminder for risky active-root guidance", () => {
    const prompt = buildPrompt({
      recentEdits: [{ path: "src/feature.ts", kind: "code" }],
      posture: "root_active",
      riskClass: "behavior_candidate",
      completionReminder: true,
      maintenanceDegraded: false,
    });

    assert.match(
      prompt,
      /Kibi impact evidence is required before completion\/commit: run `kb_check` before completing this task/,
    );
  });

  // implements REQ-opencode-kibi-plugin-v1
  test("plugin setup accepts minimal typed input without optional fields", async () => {
    const hooks = await kibiOpencodePlugin({
      directory: tmpDir,
      worktree: tmpDir,
    });

    assert.ok(typeof hooks === "object");
  });
});
