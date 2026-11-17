import { describe, expect, test } from "bun:test";
import {
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  type ChangedGateRun,
  changedCheckContent,
  changedCheckSummary,
  createChangedGateRunner,
  executeChangedCheck,
  runChangedGate,
} from "../../../src/public/operations/changed-check.js";

const gateJson = (structuredContent: Record<string, unknown>) =>
  `${JSON.stringify({ structuredContent })}\n`;

const REFUSED: ChangedGateRun = {
  exitCode: 1,
  stdout: `noise before the result\n${gateJson({
    violations: [{ rule: "symbol-traceability", entityId: "SYM-a" }],
    count: 1,
    diagnostics: [
      { category: "x", severity: "error" },
      { category: "y", severity: "warning" },
    ],
    qualityDiagnostics: [
      { id: "symbols_manifest_stale", severity: "error", blocking: true },
      { id: "symbol_semantic_review_needed", severity: "warning" },
    ],
    staged: { files: 1 },
    messages: ["Staged files: 1 total", 2],
    ownerFindings: [{ symbol: "a" }],
    operationalError: "boom",
  })}`,
};

describe("changedCheckContent", () => {
  test("tags every gate finding with what it stops", () => {
    expect(changedCheckContent(REFUSED)).toStrictEqual({
      changed: true,
      commitAllowed: false,
      violations: [
        { rule: "symbol-traceability", entityId: "SYM-a", blocks: "commit" },
      ],
      count: 1,
      diagnostics: [
        { category: "x", severity: "error", blocks: "commit" },
        { category: "y", severity: "warning", blocks: "none" },
      ],
      qualityDiagnostics: [
        {
          id: "symbols_manifest_stale",
          severity: "error",
          blocking: true,
          blocks: "commit",
        },
        {
          id: "symbol_semantic_review_needed",
          severity: "warning",
          blocks: "none",
        },
      ],
      messages: ["Staged files: 1 total", "2"],
      staged: { files: 1 },
      ownerFindings: [{ symbol: "a" }],
      operationalError: "boom",
    });
  });

  test("a passing gate with nothing to say allows the commit", () => {
    expect(
      changedCheckContent({ exitCode: 0, stdout: gateJson({ messages: "x" }) }),
    ).toStrictEqual({
      changed: true,
      commitAllowed: true,
      violations: [],
      count: 0,
      diagnostics: [],
      qualityDiagnostics: [],
      messages: [],
    });
    expect(
      changedCheckContent({ exitCode: 0, stdout: "{}" }).commitAllowed,
    ).toBe(true);
  });

  test("an output that is not JSON throws", () => {
    expect(() =>
      changedCheckContent({ exitCode: 1, stdout: "not json" }),
    ).toThrow();
  });
});

describe("changedCheckSummary", () => {
  test("names the verdict and how many findings block the commit", () => {
    expect(changedCheckSummary(changedCheckContent(REFUSED))).toBe(
      "✗ A commit of these changes is refused: 3 findings block the commit.\nStaged files: 1 total\n2\nboom",
    );
    const one = changedCheckContent({
      exitCode: 1,
      stdout: gateJson({ violations: [{ rule: "r" }] }),
    });
    expect(changedCheckSummary(one)).toBe(
      "✗ A commit of these changes is refused: 1 finding blocks the commit.",
    );
    expect(
      changedCheckSummary(
        changedCheckContent({
          exitCode: 0,
          stdout: gateJson({ messages: ["✓ No violations found."] }),
        }),
      ),
    ).toBe(
      "✓ A commit of these changes passes the commit gate.\n✓ No violations found.",
    );
  });
});

describe("executeChangedCheck", () => {
  test("hands the root and files to the runner and returns its tagged verdict", async () => {
    const calls: unknown[] = [];
    const result = await executeChangedCheck(
      "/repo",
      ["a.ts"],
      async (...a) => {
        calls.push(a);
        return REFUSED;
      },
    );
    expect(calls).toStrictEqual([["/repo", ["a.ts"]]]);
    expect(result.structuredContent).toStrictEqual(
      changedCheckContent(REFUSED),
    );
    expect(result.content).toStrictEqual([
      {
        type: "text",
        text: changedCheckSummary(changedCheckContent(REFUSED)),
      },
    ]);
  });
});

