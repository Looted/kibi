// implements REQ-cursor-kibi-plugin-v1
import { afterEach, describe, expect, spyOn, test } from "bun:test";
import * as fs from "node:fs";
import { packageJsonForResolvedFile } from "../bin/launch-kibi-mcp.mjs";

const spies: Array<{ mockRestore: () => void }> = [];

afterEach(() => {
  for (const spy of spies.splice(0)) spy.mockRestore();
  if (process.exitCode === 1) process.exitCode = 0;
});

describe("launch-kibi-mcp remaining package walk to filesystem root", () => {
  test("returns null when no kibi-mcp package.json exists above the start path", () => {
    const original = fs.existsSync.bind(fs);
    const spy = spyOn(fs, "existsSync").mockImplementation((target) => {
      if (String(target).endsWith("package.json")) return false;
      return original(target);
    });
    spies.push(spy);
    expect(packageJsonForResolvedFile("/tmp/kibi-launch-missing/server.js")).toBeNull();
  });
});
