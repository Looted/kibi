// implements REQ-cli-subdirectory-workspace
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { resolveWorkspaceCwd } from "../src/workspace-cwd.js";

let root = "";
let sub = "";

beforeEach(() => {
  root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "kibi-cwd-")));
  fs.mkdirSync(path.join(root, ".kb"));
  fs.writeFileSync(path.join(root, ".kb", "manifest.json"), "{}");
  sub = path.join(root, "apps", "server");
  fs.mkdirSync(sub, { recursive: true });
});

afterEach(() => {
  fs.rmSync(root, { recursive: true, force: true });
});

const argv = (...args: string[]) => ["node", "kibi", ...args];

describe("resolveWorkspaceCwd", () => {
  test("a subdirectory runs against the enclosing KB root", () => {
    const result = resolveWorkspaceCwd(argv("query", "--input", "-"), sub, {});
    expect(result.cwd).toBe(root);
    expect(result.argv).toEqual(argv("query", "--input", "-"));
  });

  test("relative path options keep pointing where the user meant", () => {
    const result = resolveWorkspaceCwd(
      argv(
        "check",
        "--write-certificates",
        "../out.json",
        "--input=req.json",
        "--rules",
        "kb-consistency",
      ),
      sub,
      {},
    );
    expect(result.argv).toEqual(
      argv(
        "check",
        "--write-certificates",
        path.join(root, "apps", "out.json"),
        `--input=${path.join(sub, "req.json")}`,
        "--rules",
        "kb-consistency",
      ),
    );
  });

  test("the root itself, kibi init and an explicit workspace stay put", () => {
    expect(resolveWorkspaceCwd(argv("status"), root, {}).cwd).toBe(root);
    expect(resolveWorkspaceCwd(argv("init"), sub, {}).cwd).toBe(sub);
    expect(
      resolveWorkspaceCwd(argv("status"), sub, { KIBI_WORKSPACE: sub }).cwd,
    ).toBe(sub);
  });

  test("outside any KB nothing changes", () => {
    const outside = fs.realpathSync(
      fs.mkdtempSync(path.join(os.tmpdir(), "kibi-cwd-none-")),
    );
    try {
      expect(resolveWorkspaceCwd(argv("status"), outside, {}).cwd).toBe(
        outside,
      );
    } finally {
      fs.rmSync(outside, { recursive: true, force: true });
    }
  });
});
