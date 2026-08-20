import { afterEach, beforeEach, describe, test } from "bun:test";
import { strict as assert } from "node:assert";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { detectPosture } from "../src/repo-posture";

describe("repo-posture coverage", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-repo-posture-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test("detects vendored installs in node_modules", () => {
    fs.mkdirSync(path.join(tmpDir, "node_modules", "kibi-cli"), {
      recursive: true,
    });

    const posture = detectPosture(tmpDir);

    assert.equal(posture.state, "vendored_only");
    assert.equal(posture.needsBootstrap, false);
    assert.match(posture.reason, /node_modules\/kibi-cli/);
  });

  test("treats unreadable root config JSON as partial root posture", () => {
    fs.mkdirSync(path.join(tmpDir, ".kb"), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, ".kb", "manifest.json"), "{not-json");

    const posture = detectPosture(tmpDir);

    assert.equal(posture.state, "root_partial");
    assert.equal(posture.needsBootstrap, true);
    assert.match(posture.reason, /targets are missing/);
  });

  test("detects root intent from opencode plugin declarations", () => {
    fs.writeFileSync(
      path.join(tmpDir, "opencode.json"),
      JSON.stringify({ plugin: ["kibi-opencode"] }, null, 2),
    );

    const posture = detectPosture(tmpDir);

    assert.equal(posture.state, "root_uninitialized");
    assert.equal(posture.needsBootstrap, true);
    assert.match(posture.reason, /plugin intent detected at root/);
  });

  // implements REQ-opencode-smart-enforcement-v1
  test("detects root intent from AGENTS guidance mentioning kb_search", () => {
    fs.writeFileSync(
      path.join(tmpDir, "AGENTS.md"),
      "Agents should discover first with kb_search before exact kb_query follow-up.\n",
    );

    const posture = detectPosture(tmpDir);

    assert.equal(posture.state, "root_uninitialized");
    assert.equal(posture.needsBootstrap, true);
    assert.match(posture.reason, /Kibi plugin intent detected at root/);
  });
});
