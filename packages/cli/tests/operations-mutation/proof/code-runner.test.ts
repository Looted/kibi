import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test";
import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  TS_RESOLVE_HOOKS,
  pythonDomainInterpreters,
  runCodeEvaluator,
  spawnSyncThroughFiles,
  workspaceBin,
} from "../../../src/operations/proof/code-runner.js";
import { unsupportedLanguageReason } from "../../../src/operations/proof/code-languages.js";
import * as swipl from "../../../src/prolog/swipl-resolver.js";

const BUN = process.execPath;
const saved = {
  PATH: process.env.PATH,
  TMPDIR: process.env.TMPDIR,
  KIBI_PYTHON: process.env.KIBI_PYTHON,
  VIRTUAL_ENV: process.env.VIRTUAL_ENV,
  KIBI_RUNNER_PROBE: process.env.KIBI_RUNNER_PROBE,
};
let base = "";
const restores: Array<() => void> = [];

beforeEach(() => {
  base = realpathSync(mkdtempSync(path.join(tmpdir(), "kibi-code-runner-")));
});

afterEach(() => {
  while (restores.length > 0) restores.pop()?.();
  for (const [key, value] of Object.entries(saved)) {
    if (value === undefined) Reflect.deleteProperty(process.env, key);
    else process.env[key] = value;
  }
  rmSync(base, { recursive: true, force: true });
});

function dir(...parts: string[]): string {
  const target = path.join(base, ...parts);
  mkdirSync(target, { recursive: true });
  return target;
}

function touch(file: string, content = ""): string {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, content);
  return file;
}

/** A private temp directory, so runs can be checked for leftovers. */
function privateTmp(): string {
  const tmp = dir("tmp");
  process.env.TMPDIR = tmp;
  return tmp;
}

const ECHO = `console.log(JSON.stringify({
  runner: process.env.STAND_IN,
  argv: process.argv.slice(2),
  cwd: process.cwd(),
  probe: process.env.KIBI_RUNNER_PROBE ?? null,
  home: process.env.SWI_HOME_DIR ?? null,
}));`;
const FAIL = `process.stderr.write("\\n  first line  \\n\\n  middle\\n  last line \\n\\n");
console.log("{}");
console.log("not json");`;

/** An executable named `name` in `binDir` that runs `body` with bun. */
function standIn(binDir: string, name: string, body: string): string {
  const js = touch(path.join(binDir, `${name}.js`), body);
  const bin = touch(
    path.join(binDir, name),
    `#!/bin/sh\nSTAND_IN=${name} exec "${BUN}" "${js}" "$@"\n`,
  );
  chmodSync(bin, 0o755);
  return bin;
}

describe("TS_RESOLVE_HOOKS", () => {
  test("retries relative specifiers as TypeScript files", () => {
    expect(TS_RESOLVE_HOOKS).toContain(
      'const SUFFIXES = [".ts", ".tsx", ".mts", ".cts", ".js", ".mjs", "/index.ts", "/index.tsx", "/index.js"];',
    );
    expect(TS_RESOLVE_HOOKS).toContain(
      'if (error?.code !== "ERR_MODULE_NOT_FOUND" || !/^\\.\\.?\\//.test(specifier)) throw error;',
    );
    expect(TS_RESOLVE_HOOKS).toContain(
      'const base = specifier.replace(/\\.[cm]?js$/, "");',
    );
  });
});

describe("workspaceBin", () => {
  test("finds the nearest node_modules/.bin entry walking up", () => {
    const outer = touch(path.join(base, "node_modules", ".bin", "kibi-tool"));
    const inner = dir("pkg", "app");
    expect(workspaceBin(inner, "kibi-tool")).toBe(outer);
    const local = touch(path.join(inner, "node_modules", ".bin", "kibi-tool"));
    expect(workspaceBin(inner, "kibi-tool")).toBe(local);
  });

  test("returns null after the filesystem root", () => {
    expect(workspaceBin(dir("a"), "kibi-no-such-tool-7f3c")).toBeNull();
  });
});

