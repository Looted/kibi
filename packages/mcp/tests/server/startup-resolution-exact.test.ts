import { afterEach, describe, expect, test } from "bun:test";
import {
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  readRunningPackageInfo,
  resolveProjectLocalMcp,
} from "../../src/startup-resolution.js";

const dirs: string[] = [];
afterEach(() => {
  for (const dir of dirs.splice(0))
    rmSync(dir, { recursive: true, force: true });
});

function temp(): string {
  const dir = realpathSync(mkdtempSync(path.join(os.tmpdir(), "kibi-sr-")));
  dirs.push(dir);
  return dir;
}

function installMcp(nodeModules: string, version: string): string {
  const pkg = path.join(nodeModules, "kibi-mcp");
  mkdirSync(pkg, { recursive: true });
  writeFileSync(
    path.join(pkg, "package.json"),
    JSON.stringify({ name: "kibi-mcp", version, main: "index.js" }),
  );
  writeFileSync(path.join(pkg, "index.js"), "");
  return pkg;
}

describe("startup resolution edges", () => {
  test("a package without a version reads as unknown", () => {
    const root = temp();
    writeFileSync(
      path.join(root, "package.json"),
      JSON.stringify({ name: "kibi-mcp" }),
    );
    writeFileSync(path.join(root, "entry.js"), "");
    expect(readRunningPackageInfo(path.join(root, "entry.js"))).toStrictEqual({
      packageRoot: root,
      version: "unknown",
      entrypoint: path.join(root, "entry.js"),
    });
  });

  test("the project copy resolves from the nearest package.json", () => {
    const root = temp();
    writeFileSync(path.join(root, "package.json"), "{}");
    const sub = path.join(root, "sub");
    mkdirSync(sub);
    installMcp(path.join(sub, "node_modules"), "9.9.9");
    expect(resolveProjectLocalMcp(sub)).toBeNull();
    const pkg = installMcp(path.join(root, "node_modules"), "1.2.3");
    expect(resolveProjectLocalMcp(sub)).toStrictEqual({
      packageRoot: pkg,
      version: "1.2.3",
      entrypoint: path.join(pkg, "index.js"),
    });
  });

  test("an installed package of another name is not the project copy", () => {
    const root = temp();
    writeFileSync(path.join(root, "package.json"), "{}");
    const pkg = installMcp(path.join(root, "node_modules"), "1.0.0");
    writeFileSync(
      path.join(pkg, "package.json"),
      JSON.stringify({ name: "other", version: "1.0.0", main: "index.js" }),
    );
    expect(resolveProjectLocalMcp(root)).toBeNull();
  });
});
