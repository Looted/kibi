#!/usr/bin/env node
// common.test.mjs — unit tests for the hooks' shared plumbing
// (bin/hooks/kibi-common.mjs): path anchoring, stdin/stdout framing and the
// kibi CLI runner.
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Readable } from "node:stream";
import test from "node:test";

import {
  clip,
  emitAdditionalContext,
  parseKibiData,
  readStdinJson,
  resolveHookWorkspace,
  runKibi,
  toRepoRelative,
} from "../bin/hooks/kibi-common.mjs";

function makeTmp() {
  return mkdtempSync(join(tmpdir(), "kibi-vibe-common-"));
}

test("toRepoRelative makes absolute paths inside the workspace relative", () => {
  assert.equal(toRepoRelative("/w/repo/src/a.ts", "/w/repo"), "src/a.ts");
  assert.equal(toRepoRelative("/w/repo/src/a.ts", "/w/repo/"), "src/a.ts");
  assert.equal(toRepoRelative("/w/other/a.ts", "/w/repo"), null);
  assert.equal(toRepoRelative("/w/repo", "/w/repo"), null);
  assert.equal(toRepoRelative("/w/repo-two/a.ts", "/w/repo"), null);
  assert.equal(toRepoRelative("", "/w/repo"), null);
  assert.equal(toRepoRelative(undefined, "/w/repo"), null);
});

test("toRepoRelative resolves a relative path against the payload cwd, not this process's cwd", () => {
  // The hook process runs in the plugin directory; the tool ran in the
  // session folder, which is where a relative path points.
  assert.equal(toRepoRelative("a.ts", "/w/repo", "/w/repo/src"), "src/a.ts");
  assert.equal(
    toRepoRelative("./b/../a.ts", "/w/repo", "/w/repo/src/"),
    "src/a.ts",
  );
  assert.equal(toRepoRelative("src/a.ts", "/w/repo", "/w/repo"), "src/a.ts");
  // Without a base the workspace root is the base.
  assert.equal(toRepoRelative("src/a.ts", "/w/repo"), "src/a.ts");
  assert.equal(toRepoRelative("src/a.ts", "/w/repo", ""), "src/a.ts");
  // A relative path can leave the workspace.
  assert.equal(toRepoRelative("../x.ts", "/w/repo", "/w/repo/src"), "x.ts");
  assert.equal(toRepoRelative("../../x.ts", "/w/repo", "/w/repo/src"), null);
  assert.equal(toRepoRelative("a.ts", "/w/repo", "/w/elsewhere"), null);
});

test("toRepoRelative handles Windows drive paths case-insensitively with either slash", () => {
  assert.equal(
    toRepoRelative("C:\\Work\\Repo\\src\\a.ts", "c:\\work\\repo"),
    "src/a.ts",
  );
  assert.equal(toRepoRelative("D:\\x\\a.ts", "C:\\work\\repo"), null);
  assert.equal(
    toRepoRelative("src\\a.ts", "C:\\work\\repo", "C:\\work\\repo\\lib"),
    "lib/src/a.ts",
  );
  assert.equal(toRepoRelative("//server/share/a.ts", "C:\\work"), null);
  assert.equal(
    toRepoRelative("..\\a.ts", "C:\\work\\repo", "C:\\work\\repo\\src"),
    "a.ts",
  );
});