describe("pythonDomainInterpreters", () => {
  test("ends with python3 and python when nothing else exists", () => {
    const root = dir("ws");
    expect(pythonDomainInterpreters(root, "src/m.py", {})).toStrictEqual([
      "python3",
      "python",
    ]);
  });

  test("puts a trimmed KIBI_PYTHON first and ignores a blank one", () => {
    const root = dir("ws");
    expect(
      pythonDomainInterpreters(root, "m.py", { KIBI_PYTHON: "  /opt/py  " }),
    ).toStrictEqual(["/opt/py", "python3", "python"]);
    expect(
      pythonDomainInterpreters(root, "m.py", { KIBI_PYTHON: "python" }),
    ).toStrictEqual(["python", "python3"]);
    expect(
      pythonDomainInterpreters(root, "m.py", { KIBI_PYTHON: "   " }),
    ).toStrictEqual(["python3", "python"]);
  });

  test("reads process.env by default", () => {
    process.env.KIBI_PYTHON = "/env/py";
    Reflect.deleteProperty(process.env, "VIRTUAL_ENV");
    expect(pythonDomainInterpreters(dir("ws"), "m.py")).toStrictEqual([
      "/env/py",
      "python3",
      "python",
    ]);
  });

  test("uses the active virtualenv's posix or windows interpreter", () => {
    const root = dir("ws");
    const posix = touch(path.join(base, "venv-a", "bin", "python"));
    const windows = touch(path.join(base, "venv-b", "Scripts", "python.exe"));
    dir("venv-c");
    expect(
      pythonDomainInterpreters(root, "m.py", {
        VIRTUAL_ENV: path.join(base, "venv-a"),
      }),
    ).toStrictEqual([posix, "python3", "python"]);
    expect(
      pythonDomainInterpreters(root, "m.py", {
        VIRTUAL_ENV: path.join(base, "venv-b"),
      }),
    ).toStrictEqual([windows, "python3", "python"]);
    expect(
      pythonDomainInterpreters(root, "m.py", {
        VIRTUAL_ENV: path.join(base, "venv-c"),
      }),
    ).toStrictEqual(["python3", "python"]);
  });

  test("walks project virtualenvs from the file up to the root, once each", () => {
    const root = dir("ws");
    // Above the root: never consulted.
    touch(path.join(base, ".venv", "bin", "python"));
    const atRoot = touch(path.join(root, "venv", "bin", "python"));
    const inPkg = touch(path.join(root, "pkg", ".venv", "bin", "python"));
    const inPkgVenv = touch(path.join(root, "pkg", "venv", "bin", "python"));
    touch(path.join(root, "pkg", "src", "m.py"));
    expect(
      pythonDomainInterpreters(root, "pkg/src/m.py", {
        VIRTUAL_ENV: path.join(root, "pkg", ".venv"),
      }),
    ).toStrictEqual([inPkg, inPkgVenv, atRoot, "python3", "python"]);
  });

  test("checks a directory outside the root alone", () => {
    const root = dir("ws");
    const outside = touch(path.join(base, "other", ".venv", "bin", "python"));
    touch(path.join(base, ".venv", "bin", "python"));
    expect(
      pythonDomainInterpreters(root, "../other/m.py", {}),
    ).toStrictEqual([outside, "python3", "python"]);
    expect(pythonDomainInterpreters(root, "/m.py", {})).toStrictEqual([
      "python3",
      "python",
    ]);
  });

  test("a file at the root checks only the root", () => {
    const root = dir("ws");
    touch(path.join(base, ".venv", "bin", "python"));
    const atRoot = touch(path.join(root, ".venv", "bin", "python"));
    expect(pythonDomainInterpreters(root, "m.py", {})).toStrictEqual([
      atRoot,
      "python3",
      "python",
    ]);
  });

  test("the root's parent is outside it", () => {
    const root = dir("ws", "inner");
    const parent = touch(path.join(base, "ws", ".venv", "bin", "python"));
    touch(path.join(base, ".venv", "bin", "python"));
    expect(pythonDomainInterpreters(root, "../m.py", {})).toStrictEqual([
      parent,
      "python3",
      "python",
    ]);
  });

  test("a sibling directory sharing the root's prefix is outside it", () => {
    const root = dir("ws");
    const sibling = touch(path.join(base, "ws-other", ".venv", "bin", "python"));
    touch(path.join(base, "venv", "bin", "python"));
    expect(
      pythonDomainInterpreters(root, "../ws-other/m.py", {}),
    ).toStrictEqual([sibling, "python3", "python"]);
  });
});