describe("runChangedGate", () => {
  test("rejects with the CLI's error when it prints no result", async () => {
    const root = mkdtempSync(path.join(tmpdir(), "kibi-changed-gate-"));
    try {
      // Not a git repository, so there is no index to build on.
      writeFileSync(path.join(root, "a.ts"), "export const a = 1;\n");
      await expect(runChangedGate(root, ["a.ts"])).rejects.toThrow(
        /^kibi check --changed printed no result \(exit 1\): .*git rev-parse --git-path index/,
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }, 120_000);
});

describe("createChangedGateRunner", () => {
  // A stand-in CLI: waits for stdin to end (so a child given a stdin pipe
  // never finishes), then does what its first argument says.
  const FAKE = `
const [mode, ...args] = process.argv.slice(2);
process.stdin.on("data", () => {});
process.stdin.on("end", () => {
  process.stderr.write(mode === "long" ? "x".repeat(3000) : "  boom  ");
  if (mode === "silent" || mode === "long") process.exit(3);
  if (mode === "blank") { process.stdout.write("  \\n"); process.exit(0); }
  process.stdout.write("noise\\n" + JSON.stringify({ args, cwd: process.cwd() }) + "\\n");
  if (mode === "killed") process.kill(process.pid, "SIGKILL");
  process.exit(1);
});
process.stdin.resume();
`;
  let dir: string;
  const runner = (mode: string) =>
    createChangedGateRunner(process.execPath, [
      path.join(dir, "fake.mjs"),
      mode,
    ]);

  test("passes the check arguments and the workspace root, and reads its output", async () => {
    dir = mkdtempSync(path.join(tmpdir(), "kibi-changed-runner-"));
    try {
      writeFileSync(path.join(dir, "fake.mjs"), FAKE);
      const named = await runner("print")(dir, ["a.ts", "b.ts"]);
      expect(named.exitCode).toBe(1);
      const [noise, json] = named.stdout.trim().split("\n");
      expect(noise).toBe("noise");
      expect(JSON.parse(json as string)).toStrictEqual({
        args: ["check", "--changed", "a.ts", "b.ts", "--format", "json"],
        cwd: realpathSync(dir),
      });
      const all = await runner("print")(dir, undefined);
      expect(
        JSON.parse(all.stdout.trim().split("\n")[1] as string).args,
      ).toStrictEqual(["check", "--changed", "--format", "json"]);
      expect((await runner("killed")(dir, undefined)).exitCode).toBe(1);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }, 60_000);

  test("rejects with the exit code and trimmed stderr when nothing is printed", async () => {
    dir = mkdtempSync(path.join(tmpdir(), "kibi-changed-runner-"));
    try {
      writeFileSync(path.join(dir, "fake.mjs"), FAKE);
      await expect(runner("silent")(dir, undefined)).rejects.toThrow(
        /^kibi check --changed printed no result \(exit 3\): boom$/,
      );
      await expect(runner("blank")(dir, undefined)).rejects.toThrow(
        /^kibi check --changed printed no result \(exit 0\): boom$/,
      );
      const long = await runner("long")(dir, undefined).catch(
        (error: Error) => error.message,
      );
      expect(long).toBe(
        `kibi check --changed printed no result (exit 3): ${"x".repeat(2000)}`,
      );
      await expect(
        createChangedGateRunner(path.join(dir, "missing-binary"), [])(
          dir,
          undefined,
        ),
      ).rejects.toThrow(/ENOENT/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }, 60_000);
});

describe("runChangedGate finds the kibi CLI", () => {
  // A stand-in kibi: prints which file ran and the arguments it was given.
  const STAND_IN = `process.stdout.write(JSON.stringify({ bin: process.argv[1], args: process.argv.slice(2) }) + "\\n");\n`;
  let dir: string;
  const setup = () => {
    dir = realpathSync(mkdtempSync(path.join(tmpdir(), "kibi-changed-cli-")));
    for (const bin of [
      "sibling/bin/kibi",
      "installed/bin/kibi",
      "ws/node_modules/kibi-cli/bin/kibi",
    ]) {
      mkdirSync(path.dirname(path.join(dir, bin)), { recursive: true });
      writeFileSync(path.join(dir, bin), STAND_IN);
    }
    mkdirSync(path.join(dir, "ws"), { recursive: true });
  };
  const probe = (
    existing: readonly string[],
    resolve: (specifier: string) => string = () => {
      throw new Error("not installed");
    },
  ) => ({
    // ../../../bin/kibi from here is <dir>/sibling/bin/kibi.
    moduleUrl: pathToFileURL(path.join(dir, "sibling/a/b/c/changed-check.js"))
      .href,
    exists: (file: string) =>
      existing.some((name) => path.join(dir, name) === file),
    resolve,
    nodePath: process.execPath,
  });
  const ran = async (
    existing: readonly string[],
    resolve?: (specifier: string) => string,
  ) => {
    const run = await runChangedGate(
      path.join(dir, "ws"),
      ["a.ts"],
      probe(existing, resolve),
    );
    return JSON.parse(run.stdout) as { bin: string; args: string[] };
  };
  const all = [
    "sibling/bin/kibi",
    "installed/bin/kibi",
    "ws/node_modules/kibi-cli/bin/kibi",
  ];

  test("starts the CLI beside this module first, through node", async () => {
    setup();
    try {
      expect(
        await ran(all, () => path.join(dir, "installed/bin/kibi")),
      ).toStrictEqual({
        bin: path.join(dir, "sibling/bin/kibi"),
        args: ["check", "--changed", "a.ts", "--format", "json"],
      });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }, 60_000);

  test("bundled elsewhere, starts the installed kibi-cli bin it resolves", async () => {
    setup();
    try {
      const asked: string[] = [];
      const run = await ran(all.slice(1), (specifier) => {
        asked.push(specifier);
        return path.join(dir, "installed/bin/kibi");
      });
      expect(run.bin).toBe(path.join(dir, "installed/bin/kibi"));
      expect(asked).toStrictEqual(["kibi-cli/bin/kibi"]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }, 60_000);

  test("a resolved bin missing on disk, or no kibi-cli package, falls to the workspace's", async () => {
    setup();
    try {
      const local = path.join(dir, "ws/node_modules/kibi-cli/bin/kibi");
      expect(
        (await ran(all.slice(2), () => path.join(dir, "installed/bin/kibi")))
          .bin,
      ).toBe(local);
      expect((await ran(all.slice(2))).bin).toBe(local);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }, 60_000);

  test("with none of them, starts kibi from PATH", async () => {
    setup();
    const previous = process.env.PATH;
    try {
      const onPath = path.join(dir, "path");
      mkdirSync(onPath);
      writeFileSync(
        path.join(onPath, "kibi"),
        `#!/bin/sh\necho "{\\"bin\\":\\"path\\",\\"args\\":[\\"$*\\"]}"\n`,
        { mode: 0o755 },
      );
      process.env.PATH = onPath;
      expect(await ran([])).toStrictEqual({
        bin: "path",
        args: ["check --changed a.ts --format json"],
      });
    } finally {
      process.env.PATH = previous;
      rmSync(dir, { recursive: true, force: true });
    }
  }, 60_000);

  test("by default, resolves the installed kibi-cli bin from this module", async () => {
    setup();
    try {
      // No CLI beside the module: the default resolve finds kibi-cli's own
      // bin, which refuses a workspace that is not a git repository.
      await expect(
        runChangedGate(path.join(dir, "ws"), ["a.ts"], {
          moduleUrl: pathToFileURL(path.join(dir, "none/a/b/c/x.js")).href,
        }),
      ).rejects.toThrow(
        /^kibi check --changed printed no result \(exit 1\): .*git rev-parse --git-path index/,
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }, 120_000);
});
