// implements REQ-002
import { afterEach, describe, expect, spyOn, test } from "bun:test";
import * as fs from "node:fs";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  nextAncestorDirectory,
  readRunningPackageInfo,
  resolveProjectLocalMcp,
} from "../../src/startup-resolution.js";

const spies: Array<{ mockRestore: () => void }> = [];
const dirs: string[] = [];

afterEach(() => {
  for (const spy of spies.splice(0)) spy.mockRestore();
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
  if (process.exitCode === 1) process.exitCode = 0;
});

describe("startup-resolution remaining package walk and catch-all", () => {
  test("throws when an entrypoint has no package.json ancestors", () => {
    const original = fs.existsSync.bind(fs);
    const spy = spyOn(fs, "existsSync").mockImplementation((target) => {
      if (String(target).endsWith(`${path.sep}package.json`)) return false;
      return original(target);
    });
    spies.push(spy);
    expect(() =>
      readRunningPackageInfo("/tmp/kibi-mcp-missing-pkg/server.js"),
    ).toThrow(/Unable to find package.json/);
  });

  test("returns null when a directory walk hits the filesystem root", () => {
    const original = fs.existsSync.bind(fs);
    const spy = spyOn(fs, "existsSync").mockImplementation((target) => {
      if (String(target).endsWith(`${path.sep}package.json`)) return false;
      return original(target);
    });
    spies.push(spy);
    expect(resolveProjectLocalMcp("/")).toBeNull();
  });

  test("returns null for unexpected resolution errors", () => {
    const spy = spyOn(fs, "existsSync").mockImplementation(() => {
      throw Object.assign(new Error("eacces"), { code: "EACCES" });
    });
    spies.push(spy);
    expect(resolveProjectLocalMcp("/tmp")).toBeNull();
  });

  test("walks nested directories before throwing or returning null", () => {
    const original = fs.existsSync.bind(fs);
    const spy = spyOn(fs, "existsSync").mockImplementation((target) => {
      if (String(target).endsWith(`${path.sep}package.json`)) return false;
      return original(target);
    });
    spies.push(spy);
    const nested = path.join(os.tmpdir(), "kibi-mcp-walk", "nested", "server.js");
    expect(() => readRunningPackageInfo(nested)).toThrow(
      /Unable to find package.json/,
    );
    expect(resolveProjectLocalMcp(path.join(os.tmpdir(), "kibi-mcp-walk"))).toBeNull();
    expect(nextAncestorDirectory("/")).toBeUndefined();
    expect(nextAncestorDirectory("/tmp/nested")).toBe("/tmp");
  });
});