test("resolveHookWorkspace anchors a subdirectory payload cwd at the repo root", () => {
  const tmp = makeTmp();
  try {
    const repo = join(tmp, "repo");
    mkdirSync(join(repo, ".git"), { recursive: true });
    mkdirSync(join(repo, ".kb"), { recursive: true });
    writeFileSync(join(repo, ".kb", "manifest.json"), "{}");
    mkdirSync(join(repo, "src", "deep"), { recursive: true });
    const prev = process.env.KIBI_WORKSPACE;
    Reflect.deleteProperty(process.env, "KIBI_WORKSPACE");
    try {
      assert.equal(
        resolveHookWorkspace({ cwd: join(repo, "src", "deep") }),
        repo,
      );
    } finally {
      if (prev !== undefined) process.env.KIBI_WORKSPACE = prev;
    }
    assert.equal(typeof resolveHookWorkspace(null), "string");
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

/** Run `fn` with process.stdin replaced by `stream`. */
async function withStdin(stream, fn) {
  const original = /** @type {PropertyDescriptor} */ (
    Object.getOwnPropertyDescriptor(process, "stdin")
  );
  Object.defineProperty(process, "stdin", {
    value: stream,
    configurable: true,
  });
  try {
    return await fn();
  } finally {
    Object.defineProperty(process, "stdin", original);
  }
}

test("readStdinJson parses the payload and reads bad input as null", async () => {
  assert.deepEqual(
    await withStdin(Readable.from(['{"a":', "1}"]), readStdinJson),
    { a: 1 },
  );
  assert.equal(
    await withStdin(Readable.from(["not json"]), readStdinJson),
    null,
  );
  assert.equal(await withStdin(Readable.from([]), readStdinJson), null);
  const failing = new Readable({ read() {} });
  const pending = withStdin(failing, readStdinJson);
  failing.destroy(new Error("stdin broke"));
  assert.equal(await pending, null);
});

test("emitAdditionalContext prints one Vibe structured response and skips empty text", () => {
  const original = process.stdout.write;
  const written = [];
  process.stdout.write = /** @type {any} */ (
    (chunk) => {
      written.push(String(chunk));
      return true;
    }
  );
  try {
    emitAdditionalContext("");
    emitAdditionalContext(undefined);
    emitAdditionalContext("note");
  } finally {
    process.stdout.write = original;
  }
  assert.deepEqual(written, [
    `${JSON.stringify({ hook_specific_output: { additional_context: "note" } })}\n`,
  ]);
});

test("parseKibiData unwraps an envelope and passes raw JSON through", () => {
  assert.deepEqual(parseKibiData('{"data":{"x":1}}'), { x: 1 });
  assert.deepEqual(parseKibiData('{"x":1}'), { x: 1 });
  assert.equal(parseKibiData("null"), null);
  assert.throws(() => parseKibiData("nope"));
});

test("clip collapses whitespace and shortens with an ellipsis", () => {
  assert.equal(clip("  a \n b  ", 10), "a b");
  assert.equal(clip("abcdefghij", 5), "abcd…");
  assert.equal(clip(undefined, 5), "");
});

/** A workspace whose project-local kibi CLI is a stub echoing its stdin. */
function stubWorkspace(script) {
  const root = makeTmp();
  mkdirSync(join(root, ".kb"), { recursive: true });
  writeFileSync(join(root, ".kb", "manifest.json"), "{}");
  const cli = join(root, "node_modules", "kibi-cli");
  mkdirSync(join(cli, "bin"), { recursive: true });
  writeFileSync(
    join(cli, "package.json"),
    JSON.stringify({ name: "kibi-cli", bin: { kibi: "bin/kibi.mjs" } }),
  );
  writeFileSync(join(cli, "bin", "kibi.mjs"), script);
  return root;
}

test("runKibi passes the JSON payload to a route reading stdin and returns its stdout", async () => {
  const root = stubWorkspace(
    'import { readFileSync } from "node:fs";\nprocess.stdout.write(JSON.stringify({ route: process.argv[2], got: JSON.parse(readFileSync(0, "utf8") || "null") }));',
  );
  try {
    const res = await runKibi(root, ["query", "--input", "-"], { a: 1 });
    assert.equal(res.code, 0);
    assert.deepEqual(JSON.parse(res.stdout), { route: "query", got: { a: 1 } });
    // A route without `--input -` gets closed stdin and no payload.
    const plain = await runKibi(root, ["status", "--format", "json"]);
    assert.deepEqual(JSON.parse(plain.stdout), { route: "status", got: null });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("runKibi reports a failing route and a workspace without a KB as non-zero codes", async () => {
  const failing = stubWorkspace("process.exit(7);");
  const bare = makeTmp();
  try {
    assert.equal((await runKibi(failing, ["status"])).code, 7);
    // kibi.mjs exits 3 before spawning anything outside a Kibi workspace.
    assert.equal((await runKibi(bare, ["status"])).code, 3);
    // A route the OS refuses to spawn is a plain failure, never a throw.
    assert.deepEqual(await runKibi(bare, ["status\0"]), {
      code: 1,
      stdout: "",
    });
  } finally {
    rmSync(failing, { recursive: true, force: true });
    rmSync(bare, { recursive: true, force: true });
  }
});

test("runKibi survives a child that exits before reading its stdin", async () => {
  const bare = makeTmp();
  try {
    // kibi.mjs exits 3 without reading stdin; a payload larger than the pipe
    // buffer cannot be fully written, so the write fails with EPIPE.
    const res = await runKibi(bare, ["query", "--input", "-"], {
      blob: "x".repeat(8 * 1024 * 1024),
    });
    assert.equal(res.code, 3);
  } finally {
    rmSync(bare, { recursive: true, force: true });
  }
});

test("runKibi reports a runtime that cannot start as a failure", async () => {
  const bare = makeTmp();
  const execPath = process.execPath;
  try {
    Object.defineProperty(process, "execPath", {
      value: join(bare, "no-such-node"),
      configurable: true,
    });
    assert.deepEqual(await runKibi(bare, ["status"]), { code: 1, stdout: "" });
  } finally {
    Object.defineProperty(process, "execPath", {
      value: execPath,
      configurable: true,
    });
    rmSync(bare, { recursive: true, force: true });
  }
});
