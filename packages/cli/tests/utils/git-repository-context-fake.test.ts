import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  test,
} from "bun:test";
import {
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { resolveGitRepository } from "../../src/utils/git-repository-context.js";

/**
 * A scripted `git` on PATH: each case answers one argument list, optionally
 * only in one working directory, so every resolver branch is reachable
 * without a real repository.
 */
type Answer = { out?: string; err?: string; code?: number };
type Case = Answer & { args: string; cwd?: string };

const base = realpathSync(
  mkdtempSync(path.join(os.tmpdir(), "kibi-fake-git-")),
);
afterAll(() => rmSync(base, { recursive: true, force: true }));
let counter = 0;
const dir = (name = "d") => {
  const created = path.join(base, `${name}${counter++}`);
  mkdirSync(created, { recursive: true });
  return created;
};

let savedPath: string | undefined;
let savedLocale: [string | undefined, string | undefined];
beforeEach(() => {
  savedPath = process.env.PATH;
  savedLocale = [process.env.LC_ALL, process.env.LANG];
});
afterEach(() => {
  process.env.PATH = savedPath;
  for (const [key, value] of [
    ["LC_ALL", savedLocale[0]],
    ["LANG", savedLocale[1]],
  ] as const) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

const quote = (text: string) => `'${text}'`;
function fakeGit(cases: Case[]): void {
  const bin = dir("bin");
  const branch = ({ out, err, code }: Answer) =>
    [
      out === undefined ? "" : `printf '%s\\n' ${quote(out)};`,
      err === undefined ? "" : `printf '%s\\n' ${quote(err)} >&2;`,
      `exit ${code ?? 0};;`,
    ].join(" ");
  const script = [
    "#!/bin/sh",
    'key="$(pwd)|$*"',
    'case "$key" in',
    ...cases.map(
      (c) =>
        `  ${quote(`${c.cwd ?? ""}`)}${c.cwd ? "" : "*"}${quote(`|${c.args}`)}) ${branch(c)}`,
    ),
    "esac",
    'echo "unexpected: $key" >&2',
    "exit 99",
    "",
  ].join("\n");
  writeFileSync(path.join(bin, "git"), script, { mode: 0o755 });
  process.env.PATH = bin;
}

const VERSION = (v = "2.45.1") => ({
  args: "--version",
  out: `git version ${v}`,
});
const ABS = "--path-format=absolute";

/** A full answer set for a normal checkout at `top`. */
function checkout(top: string, extra: Case[] = [], version = "2.45.1"): Case[] {
  return [
    ...extra,
    VERSION(version),
    { args: "rev-parse --show-toplevel", cwd: top, out: top },
    { args: "rev-parse --show-toplevel", out: "/elsewhere" },
    { args: `rev-parse ${ABS} --git-dir`, out: `${top}/.git` },
    { args: `rev-parse ${ABS} --git-common-dir`, out: `${top}/.git` },
    { args: `rev-parse ${ABS} --git-path hooks`, out: `${top}/.git/hooks` },
    { args: "rev-parse --git-dir", out: ".git" },
    { args: "rev-parse --git-common-dir", out: ".git" },
    { args: "rev-parse --git-path hooks", out: ".git/hooks" },
    { args: "config --show-origin --get core.hooksPath", code: 1 },
  ];
}

describe("resolveGitRepository with a scripted git", () => {
  test("a normal checkout resolves every directory and its primary root", () => {
    const top = dir();
    fakeGit(checkout(top));
    expect(resolveGitRepository(top)).toStrictEqual({
      status: "ok",
      context: {
        worktreeRoot: top,
        gitDir: `${top}/.git`,
        commonGitDir: `${top}/.git`,
        effectiveHooksDir: `${top}/.git/hooks`,
        isLinkedWorktree: false,
        primaryWorktreeRoot: top,
        hooksPathConfig: null,
        hooksPathOrigin: null,
      },
    });
  });

  test("absolute path format is requested from git 2.31 on", () => {
    for (const [version, absolute] of [
      ["2.31.0", true],
      ["2.31", true],
      ["3.0.0", true],
      ["12.0", true],
      ["2.30.9", false],
      ["1.40.0", false],
      ["2.3", false],
      ["x.y", false],
    ] as const) {
      const top = dir();
      const relative = path.join(top, "rel");
      mkdirSync(relative);
      fakeGit(checkout(relative, [], version));
      const context = resolveGitRepository(relative);
      expect(context.status === "ok" && context.context.gitDir).toBe(
        `${relative}/.git`,
      );
      // Relative answers resolve against cwd, so both forms agree; the
      // hooks answer differs to tell them apart.
      fakeGit(
        checkout(
          relative,
          [
            {
              args: "rev-parse --git-path hooks",
              out: "relative-hooks",
            },
          ],
          version,
        ),
      );
      const result = resolveGitRepository(relative);
      expect(result.status === "ok" && result.context.effectiveHooksDir).toBe(
        absolute ? `${relative}/.git/hooks` : `${relative}/relative-hooks`,
      );
    }
    const top = dir();
    fakeGit([
      { args: "--version", out: "xgit version 2.45.0" },
      { args: "rev-parse --git-path hooks", out: "rel-hooks" },
      ...checkout(top).slice(1),
    ]);
    const result = resolveGitRepository(top);
    expect(result.status === "ok" && result.context.effectiveHooksDir).toBe(
      `${top}/rel-hooks`,
    );
  });

  test("a linked worktree points at the primary checkout's common directory", () => {
    const primary = dir();
    const linked = dir();
    fakeGit([
      VERSION(),
      { args: "rev-parse --show-toplevel", cwd: linked, out: linked },
      { args: "rev-parse --show-toplevel", cwd: primary, out: primary },
      {
        args: `rev-parse ${ABS} --git-dir`,
        out: `${primary}/.git/worktrees/l`,
      },
      { args: `rev-parse ${ABS} --git-common-dir`, out: `${primary}/.git` },
      {
        args: `rev-parse ${ABS} --git-path hooks`,
        out: `${primary}/.git/hooks`,
      },
      {
        args: "config --show-origin --get core.hooksPath",
        out: "file:/etc/gitconfig \t .githooks ",
      },
    ]);
    expect(resolveGitRepository(linked)).toStrictEqual({
      status: "ok",
      context: {
        worktreeRoot: linked,
        gitDir: `${primary}/.git/worktrees/l`,
        commonGitDir: `${primary}/.git`,
        effectiveHooksDir: `${primary}/.git/hooks`,
        isLinkedWorktree: true,
        primaryWorktreeRoot: primary,
        hooksPathConfig: ".githooks",
        hooksPathOrigin: "file:/etc/gitconfig",
      },
    });
  });

  test("the primary root needs a .git common dir whose parent is its own checkout", () => {
    const holder = dir();
    const linked = dir();
    const answers = (common: string, holderTop: string): Case[] => [
      VERSION(),
      { args: "rev-parse --show-toplevel", cwd: linked, out: linked },
      { args: "rev-parse --show-toplevel", cwd: holder, out: holderTop },
      { args: `rev-parse ${ABS} --git-dir`, out: `${linked}/.git` },
      { args: `rev-parse ${ABS} --git-common-dir`, out: common },
      { args: `rev-parse ${ABS} --git-path hooks`, out: `${common}/hooks` },
      { args: "config --show-origin --get core.hooksPath", out: "hooks-only" },
    ];
    fakeGit(answers(`${holder}/.git`, "/not-the-holder"));
    let result = resolveGitRepository(linked);
    expect(
      result.status === "ok" && result.context.primaryWorktreeRoot,
    ).toBeNull();
    fakeGit([
      ...answers(`${holder}/.git`, holder).filter(
        (c) => !c.args.startsWith("config"),
      ),
      {
        args: "config --show-origin --get core.hooksPath",
        out: "file:a\tb\t.githooks",
      },
    ]);
    result = resolveGitRepository(linked);
    expect(result.status === "ok" && result.context.hooksPathOrigin).toBe(
      "file:a\tb",
    );
    expect(result.status === "ok" && result.context.primaryWorktreeRoot).toBe(
      holder,
    );
    fakeGit(answers(`${holder}/repo.git`, holder));
    result = resolveGitRepository(linked);
    expect(
      result.status === "ok" && result.context.primaryWorktreeRoot,
    ).toBeNull();
    expect(result.status === "ok" && result.context.hooksPathConfig).toBe(
      "hooks-only",
    );
    expect(result.status === "ok" && result.context.hooksPathOrigin).toBeNull();
  });

  test("a bare repository is unsupported", () => {
    const bare = dir();
    fakeGit([
      VERSION(),
      {
        args: "rev-parse --show-toplevel",
        err: "fatal: this operation must be run in a work tree",
        code: 128,
      },
      { args: "rev-parse --git-dir", out: "." },
    ]);
    expect(resolveGitRepository(bare)).toStrictEqual({
      status: "unsupported",
      reason: "Bare repository: no working tree to attach Kibi to.",
    });
  });

  test("Git's absence answer, in either wording, means no repository", () => {
    for (const err of [
      "fatal: not a git repository (or any of the parent directories): .git",
      "  fatal: Not A Repository",
    ]) {
      const standalone = dir();
      fakeGit([
        VERSION(),
        { args: "rev-parse --show-toplevel", err: `\n${err}`, code: 128 },
        { args: "rev-parse --git-dir", code: 128 },
      ]);
      expect(resolveGitRepository(standalone)).toStrictEqual({
        status: "not-a-repository",
      });
    }
  });

  test("the child locale is pinned to C for both LC_ALL and LANG", () => {
    process.env.LC_ALL = "pl_PL.UTF-8";
    process.env.LANG = "pl_PL.UTF-8";
    const top = dir();
    fakeGit(checkout(top));
    const bin = process.env.PATH as string;
    writeFileSync(
      path.join(bin, "git"),
      `#!/bin/sh\nif [ "$1" = "--version" ]; then echo "git version 2.45.0"; exit 0; fi\nif [ "$LC_ALL" = C ] && [ "$LANG" = C ]; then echo "fatal: not a git repository" >&2; else echo "fatal: brak" >&2; fi\nexit 128\n`,
      { mode: 0o755 },
    );
    expect(resolveGitRepository(top)).toStrictEqual({
      status: "not-a-repository",
    });
  });

  test("an absence answer next to a .git entry is refused", () => {
    const repo = dir();
    const sub = path.join(repo, "sub");
    mkdirSync(path.join(repo, ".git"), { recursive: true });
    mkdirSync(sub);
    fakeGit([
      VERSION(),
      {
        args: "rev-parse --show-toplevel",
        err: "fatal: not a git repository",
        code: 128,
      },
      { args: "rev-parse --git-dir", code: 128 },
    ]);
    expect(resolveGitRepository(sub)).toStrictEqual({
      status: "git-refused",
      reason: `Git reported no repository, but a .git entry exists at ${repo}/.git (fatal: not a git repository); refusing to guess.`,
    });
  });

  test("any other failure is refused with the first diagnostic", () => {
    const top = dir();
    const cases: Array<[Case[], string]> = [
      [
        [
          {
            args: "rev-parse --show-toplevel",
            err: "  fatal: detected dubious ownership  ",
            code: 128,
          },
          { args: "rev-parse --git-dir", err: "second", code: 128 },
        ],
        "fatal: detected dubious ownership",
      ],
      [
        [
          { args: "rev-parse --show-toplevel", code: 128 },
          { args: "rev-parse --git-dir", err: "from git-dir", code: 128 },
        ],
        "from git-dir",
      ],
      [
        [
          { args: "rev-parse --show-toplevel", code: 128 },
          { args: "rev-parse --git-dir", code: 128 },
        ],
        "git produced no diagnostic output",
      ],
    ];
    for (const [answers, reason] of cases) {
      fakeGit([VERSION(), ...answers]);
      expect(resolveGitRepository(top)).toStrictEqual({
        status: "git-refused",
        reason: `Git refused to inspect this directory: ${reason}`,
      });
    }
  });

  test("a layout probe that fails is refused with the first diagnostic", () => {
    const top = dir();
    const layout = (failing: Record<string, string | undefined>) =>
      checkout(
        top,
        Object.entries(failing).map(([flag, err]) => ({
          args: `rev-parse ${ABS} ${flag}`,
          code: 1,
          ...(err === undefined ? {} : { err }),
        })),
      );
    for (const [failing, detail] of [
      [{ "--git-dir": "a" }, "a"],
      [{ "--git-dir": undefined, "--git-common-dir": "b" }, "b"],
      [{ "--git-common-dir": undefined, "--git-path hooks": "c" }, "c"],
      [{ "--git-path hooks": "c" }, "c"],
      [{ "--git-common-dir": "b" }, "b"],
      [
        {
          "--git-dir": undefined,
          "--git-common-dir": undefined,
          "--git-path hooks": undefined,
        },
        "git produced no diagnostic output",
      ],
    ] as const) {
      fakeGit(layout(failing));
      expect(resolveGitRepository(top)).toStrictEqual({
        status: "git-refused",
        reason: `Git refused to report its directory layout for this repository: ${detail}`,
      });
    }
  });
});

describe("resolveGitRepository without git", () => {
  test("no git and no .git entry means git is unavailable", () => {
    process.env.PATH = dir("empty");
    expect(resolveGitRepository(dir())).toStrictEqual({
      status: "git-unavailable",
    });
  });

  test("no git next to a .git entry, or an uninspectable one, is refused", () => {
    process.env.PATH = dir("empty");
    const repo = dir();
    mkdirSync(path.join(repo, ".git"));
    expect(resolveGitRepository(repo)).toStrictEqual({
      status: "git-refused",
      reason: `Git is unavailable, but a .git entry exists at ${repo}/.git; refusing to guess.`,
    });
    const looped = dir();
    symlinkSync(path.join(looped, "b"), path.join(looped, "a"));
    symlinkSync(path.join(looped, "a"), path.join(looped, "b"));
    const start = path.join(looped, "a", "x");
    expect(resolveGitRepository(start)).toStrictEqual({
      status: "git-refused",
      reason: `Git is unavailable, but a .git entry exists at ${start}/.git; refusing to guess.`,
    });
    const file = path.join(dir(), "file.txt");
    writeFileSync(file, "");
    expect(resolveGitRepository(path.join(file, "sub"))).toStrictEqual({
      status: "git-unavailable",
    });
  });
});