describe("spawnSyncThroughFiles", () => {
  test("feeds stdin and captures stdout and stderr through files", () => {
    const tmp = privateTmp();
    const cwd = dir("cwd");
    process.env.KIBI_RUNNER_PROBE = "inherited";
    const run = spawnSyncThroughFiles(
      BUN,
      [
        "-e",
        `const input = await Bun.stdin.text();
console.log(JSON.stringify([input, process.cwd(), process.env.KIBI_RUNNER_PROBE ?? null]));
console.error("warn");
process.exit(3);`,
      ],
      { cwd, input: "data in", timeout: 30_000 },
    );
    expect(run).toStrictEqual({
      error: undefined,
      status: 3,
      stdout: `${JSON.stringify(["data in", cwd, "inherited"])}\n`,
      stderr: "warn\n",
    });
    expect(readdirSync(tmp)).toStrictEqual([]);
  });

  test("sends empty stdin by default and replaces the environment when given", () => {
    privateTmp();
    process.env.KIBI_RUNNER_PROBE = "inherited";
    const run = spawnSyncThroughFiles(
      BUN,
      [
        "-e",
        "console.log(JSON.stringify([await Bun.stdin.text(), process.env.KIBI_RUNNER_PROBE ?? null]))",
      ],
      { timeout: 30_000, env: { KIBI_RUNNER_PROBE: "given" } },
    );
    expect(run.stdout).toBe(`${JSON.stringify(["", "given"])}\n`);
    expect(run.status).toBe(0);
  });

  test("names its temp directory and closes the stdio files", () => {
    privateTmp();
    const open = () => readdirSync("/dev/fd").length;
    const before = open();
    const runs = [1, 2, 3].map(() =>
      spawnSyncThroughFiles(
        BUN,
        ["-e", "console.log(JSON.stringify(require('node:fs').readdirSync(process.env.TMPDIR)))"],
        { timeout: 30_000 },
      ),
    );
    expect(open()).toBe(before);
    for (const run of runs) {
      const entries = JSON.parse(run.stdout) as string[];
      expect(entries).toHaveLength(1);
      expect(entries[0]).toMatch(/^kibi-spawn-[A-Za-z0-9]{6}$/);
    }
  });

  test("reports a command that cannot start or times out", () => {
    const tmp = privateTmp();
    const missing = spawnSyncThroughFiles(path.join(base, "nope"), [], {
      timeout: 30_000,
    });
    expect((missing.error as NodeJS.ErrnoException).code).toBe("ENOENT");
    expect(missing.stdout).toBe("");
    const slow = spawnSyncThroughFiles(BUN, ["-e", "await Bun.sleep(5000)"], {
      timeout: 200,
    });
    expect(slow.status).toBeNull();
    expect(readdirSync(tmp)).toStrictEqual([]);
  });
});

