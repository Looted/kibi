// implements REQ-opencode-file-context-guidance-v1
import { afterEach, describe, expect, spyOn, test } from "bun:test";
import * as fs from "node:fs";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { getE2eCoverageSignal } from "../src/e2e-coverage-signals.js";
import * as links from "../src/file-entity-links.js";

const spies: Array<{ mockRestore: () => void }> = [];
const dirs: string[] = [];

afterEach(() => {
  for (const spy of spies.splice(0)) spy.mockRestore();
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
  if (process.exitCode === 1) process.exitCode = 0;
});

describe("e2e-coverage-signals remaining test-doc read failures", () => {
  test("swallows Error reads and rethrows non-Error failures", () => {
    const root = mkdtempSync(path.join(os.tmpdir(), "kibi-e2e-signal-"));
    dirs.push(root);
    mkdirSync(path.join(root, ".kb", "tests"), { recursive: true });
    writeFileSync(path.join(root, ".kb", "tests", "TEST-1.md"), "---\ntitle: One\n---\n");
    const linkSpy = spyOn(links, "getFileLinkedTargetsByType").mockReturnValue([
      "TEST-1",
    ]);
    spies.push(linkSpy);
    const original = fs.readFileSync.bind(fs);
    let calls = 0;
    const readSpy = spyOn(fs, "readFileSync").mockImplementation(((
      target: fs.PathOrFileDescriptor,
      encoding?: BufferEncoding,
    ) => {
      if (String(target).includes("TEST-1.md")) {
        calls += 1;
        if (calls === 1) throw new Error("unreadable test doc");
        throw "not-an-error";
      }
      return original(target, encoding as never);
    }) as typeof fs.readFileSync);
    spies.push(readSpy);
    expect(
      getE2eCoverageSignal(root, path.join(root, "src/feature.ts")),
    ).toMatchObject({ level: "none" });
    expect(() =>
      getE2eCoverageSignal(root, path.join(root, "src/feature.ts")),
    ).toThrow("not-an-error");
  });
});
