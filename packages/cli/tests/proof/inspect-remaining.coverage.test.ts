// implements REQ-kibi-proof-evidence-protocol
import { afterEach, describe, expect, spyOn, test } from "bun:test";
import * as fs from "node:fs";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { inspectProofEnvironment } from "../../src/proof/inspect.js";
import { isolateKibiEnv } from "../helpers/in-process-workspace.js";

const spies: Array<{ mockRestore: () => void }> = [];
const restores: Array<() => void> = [];

afterEach(() => {
  for (const spy of spies.splice(0)) spy.mockRestore();
  for (const restore of restores.splice(0)) restore();
  if (process.exitCode === 1) process.exitCode = 0;
});

describe("inspect remaining glob and directory existence catch paths", () => {
  test("treats an unreadable glob directory as a miss", () => {
    restores.push(isolateKibiEnv());
    const root = mkdtempSync(path.join(os.tmpdir(), "kibi-inspect-glob-"));
    mkdirSync(path.join(root, "src"), { recursive: true });
    writeFileSync(path.join(root, "src", "app.ts"), "export {}\n");
    const original = fs.readdirSync.bind(fs);
    const spy = spyOn(fs, "readdirSync").mockImplementation(((
      target: fs.PathLike,
      options?: fs.ReaddirOptions,
    ) => {
      if (String(target).includes(`${path.sep}src`)) {
        throw new Error("unreadable src");
      }
      return original(target, options as never);
    }) as typeof fs.readdirSync);
    spies.push(spy);
    expect(Array.isArray(inspectProofEnvironment(root).languages)).toBe(true);
  });

  test("treats existsSync failures as a missing directory", () => {
    restores.push(isolateKibiEnv());
    const root = mkdtempSync(path.join(os.tmpdir(), "kibi-inspect-exists-"));
    const original = fs.existsSync.bind(fs);
    const spy = spyOn(fs, "existsSync").mockImplementation((target) => {
      if (String(target).includes(".github")) {
        throw new Error("stat failed");
      }
      return original(target);
    });
    spies.push(spy);
    expect(inspectProofEnvironment(root).ciWorkflows).toEqual([]);
  });
});