describe("runCodeEvaluator", () => {
  test("refuses a file in a language it has no script for", () => {
    expect(
      runCodeEvaluator(base, "src/model.rb", { js: "x", python: undefined }, []),
    ).toStrictEqual({
      ok: false,
      failure: unsupportedLanguageReason("this reader", ["js"], ["src/model.rb"]),
      language: null,
    });
  });

  test("refuses a known language whose script is missing", () => {
    expect(
      runCodeEvaluator(base, "m.py", { js: "x", prolog: "y" }, []),
    ).toStrictEqual({
      ok: false,
      failure: unsupportedLanguageReason("this reader", ["js", "prolog"], ["m.py"]),
      language: "python",
    });
  });

  test("reports the first line of a SWI-Prolog resolution error", () => {
    const resolve = spyOn(swipl, "resolveSwipl").mockImplementation(() => {
      throw new Error("no swipl here\nset KIBI_SWIPL");
    });
    restores.push(() => resolve.mockRestore());
    expect(runCodeEvaluator(base, "f.pl", { prolog: "x" }, [])).toStrictEqual({
      ok: false,
      failure: "no swipl here",
      language: "prolog",
    });
    resolve.mockImplementation(() => {
      throw "plain failure";
    });
    expect(runCodeEvaluator(base, "f.pl", { prolog: "x" }, [])).toStrictEqual({
      ok: false,
      failure: "plain failure",
      language: "prolog",
    });
  });

  test("runs the Prolog script from a temp file with the runtime's home", () => {
    const tmp = privateTmp();
    const bin = standIn(
      dir("bin"),
      "swipl",
      `const { readFileSync } = require("node:fs");
const [script, ...rest] = process.argv.slice(2);
console.log(JSON.stringify({
  script: readFileSync(script, "utf8"),
  name: require("node:path").basename(script),
  rest,
  probe: process.env.KIBI_RUNNER_PROBE ?? null,
  home: process.env.SWI_HOME_DIR ?? null,
}));`,
    );
    const resolve = spyOn(swipl, "resolveSwipl").mockImplementation(
      () => ({ bin, home: "/opt/swipl-home", version: "9" }) as never,
    );
    restores.push(() => resolve.mockRestore());
    process.env.KIBI_RUNNER_PROBE = "kept";
    const ws = dir("ws");
    expect(
      runCodeEvaluator(ws, "src/facts.pl", { prolog: "PROLOG SCRIPT" }, ["plan"]),
    ).toStrictEqual({
      ok: true,
      value: {
        script: "PROLOG SCRIPT",
        name: "evaluator.pl",
        rest: ["--", "plan"],
        probe: "kept",
        home: "/opt/swipl-home",
      },
      language: "prolog",
    });
    expect(readdirSync(tmp)).toStrictEqual([]);
  });

  test("keeps the Prolog script in a named temp directory", () => {
    privateTmp();
    const bin = standIn(
      dir("bin"),
      "swipl",
      "console.log(JSON.stringify(require('node:fs').readdirSync(process.env.TMPDIR).sort()))",
    );
    const resolve = spyOn(swipl, "resolveSwipl").mockImplementation(
      () => ({ bin, version: "9" }) as never,
    );
    restores.push(() => resolve.mockRestore());
    const run = runCodeEvaluator(dir("ws"), "f.pl", { prolog: "x" }, []) as {
      value: string[];
    };
    expect(run.value).toHaveLength(2);
    expect(run.value[0]).toMatch(/^kibi-prolog-[A-Za-z0-9]{6}$/);
    expect(run.value[1]).toMatch(/^kibi-spawn-[A-Za-z0-9]{6}$/);
  });

  test("reports the first stderr line of a failing Prolog run", () => {
    privateTmp();
    const bin = standIn(dir("bin"), "swipl", FAIL);
    const resolve = spyOn(swipl, "resolveSwipl").mockImplementation(
      () => ({ bin, version: "9" }) as never,
    );
    restores.push(() => resolve.mockRestore());
    expect(runCodeEvaluator(dir("ws"), "f.plt", { prolog: "x" }, [])).toStrictEqual({
      ok: false,
      failure: "first line",
      language: "prolog",
    });
  });

  test("tries the Python interpreters in order and reports the last traceback line", () => {
    const bin = dir("bin");
    standIn(bin, "python3", FAIL);
    standIn(bin, "python", FAIL);
    process.env.PATH = bin;
    Reflect.deleteProperty(process.env, "KIBI_PYTHON");
    Reflect.deleteProperty(process.env, "VIRTUAL_ENV");
    const ws = dir("ws");
    expect(runCodeEvaluator(ws, "m.py", { python: "PY" }, ["a"])).toStrictEqual({
      ok: false,
      failure: "last line",
      language: "python",
    });
  });

  test("accepts the first Python interpreter whose output passes", () => {
    const bin = dir("bin");
    standIn(bin, "python3", ECHO);
    standIn(bin, "python", ECHO);
    process.env.PATH = bin;
    process.env.KIBI_PYTHON = path.join(bin, "missing-python");
    Reflect.deleteProperty(process.env, "VIRTUAL_ENV");
    const ws = dir("ws");
    const run = runCodeEvaluator(
      ws,
      "m.py",
      { python: "PY" },
      ["a", "b"],
      (parsed) => (parsed as { runner: string }).runner === "python",
    );
    expect(run).toStrictEqual({
      ok: true,
      value: {
        runner: "python",
        argv: ["-c", "PY", "a", "b"],
        cwd: ws,
        probe: null,
        home: null,
      },
      language: "python",
    });
  });

  test("runs JavaScript with bun, then tsx, then node by default", () => {
    const bin = dir("bin");
    standIn(bin, "bun", FAIL);
    process.env.PATH = bin;
    const ws = dir("ws");
    standIn(path.join(ws, "node_modules", ".bin"), "tsx", FAIL);
    const run = runCodeEvaluator(
      ws,
      "src/m.ts",
      { js: "console.log(JSON.stringify(process.argv.slice(1)))" },
      ["x"],
      (parsed) => Array.isArray(parsed),
    );
    // Only bun's own runtime (process.execPath) prints an array.
    expect(run).toStrictEqual({ ok: true, value: ["x"], language: "js" });
  });

  test("passes the script and arguments to each JavaScript runner", () => {
    const bin = dir("bin");
    standIn(bin, "bun", ECHO);
    process.env.PATH = bin;
    const ws = dir("ws");
    standIn(path.join(ws, "node_modules", ".bin"), "tsx", ECHO);
    const seen: unknown[] = [];
    const run = runCodeEvaluator(
      ws,
      "m.js",
      { js: "JS" },
      ["arg"],
      (parsed) => {
        seen.push(parsed);
        return false;
      },
      { runners: ["bun", "tsx"] },
    );
    expect(seen).toStrictEqual([
      { runner: "bun", argv: ["-e", "JS", "arg"], cwd: ws, probe: null, home: null },
      {
        runner: "tsx",
        argv: ["--eval", "JS", "--", "arg"],
        cwd: ws,
        probe: null,
        home: null,
      },
    ]);
    expect(run).toStrictEqual({ ok: false, failure: "", language: "js" });
  });

  test("skips tsx when the workspace has none", () => {
    process.env.PATH = dir("empty-bin");
    const seen: unknown[] = [];
    const run = runCodeEvaluator(
      dir("ws"),
      "m.ts",
      { js: "console.log(JSON.stringify(process.argv.length))" },
      [],
      (parsed) => {
        seen.push(parsed);
        return true;
      },
      { runners: ["tsx", "node"] },
    );
    expect(run.ok).toBe(true);
    expect(seen).toHaveLength(1);
  });

  test("reports a blank failure when a runner writes nothing to stderr", () => {
    const bin = dir("bin");
    standIn(bin, "bun", 'console.log("not json")');
    process.env.PATH = bin;
    expect(
      runCodeEvaluator(dir("ws"), "m.js", { js: "JS" }, [], () => true, {
        runners: ["bun"],
      }),
    ).toStrictEqual({ ok: false, failure: "", language: "js" });
  });

  test("keeps the last failure when a later runner cannot start", () => {
    const bin = dir("bin");
    standIn(bin, "python3", FAIL);
    process.env.PATH = bin;
    Reflect.deleteProperty(process.env, "KIBI_PYTHON");
    Reflect.deleteProperty(process.env, "VIRTUAL_ENV");
    // python is not on PATH: it fails to start after python3 failed.
    expect(runCodeEvaluator(dir("ws"), "m.py", { python: "PY" }, [])).toStrictEqual({
      ok: false,
      failure: "last line",
      language: "python",
    });
  });

  test("reports no failure text when no runner starts", () => {
    process.env.PATH = dir("empty-bin");
    expect(
      runCodeEvaluator(dir("ws"), "m.mjs", { js: "JS" }, [], () => true, {
        runners: ["bun"],
      }),
    ).toStrictEqual({ ok: false, failure: "", language: "js" });
  });
});
