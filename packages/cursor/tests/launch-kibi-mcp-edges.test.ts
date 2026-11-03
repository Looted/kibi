// implements REQ-cursor-kibi-plugin-v1
import { afterEach, describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  hasConsumerNodeModulesLink,
  resolveWorkspaceRoot,
} from "../bin/launch-kibi-mcp.mjs";

const tempRoots: string[] = [];

function tempRoot(prefix: string): string {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), prefix)));
  tempRoots.push(root);
  return root;
}

afterEach(() => {
  for (const root of tempRoots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

describe("launch-kibi-mcp edges", () => {
  test("an explicit relative workspace resolves against the cwd", () => {
    const cwd = tempRoot("kibi-launch-edges-");
    fs.mkdirSync(path.join(cwd, "project"));
    expect(resolveWorkspaceRoot("project", { cwd, env: {} })).toBe(
      path.join(cwd, "project"),
    );
    expect(resolveWorkspaceRoot(" ./project/ ", { cwd, env: {} })).toBe(
      path.join(cwd, "project"),
    );
  });

  test("a node_modules link into the package counts as the consumer's install", () => {
    const workspace = tempRoot("kibi-launch-edges-ws-");
    const packageRoot = tempRoot("kibi-launch-edges-pkg-");
    const nested = path.join(packageRoot, "dist");
    fs.mkdirSync(nested);
    fs.mkdirSync(path.join(workspace, "node_modules"));
    // The link names a directory inside the package, not the package root.
    fs.symlinkSync(nested, path.join(workspace, "node_modules", "kibi-mcp"));
    expect(hasConsumerNodeModulesLink(workspace, packageRoot)).toBe(true);
    expect(
      hasConsumerNodeModulesLink(workspace, tempRoot("kibi-launch-edges-x-")),
    ).toBe(false);
  });
});
