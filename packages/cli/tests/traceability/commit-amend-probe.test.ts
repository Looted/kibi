import { afterEach, describe, expect, test } from "bun:test";
import { type ChildProcess, execFileSync, spawn } from "node:child_process";
import { mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  type AmendProbe,
  SYSTEM_AMEND_PROBE,
  amendsRootCommit,
} from "../../src/traceability/commit-amend.js";

const roots: string[] = [];
const children: ChildProcess[] = [];
afterEach(() => {
  for (const child of children.splice(0)) child.kill("SIGKILL");
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

type Proc = { parent: number; argv: string[] };

/** A fake process table read through /proc (linux) or ps (elsewhere). */
function probe(
  table: Record<number, Proc>,
  options: {
    platform?: NodeJS.Platform;
    parentPid?: number;
    parents?: string;
    failRevList?: boolean;
  } = {},
) {
  const calls: unknown[] = [];
  const value: AmendProbe = {
    platform: options.platform ?? "linux",
    parentPid: options.parentPid ?? 100,
    readFile(filePath) {
      calls.push(["read", filePath]);
      const match = /^\/proc\/(\d+)\/(stat|cmdline)$/.exec(filePath);
      const proc = match ? table[Number(match[1])] : undefined;
      if (!match || !proc) throw new Error("ENOENT");
      return match[2] === "stat"
        ? `${match[1]} (we ird) name) S ${proc.parent} 1 1`
        : `${proc.argv.join("\0")}\0`;
    },
    run(command, args, runOptions) {
      calls.push(["run", command, args, runOptions]);
      if (command === "git") {
        if (options.failRevList) throw new Error("bad revision");
        return options.parents ?? "abc\n";
      }
      const proc = table[Number(args[3])];
      if (!proc) throw new Error("no such process");
      return `  ${proc.parent}  ${proc.argv.join("  ")}\n`;
    },
  };
  return { value, calls };
}

const amendTable: Record<number, Proc> = {
  100: { parent: 90, argv: ["/bin/sh", ".git/hooks/pre-commit"] },
  90: { parent: 80, argv: ["/usr/bin/git", "commit", "--amend", "-m", "x"] },
};

describe("amendsRootCommit", () => {
  test("is false without a HEAD commit and never looks", () => {
    const p = probe(amendTable);
    expect(amendsRootCommit("/ws", null, p.value)).toBe(false);
    expect(p.calls).toStrictEqual([]);
  });

  test("is true when a root commit is amended, reading /proc", () => {
    const p = probe(amendTable);
    expect(amendsRootCommit("/ws", "abc", p.value)).toBe(true);
    expect(p.calls).toStrictEqual([
      [
        "run",
        "git",
        ["rev-list", "--parents", "-n", "1", "abc"],
        { cwd: "/ws" },
      ],
      ["read", "/proc/100/stat"],
      ["read", "/proc/100/cmdline"],
      ["read", "/proc/90/stat"],
      ["read", "/proc/90/cmdline"],
    ]);
  });

  test("is false when HEAD has a parent or cannot be read", () => {
    expect(
      amendsRootCommit(
        "/ws",
        "abc",
        probe(amendTable, { parents: "abc def\n" }).value,
      ),
    ).toBe(false);
    expect(
      amendsRootCommit(
        "/ws",
        "abc",
        probe(amendTable, { parents: "abc\tdef" }).value,
      ),
    ).toBe(false);
    expect(
      amendsRootCommit(
        "/ws",
        "abc",
        probe(amendTable, { failRevList: true }).value,
      ),
    ).toBe(false);
    expect(
      amendsRootCommit(
        "/ws",
        "abc",
        probe(amendTable, { parents: "  abc  \n" }).value,
      ),
    ).toBe(true);
  });

  test("needs both commit and --amend on the git process", () => {
    const table = (argv: string[]) => ({
      100: { parent: 90, argv },
    });
    for (const [argv, expected] of [
      [["git", "commit", "--amend"], true],
      [["C:/Git/git.exe", "commit", "--amend"], true],
      [["git", "commit"], false],
      [["git", "--amend"], false],
      [["git", "rebase", "--amend"], false],
      [["mygit", "commit", "--amend"], false],
      [["git.exe2", "commit", "--amend"], false],
    ] as const) {
      expect(
        amendsRootCommit("/ws", "abc", probe(table([...argv])).value),
      ).toBe(expected);
    }
  });

  test("stops at the first git ancestor", () => {
    const table = {
      100: { parent: 90, argv: ["git", "commit"] },
      90: { parent: 80, argv: ["git", "commit", "--amend"] },
    };
    expect(amendsRootCommit("/ws", "abc", probe(table).value)).toBe(false);
  });

  test("walks at most eight ancestors and stops at init", () => {
    const chain = (length: number) => {
      const table: Record<number, Proc> = {};
      for (let i = 0; i < length; i += 1)
        table[100 + i] = { parent: 101 + i, argv: ["sh"] };
      table[100 + length] = { parent: 1, argv: ["git", "commit", "--amend"] };
      return table;
    };
    expect(amendsRootCommit("/ws", "abc", probe(chain(7)).value)).toBe(true);
    expect(amendsRootCommit("/ws", "abc", probe(chain(8)).value)).toBe(false);
    const viaInit = {
      100: { parent: 1, argv: ["sh"] },
      1: { parent: 0, argv: ["git", "commit", "--amend"] },
    };
    expect(amendsRootCommit("/ws", "abc", probe(viaInit).value)).toBe(false);
    expect(
      amendsRootCommit("/ws", "abc", probe(amendTable, { parentPid: 1 }).value),
    ).toBe(false);
  });

  test("an unreadable process or an empty command line is not an amend", () => {
    expect(amendsRootCommit("/ws", "abc", probe({}).value)).toBe(false);
    const table = {
      100: { parent: 90, argv: [] },
      90: { parent: 80, argv: ["git", "commit", "--amend"] },
    };
    expect(amendsRootCommit("/ws", "abc", probe(table).value)).toBe(true);
    expect(
      amendsRootCommit(
        "/ws",
        "abc",
        probe(table, { platform: "darwin" }).value,
      ),
    ).toBe(true);
  });

  test("reads ps where there is no /proc, and nothing on Windows", () => {
    const p = probe(amendTable, { platform: "darwin" });
    expect(amendsRootCommit("/ws", "abc", p.value)).toBe(true);
    expect(p.calls.slice(1)).toStrictEqual([
      ["run", "ps", ["-o", "ppid=,args=", "-p", "100"], { timeout: 2000 }],
      ["run", "ps", ["-o", "ppid=,args=", "-p", "90"], { timeout: 2000 }],
    ]);
    const windows = probe(amendTable, { platform: "win32" });
    expect(amendsRootCommit("/ws", "abc", windows.value)).toBe(false);
    expect(windows.calls.length).toBe(1);
  });
});

describe("SYSTEM_AMEND_PROBE", () => {
  /** A live process whose program is named git and whose argv names an amend. */
  function fakeGitAmend(): number {
    const dir = mkdtempSync(path.join(tmpdir(), "kibi-amend-probe-"));
    roots.push(dir);
    const git = path.join(dir, "git");
    symlinkSync(process.execPath, git);
    const child = spawn(
      git,
      ["-e", "setTimeout(() => {}, 30000)", "commit", "--amend"],
      { stdio: "ignore" },
    );
    children.push(child);
    return child.pid as number;
  }

  function rootRepository(): string {
    const root = mkdtempSync(path.join(tmpdir(), "kibi-amend-repo-"));
    roots.push(root);
    const run = (...args: string[]) =>
      execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
    run("init", "-q");
    writeFileSync(path.join(root, "a.txt"), "a\n");
    run("add", "a.txt");
    run(
      "-c",
      "user.name=T",
      "-c",
      "user.email=t@example.invalid",
      "commit",
      "-q",
      "--no-verify",
      "-m",
      "root",
    );
    return run("rev-parse", "HEAD") === "" ? "" : root;
  }

  async function settled(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  test("describes this process", () => {
    expect(SYSTEM_AMEND_PROBE.platform).toBe(process.platform);
    expect(SYSTEM_AMEND_PROBE.parentPid).toBe(process.ppid);
  });

  test("reads the real process table and git", async () => {
    const root = rootRepository();
    const head = execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: root,
      encoding: "utf8",
    }).trim();
    const pid = fakeGitAmend();
    await settled();
    expect(
      amendsRootCommit(root, head, { ...SYSTEM_AMEND_PROBE, parentPid: pid }),
    ).toBe(true);
    expect(
      amendsRootCommit(root, head, {
        ...SYSTEM_AMEND_PROBE,
        platform: "darwin",
        parentPid: pid,
      }),
    ).toBe(true);
    expect(amendsRootCommit(root, head)).toBe(false);
    expect(
      amendsRootCommit(root, "0".repeat(40), {
        ...SYSTEM_AMEND_PROBE,
        parentPid: pid,
      }),
    ).toBe(false);
  });
});
