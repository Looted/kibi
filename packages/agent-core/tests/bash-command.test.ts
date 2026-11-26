import { afterEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  commandEditPaths,
  commandFilePaths,
  commandReadViews,
  filesChangedSince,
  isSearchCommand,
  readText,
  shellToolCommand,
  shellToolEditPaths,
  shellToolReadViews,
} from "../src/bash-command";

const temporaryRoots: string[] = [];

function tempDir(prefix: string): string {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  temporaryRoots.push(directory);
  return directory;
}

function write(root: string, relativePath: string, content: string): void {
  const target = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
}

afterEach(() => {
  for (const directory of temporaryRoots.splice(0)) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

function workspace(files: readonly string[]): string {
  const root = tempDir("kibi-claude-bash-");
  for (const file of files) write(root, file, "x\n");
  return root;
}

describe("files a command names", () => {
  test("relative, absolute and cd-relative names of existing files", () => {
    const root = workspace(["a.ts", "sub/b.ts", "sub/deep/c.ts"]);
    const at = (relative: string) => path.join(root, relative);
    expect(commandFilePaths("cat a.ts missing.ts", root)).toStrictEqual([
      at("a.ts"),
    ]);
    expect(commandFilePaths(`cat ${at("sub/b.ts")}`, "/")).toStrictEqual([
      at("sub/b.ts"),
    ]);
    expect(
      commandFilePaths("cd sub && cat b.ts && cd deep; cat c.ts", root),
    ).toStrictEqual([at("sub/b.ts"), at("sub/deep/c.ts")]);
    expect(
      commandFilePaths(`cd "sub" && cat b.ts; cd 'deep' && cat c.ts`, root),
    ).toStrictEqual([at("sub/b.ts"), at("sub/deep/c.ts")]);
    // `cd -` and an empty quoted target keep the base.
    expect(commandFilePaths("cd - && cat a.ts", root)).toStrictEqual([
      at("a.ts"),
    ]);
    expect(commandFilePaths("(cd sub)&&cat b.ts", root)).toStrictEqual([
      at("sub/b.ts"),
    ]);
    // A name is reported once, from the first base that has it.
    expect(commandFilePaths("cat a.ts a.ts ./a.ts", root)).toStrictEqual([
      at("a.ts"),
    ]);
    // Directories and flags are not files.
    expect(commandFilePaths("ls sub/deep -a.ts", root)).toStrictEqual([]);
  });

  test("cd targets may be quoted with spaces, follow several spaces, or be `-`", () => {
    const root = workspace(["my dir/b.ts", "sub/c.ts", "-/a.ts", "a'b/f.ts"]);
    expect(commandFilePaths('cd "my dir" && cat b.ts', root)).toStrictEqual([
      path.join(root, "my dir/b.ts"),
    ]);
    expect(commandFilePaths("cd 'my dir' && cat b.ts", root)).toStrictEqual([
      path.join(root, "my dir/b.ts"),
    ]);
    expect(commandFilePaths("cd   sub && cat c.ts", root)).toStrictEqual([
      path.join(root, "sub/c.ts"),
    ]);
    // `cd -` goes back, so it never names a directory called `-`.
    expect(commandFilePaths("cd - && cat a.ts", root)).toStrictEqual([]);
    // Only a leading or trailing quote is dropped from a target.
    expect(commandFilePaths("cd a'b && cat f.ts", root)).toStrictEqual([
      path.join(root, "a'b/f.ts"),
    ]);
  });

  test("a word only counts as cd at a command boundary", () => {
    const root = workspace(["sub/b.ts"]);
    expect(commandFilePaths("abcd sub; cat b.ts", root)).toStrictEqual([]);
    expect(commandFilePaths("x|cd sub; cat b.ts", root)).toStrictEqual([
      path.join(root, "sub/b.ts"),
    ]);
  });

  test("every separator splits names", () => {
    const root = workspace(["a.ts"]);
    for (const separator of [
      " ",
      "\t",
      "\n",
      ";",
      "|",
      "&",
      "<",
      ">",
      "(",
      ")",
      "'",
      '"',
      "`",
      ",",
      "=",
      "[",
      "]",
      "{",
      "}",
    ]) {
      expect(
        commandFilePaths(`x${separator}a.ts${separator}y`, root),
      ).toStrictEqual([path.join(root, "a.ts")]);
    }
  });

  test("names look like files with an extension or like paths", () => {
    const names = [
      "a.c",
      "a.abcdefgh",
      "a.Z",
      "a.z",
      "a.9",
      "@a.ts",
      ".a.ts",
      "a.b.ts",
      "~a.ts",
      "a+b.ts",
      "a-b.ts",
      "a-.ts",
      "_.ts",
      "d/f",
      "@d/f",
      ".d/g",
      "~d/f",
      "+d/f",
      "a-d/f",
      "d/@f",
      "d/.f",
      "d/~f",
      "d/x/f",
      "d/+f",
      "d/-f",
      "/abs",
    ];
    const root = workspace(names.filter((name) => name !== "/abs"));
    for (const name of names.slice(0, -1)) {
      expect(commandFilePaths(`cat ${name}`, root)).toStrictEqual([
        path.join(root, name),
      ]);
    }
  });

  test("names that do not look like files are not checked", () => {
    const names = [
      "a.abcdefghi",
      "abc",
      "a.",
      "a.t-s",
      "!x.ts",
      "x.ts!",
      "x!y/z",
      "a/b!c",
      "-x.ts",
      "a.ts.",
    ];
    const root = workspace(names.filter((name) => name !== "-x.ts"));
    write(root, "-x.ts", "x\n");
    for (const name of names) {
      expect(commandFilePaths(`cat ${name}`, root)).toStrictEqual([]);
    }
  });

  test("only the first 20000 characters are scanned", () => {
    const root = workspace(["a.ts"]);
    const tail = " a.ts";
    const fits = `${"x".repeat(20_000 - tail.length)}${tail}`;
    expect(commandFilePaths(fits, root)).toStrictEqual([
      path.join(root, "a.ts"),
    ]);
    expect(commandFilePaths(`x${fits}`, root)).toStrictEqual([]);
  });

  test("at most 200 candidate names are taken", () => {
    const root = workspace(["a.ts"]);
    const fillers = (count: number) =>
      Array.from({ length: count }, (_, i) => `m${i}.ts`).join(" ");
    expect(commandFilePaths(`${fillers(199)} a.ts`, root)).toStrictEqual([
      path.join(root, "a.ts"),
    ]);
    expect(commandFilePaths(`${fillers(200)} a.ts`, root)).toStrictEqual([]);
    // Flags and words that are not names do not count.
    expect(
      commandFilePaths(`${"-f.ts word ".repeat(300)} a.ts`, root),
    ).toStrictEqual([path.join(root, "a.ts")]);
  });
});

describe("search commands", () => {
  test("each search tool at a command boundary", () => {
    for (const command of [
      "grep x",
      "egrep x",
      "rg x",
      "ag x",
      "ack x",
      "find .",
      "fd x",
      "git grep x",
      "git  ls-files",
      "rg",
      "a;rg x",
      "a|rg x",
      "a&rg x",
      "(rg x)",
      "a\trg x",
    ]) {
      expect(isSearchCommand(command)).toBe(true);
    }
  });

  test("other commands and words that only contain a tool name", () => {
    for (const command of [
      "",
      "cat a",
      "xgrep x",
      "grepx",
      "git log",
      "git ls-tree",
      "gitgrep x",
      "rg;",
    ]) {
      expect(isSearchCommand(command)).toBe(false);
    }
  });

  test("only the first 20000 characters are scanned", () => {
    expect(isSearchCommand(`${"x".repeat(19_997)} rg`)).toBe(true);
    expect(isSearchCommand(`${"x".repeat(19_998)} rg`)).toBe(false);
  });
});

function git(root: string, ...args: string[]): void {
  const result = spawnSync("git", args, { cwd: root, encoding: "utf8" });
  if (result.status !== 0) throw new Error(result.stderr);
}

describe("files a command changed", () => {
  test("modified and new files not older than the start, less a second", () => {
    const root = tempDir("kibi-claude-changed-");
    git(root, "init", "-q");
    write(root, ".gitignore", "ignored.ts\n");
    write(root, "tracked.ts", "a\n");
    write(root, "deleted.ts", "a\n");
    git(root, "add", ".");
    git(
      root,
      "-c",
      "user.email=t@example.com",
      "-c",
      "user.name=t",
      "commit",
      "-qm",
      "init",
    );
    const start = 1_700_000_000_000;
    const at = (relative: string, ms: number) => {
      const file = path.join(root, relative);
      fs.utimesSync(file, ms / 1000, ms / 1000);
    };
    write(root, "tracked.ts", "b\n");
    write(root, "new.ts", "n\n");
    write(root, "old.ts", "o\n");
    write(root, "ignored.ts", "i\n");
    write(root, "sub/edge.ts", "e\n");
    fs.rmSync(path.join(root, "deleted.ts"));
    at("tracked.ts", start);
    at("new.ts", start + 5_000);
    at("old.ts", start - 1_001);
    at("ignored.ts", start + 5_000);
    at("sub/edge.ts", start - 1_000);
    expect(filesChangedSince(root, start).sort()).toStrictEqual([
      "new.ts",
      "sub/edge.ts",
      "tracked.ts",
    ]);
    // Paths are relative to a workspace below the repository root.
    expect(filesChangedSince(path.join(root, "sub"), start)).toStrictEqual([
      "edge.ts",
    ]);
  });

  test("a failed git listing reports nothing, even with output", () => {
    const root = workspace(["a.ts"]);
    const bin = tempDir("kibi-claude-fakegit-");
    write(bin, "git", "#!/bin/sh\nprintf 'a.ts\\0'\nexit 1\n");
    fs.chmodSync(path.join(bin, "git"), 0o755);
    const original = process.env.PATH;
    process.env.PATH = `${bin}${path.delimiter}${original}`;
    try {
      expect(filesChangedSince(root, 0)).toStrictEqual([]);
      write(bin, "git", "#!/bin/sh\nprintf 'a.ts\\0'\nexit 0\n");
      expect(filesChangedSince(root, 0)).toStrictEqual(["a.ts"]);
    } finally {
      process.env.PATH = original;
    }
  });

  test("nothing outside a git work tree", () => {
    const root = workspace(["a.ts"]);
    expect(filesChangedSince(root, 0)).toStrictEqual([]);
  });
});

describe("files a command writes in place", () => {
  test("redirection targets", () => {
    const root = workspace(["a.ts", "b.ts", "c.ts", "d.ts", "e.ts"]);
    const at = (name: string) => path.join(root, name);
    expect(commandEditPaths("echo x > a.ts", root)).toStrictEqual([at("a.ts")]);
    expect(commandEditPaths("echo x >>b.ts", root)).toStrictEqual([at("b.ts")]);
    expect(commandEditPaths('echo x > "c.ts"', root)).toStrictEqual([
      at("c.ts"),
    ]);
    expect(commandEditPaths("echo x>'d.ts'", root)).toStrictEqual([at("d.ts")]);
    expect(commandEditPaths(">e.ts", root)).toStrictEqual([at("e.ts")]);
    // `&>` writes stdout too, and `>|` clobbers.
    expect(commandEditPaths("cat a.ts &>b.ts", root)).toStrictEqual([
      at("b.ts"),
    ]);
    expect(commandEditPaths("echo x &>> c.ts", root)).toStrictEqual([
      at("c.ts"),
    ]);
    expect(commandEditPaths("echo x >| d.ts", root)).toStrictEqual([
      at("d.ts"),
    ]);
    // Numbered fd redirections to files (`2>b.ts`) are writes too.
    expect(commandEditPaths("cat a.ts 2>b.ts", root)).toStrictEqual([
      at("b.ts"),
    ]);
    expect(commandEditPaths("echo x 2>>c.ts", root)).toStrictEqual([
      at("c.ts"),
    ]);
    // Descriptor duplications, here-strings and quoted `>` are not writes.
    for (const command of [
      "cat a.ts 2>&1",
      "cat a.ts >&2 b.ts",
      "cat <<b.ts",
      "echo '> a.ts'",
      'echo "x > a.ts"',
      "echo \\> a.ts",
      "cat a.ts <>b.ts",
    ]) {
      expect(commandEditPaths(command, root)).toStrictEqual([]);
    }
  });

  test("destructive and file-mutating commands are treated as edits", () => {
    const root = workspace(["a.ts", "b.ts", "c.ts"]);
    const at = (name: string) => path.join(root, name);
    expect(commandEditPaths("rm -f a.ts", root)).toStrictEqual([at("a.ts")]);
    expect(commandEditPaths("rm -- a.ts", root)).toStrictEqual([at("a.ts")]);
    expect(commandEditPaths("truncate -s 0 a.ts", root)).toStrictEqual([
      at("a.ts"),
    ]);
    expect(commandEditPaths("mv a.ts b.ts", root)).toStrictEqual([
      at("a.ts"),
      at("b.ts"),
    ]);
    expect(commandEditPaths("cp a.ts b.ts", root)).toStrictEqual([at("b.ts")]);
    expect(commandEditPaths("dd if=a.ts of=b.ts", root)).toStrictEqual([
      at("b.ts"),
    ]);
    expect(commandEditPaths("git checkout -- a.ts", root)).toStrictEqual([
      at("a.ts"),
    ]);
    expect(commandEditPaths("git restore -s HEAD a.ts", root)).toStrictEqual([
      at("a.ts"),
    ]);
    expect(commandEditPaths("git status a.ts", root)).toStrictEqual([]);
  });

  test("sed and perl in-place edits, behind prefixes and assignments", () => {
    const root = workspace(["a.ts", "b.ts", "sub/c.ts"]);
    const at = (name: string) => path.join(root, name);
    for (const command of [
      "sed -i 's/a/b/' a.ts",
      "gsed -i.bak 's/a/b/' a.ts",
      "perl -pi -e 's/a/b/' a.ts",
      "sed -ni p a.ts",
      "sed --in-place 's/a/b/' a.ts",
      "sed --in-place=.bak 's/a/b/' a.ts",
      "/usr/bin/sed -i 's/a/b/' a.ts",
      "sudo sed -i 's/a/b/' a.ts",
      "env LC_ALL=C sed -i 's/a/b/' a.ts",
      "X=1 Y=2 sed -i 's/a/b/' a.ts",
      "command exec nice sed -i 's/a/b/' a.ts",
      "sed -i 's|a|b|;s|c|d|' a.ts",
      'sed -i "s/a/\\"b/" a.ts',
    ]) {
      expect(commandEditPaths(command, root)).toStrictEqual([at("a.ts")]);
    }
    expect(
      commandEditPaths("cat b.ts | sed -i 's/a/b/' a.ts", root),
    ).toStrictEqual([at("a.ts")]);
    expect(
      commandEditPaths("cd sub && sed -i 's/a/b/' c.ts", root),
    ).toStrictEqual([at("sub/c.ts")]);
    expect(
      commandEditPaths(`sed -i 's/a/b/' ${at("b.ts")}`, "/"),
    ).toStrictEqual([at("b.ts")]);
    for (const command of [
      "sed 's/a/b/' a.ts",
      "sed -e 's/a/b/' a.ts",
      "awk -i inplace 1 a.ts",
      "sed -i",
      "sudo",
      "X=1",
      "sed --in-placex a.ts",
      "sed x-i a.ts",
      "cat a.ts && sed -n p b.ts",
    ]) {
      expect(commandEditPaths(command, root)).toStrictEqual([]);
    }
  });

  test("wrapped, grouped and prefixed edits are found", () => {
    const root = workspace(["src/calc.ts"]);
    const calc = [path.join(root, "src/calc.ts")];
    for (const command of [
      "bash -lc 'cd src && sed -i s/3/999/ calc.ts'",
      'bash -lc "cd src; sed -i s/3/999/ calc.ts"',
      "(sed -i s/3/999/ src/calc.ts)",
      "{ sed -i s/3/999/ src/calc.ts; }",
      "if true; then sed -i s/3/999/ src/calc.ts; fi",
      "time sed -i s/3/999/ src/calc.ts",
      "timeout 5 sed -i s/3/999/ src/calc.ts",
      "echo src/calc.ts | xargs -0 sed -i s/3/999/ src/calc.ts",
      "! sed -i s/3/999/ src/calc.ts",
    ]) {
      expect(commandEditPaths(command, root), command).toStrictEqual(calc);
    }
  });

  test("a word with an assignment after its start is the command", () => {
    const root = workspace(["a.ts"]);
    expect(commandEditPaths("-x=1 sed -i x a.ts", root)).toStrictEqual([]);
    expect(commandEditPaths("sed -i x a.ts;;", root)).toStrictEqual([
      path.join(root, "a.ts"),
    ]);
  });

  test("a cd past the scanned length does not add a base", () => {
    const root = workspace(["x/a.ts"]);
    const head = "cat x/a.ts; ";
    const command = `${head}${"y".repeat(20_000 - head.length)}; cd x; sed -i s a.ts`;
    expect(commandEditPaths(command, root)).toStrictEqual([]);
    expect(
      commandEditPaths("cat x/a.ts; cd x; sed -i s a.ts", root),
    ).toStrictEqual([path.join(root, "x/a.ts")]);
  });

  test("tee targets", () => {
    const root = workspace(["a.ts", "b.ts"]);
    expect(commandEditPaths("echo x | tee -a a.ts b.ts", root)).toStrictEqual([
      path.join(root, "a.ts"),
      path.join(root, "b.ts"),
    ]);
    expect(commandEditPaths("echo x|tee a.ts", root)).toStrictEqual([
      path.join(root, "a.ts"),
    ]);
    expect(commandEditPaths("echo tee a.ts", root)).toStrictEqual([]);
  });

  test("separators end a simple command", () => {
    const root = workspace(["a.ts", "b.ts"]);
    for (const separator of ["&&", "||", ";", "|", "\n"]) {
      expect(
        commandEditPaths(`sed -i x a.ts${separator}cat b.ts`, root),
      ).toStrictEqual([path.join(root, "a.ts")]);
      expect(
        commandEditPaths(`cat b.ts${separator}sed -i x a.ts`, root),
      ).toStrictEqual([path.join(root, "a.ts")]);
    }
  });

  test("escapes outside single quotes are masked, inside they are literal", () => {
    const root = workspace(["a.ts"]);
    const at = path.join(root, "a.ts");
    expect(commandEditPaths("echo \\; sed -i x a.ts", root)).toStrictEqual([]);
    expect(commandEditPaths("echo \\x; sed -i x a.ts", root)).toStrictEqual([
      at,
    ]);
    expect(commandEditPaths("echo \\\\; sed -i x a.ts", root)).toStrictEqual([
      at,
    ]);
    expect(commandEditPaths("echo '\\' ; sed -i x a.ts", root)).toStrictEqual([
      at,
    ]);
    expect(commandEditPaths('echo "\\"" ; sed -i x a.ts', root)).toStrictEqual([
      at,
    ]);
    expect(commandEditPaths("sed -i x a.ts \\", root)).toStrictEqual([at]);
  });

  test("named files that do not exist are not reported", () => {
    const root = workspace([]);
    expect(commandEditPaths("echo x > a.ts", root)).toStrictEqual([]);
    expect(commandEditPaths("sed -i x '' a.ts", root)).toStrictEqual([]);
  });

  test("only the first 20000 characters are scanned", () => {
    const root = workspace(["a.ts"]);
    const tail = " > a.ts";
    const fits = `${"x".repeat(20_000 - tail.length)}${tail}`;
    expect(commandEditPaths(fits, root)).toStrictEqual([
      path.join(root, "a.ts"),
    ]);
    expect(commandEditPaths(`x${fits}`, root)).toStrictEqual([]);
  });
});

describe("shellToolEditPaths", () => {
  test("reads a shell call's command string or argv", () => {
    const root = tempDir("kibi-shell-tool-");
    write(root, "src/a.ts", "x\n");
    const target = path.join(root, "src/a.ts");
    for (const toolName of [
      "Bash",
      "Shell",
      "shell",
      "local_shell",
      "exec_command",
      "run_shell_command",
    ]) {
      expect(
        shellToolEditPaths(
          toolName,
          { command: "sed -i 's/x/y/' src/a.ts" },
          root,
        ),
      ).toEqual([target]);
    }
    expect(
      shellToolEditPaths(
        "shell",
        { command: ["bash", "-lc", "echo y > src/a.ts", 3] },
        root,
      ),
    ).toEqual([target]);
  });

  test("reads the script a shell runs with -c, as a string or argv", () => {
    const root = tempDir("kibi-shell-tool-");
    write(root, "src/a.ts", "x\n");
    const target = path.join(root, "src/a.ts");
    for (const command of [
      `bash -lc "sed -i 's/x/y/' src/a.ts"`,
      "sh -c 'tee src/a.ts < /dev/null'",
      "cd . && /bin/zsh -c 'perl -pi -e s/x/y/ src/a.ts'",
      ["bash", "-lc", "sed -i s/x/y/ src/a.ts"],
      ["/bin/sh", "-c", "tee -a src/a.ts"],
    ]) {
      expect(shellToolEditPaths("shell", { command }, root)).toEqual([target]);
    }
    // A shell without -c, and a -c script that only reads, write nothing.
    for (const command of [
      "bash script.sh src/a.ts",
      `bash -c "sed -n 1p src/a.ts"`,
      ["bash", "-c"],
    ]) {
      expect(shellToolEditPaths("shell", { command }, root)).toEqual([]);
    }
  });

  test("names nothing for other tools, reads or missing commands", () => {
    const root = tempDir("kibi-shell-tool-");
    write(root, "src/a.ts", "x\n");
    for (const [toolName, toolInput] of [
      ["Edit", { command: "sed -i 's/x/y/' src/a.ts" }],
      [undefined, { command: "sed -i 's/x/y/' src/a.ts" }],
      ["Bash", { command: "sed -n 1p src/a.ts" }],
      ["Bash", { command: 3 }],
      ["Bash", null],
      ["Bash", "sed -i 's/x/y/' src/a.ts"],
    ] as const) {
      expect(shellToolEditPaths(toolName, toolInput, root)).toEqual([]);
    }
  });
});

describe("what a shell command shows of each file", () => {
  function readsOf(root: string, command: string, cwd = root) {
    return commandReadViews(command, cwd).map((view) => ({
      ...view,
      absolute: path.relative(root, view.absolute) || ".",
    }));
  }

  function project(): string {
    const root = workspace(["src/a.ts", "src/b.ts", "src/c.ts"]);
    write(
      root,
      "src/long.ts",
      `${Array.from({ length: 30 }, (_, index) => `line ${index + 1}`).join("\n")}\n`,
    );
    write(root, "src/open.ts", "one\ntwo\nthree");
    return root;
  }

  const grep = {
    pattern: "cap",
    ignoreCase: false,
    fixed: false,
    basic: true,
    word: false,
  };

  test("sed -n ranges, head and tail focus lines; cat shows the whole file", () => {
    const root = project();
    expect(readsOf(root, "sed -n '5,9p' src/a.ts")).toEqual([
      { absolute: "src/a.ts", directory: false, focus: [{ start: 5, end: 9 }] },
    ]);
    expect(readsOf(root, "sed -n 7p src/a.ts")).toEqual([
      { absolute: "src/a.ts", directory: false, focus: [{ start: 7, end: 7 }] },
    ]);
    expect(readsOf(root, "sed -n '20,$p' src/long.ts")).toEqual([
      {
        absolute: "src/long.ts",
        directory: false,
        focus: [{ start: 20, end: 30 }],
      },
    ]);
    expect(readsOf(root, "head -n 12 src/a.ts && head -3 src/b.ts")).toEqual([
      {
        absolute: "src/a.ts",
        directory: false,
        focus: [{ start: 1, end: 12 }],
      },
      { absolute: "src/b.ts", directory: false, focus: [{ start: 1, end: 3 }] },
    ]);
    expect(readsOf(root, "head src/a.ts; head --lines=4 src/b.ts")).toEqual([
      {
        absolute: "src/a.ts",
        directory: false,
        focus: [{ start: 1, end: 10 }],
      },
      { absolute: "src/b.ts", directory: false, focus: [{ start: 1, end: 4 }] },
    ]);
    expect(readsOf(root, "tail -n 5 src/long.ts")).toEqual([
      {
        absolute: "src/long.ts",
        directory: false,
        focus: [{ start: 26, end: 30 }],
      },
    ]);
    expect(
      readsOf(root, "tail -n +28 src/long.ts; tail -2 src/open.ts"),
    ).toEqual([
      {
        absolute: "src/long.ts",
        directory: false,
        focus: [{ start: 28, end: 30 }],
      },
      {
        absolute: "src/open.ts",
        directory: false,
        focus: [{ start: 2, end: 3 }],
      },
    ]);
    expect(readsOf(root, "cat -n src/a.ts src/b.ts")).toEqual([
      { absolute: "src/a.ts", directory: false },
      { absolute: "src/b.ts", directory: false },
    ]);
  });

  test("a range read of a piped cat or nl applies to that file", () => {
    const root = project();
    expect(readsOf(root, "nl -ba src/long.ts | sed -n '3,6p'")).toEqual([
      {
        absolute: "src/long.ts",
        directory: false,
        focus: [{ start: 3, end: 6 }],
      },
    ]);
    expect(readsOf(root, "cat src/a.ts | head -n 2")).toEqual([
      { absolute: "src/a.ts", directory: false, focus: [{ start: 1, end: 2 }] },
    ]);
    // Two piped files leave no single source; both stay whole.
    expect(readsOf(root, "cat src/a.ts src/b.ts | head -n 2")).toEqual([
      { absolute: "src/a.ts", directory: false },
      { absolute: "src/b.ts", directory: false },
    ]);
  });

  test("non-range sed scripts fall back to whole files, while non-reading commands produce no read views", () => {
    const root = project();
    expect(readsOf(root, "sed -n '1,$p' src/missing.ts")).toEqual([]);
    expect(readsOf(root, "sed 's/a/b/' src/a.ts")).toEqual([
      { absolute: "src/a.ts", directory: false },
    ]);
    expect(readsOf(root, "sed -n '/x/p' src/a.ts")).toEqual([
      { absolute: "src/a.ts", directory: false },
    ]);
    expect(readsOf(root, "sed -ne 5,9p src/a.ts")).toEqual([
      { absolute: "src/a.ts", directory: false, focus: [{ start: 5, end: 9 }] },
    ]);
    expect(readsOf(root, "sed --quiet --expression=5,9p src/a.ts")).toEqual([
      { absolute: "src/a.ts", directory: false, focus: [{ start: 5, end: 9 }] },
    ]);
    expect(readsOf(root, "sed -n -e 5,9p -f /dev/null -- src/a.ts")).toEqual([
      { absolute: "src/a.ts", directory: false, focus: [{ start: 5, end: 9 }] },
    ]);
    expect(readsOf(root, "sed -n --file=/dev/null -ne5,9p src/a.ts")).toEqual([
      { absolute: "src/a.ts", directory: false, focus: [{ start: 5, end: 9 }] },
    ]);
    expect(readsOf(root, "sed -n -E")).toEqual([]);
    expect(readsOf(root, "sed -i 's/a/b/' src/a.ts")).toEqual([]);
    // Non-reading commands naming a file must not claim the file is in view.
    expect(readsOf(root, "wc -l src/a.ts | sort")).toEqual([]);
    expect(readsOf(root, 'git commit -m "tweak src/a.ts"')).toEqual([]);
    expect(readsOf(root, "echo 'see src/a.ts'")).toEqual([]);
    expect(readsOf(root, "rm -f src/a.ts")).toEqual([]);
    // Byte counts and inverted/summary greps do not produce line views.
    expect(readsOf(root, "head -c 20 src/a.ts")).toEqual([]);
    expect(readsOf(root, "head --bytes=20 src/a.ts")).toEqual([]);
    expect(readsOf(root, "head -n -2 src/long.ts")).toEqual([
      {
        absolute: "src/long.ts",
        directory: false,
        focus: [{ start: 1, end: 28 }],
      },
    ]);
    expect(readsOf(root, "grep -v cap src/a.ts")).toEqual([]);
    expect(readsOf(root, "grep -L cap src/a.ts")).toEqual([]);
    expect(readsOf(root, "grep -c cap src/a.ts")).toEqual([]);
    expect(readsOf(root, "grep --invert-match cap src/a.ts")).toEqual([]);
    expect(readsOf(root, "head -n")).toEqual([]);
    expect(readsOf(root, "tail -n 3 src/dir")).toEqual([]);
    expect(readsOf(root, "tail -n +2 src/dir")).toEqual([]);
  });

  test("a whole view is replaced by a narrower one of the same file", () => {
    const root = project();
    expect(
      readsOf(root, "cat src/a.ts; sed -n 2,3p src/a.ts; cat src/a.ts"),
    ).toEqual([
      { absolute: "src/a.ts", directory: false, focus: [{ start: 2, end: 3 }] },
    ]);
  });

  test("grep, egrep, fgrep and rg searches name files and directories", () => {
    const root = project();
    expect(readsOf(root, "grep -n cap src/a.ts src/b.ts")).toEqual([
      { absolute: "src/a.ts", directory: false, grep },
      { absolute: "src/b.ts", directory: false, grep },
    ]);
    expect(readsOf(root, "grep -rinwE 'cap|limit' src")).toEqual([
      {
        absolute: "src",
        directory: true,
        grep: {
          pattern: "cap|limit",
          ignoreCase: true,
          fixed: false,
          basic: false,
          word: true,
        },
      },
    ]);
    // A directory searched without -r is not searched.
    expect(readsOf(root, "grep cap src")).toEqual([]);
    expect(readsOf(root, "rg cap", path.join(root, "src"))).toEqual([
      {
        absolute: "src",
        directory: true,
        grep: { ...grep, basic: false },
      },
    ]);
    expect(readsOf(root, "fgrep a.b src/a.ts")).toEqual([
      {
        absolute: "src/a.ts",
        directory: false,
        grep: { ...grep, pattern: "a.b", fixed: true, basic: false },
      },
    ]);
    expect(readsOf(root, "egrep -A 3 --include '*.ts' cap -r .")).toEqual([
      { absolute: ".", directory: true, grep: { ...grep, basic: false } },
    ]);
    expect(
      readsOf(
        root,
        "grep --ignore-case --fixed-strings --word-regexp --recursive --color=never -e cap src",
      ),
    ).toEqual([
      {
        absolute: "src",
        directory: true,
        grep: {
          pattern: "cap",
          ignoreCase: true,
          fixed: true,
          basic: false,
          word: true,
        },
      },
    ]);
    expect(readsOf(root, "grep --extended-regexp -- -cap src/a.ts")).toEqual([
      {
        absolute: "src/a.ts",
        directory: false,
        grep: { ...grep, pattern: "-cap", basic: false },
      },
    ]);
    expect(readsOf(root, "grep -- cap -- src/a.ts")).toEqual([
      { absolute: "src/a.ts", directory: false, grep },
    ]);
  });

  test("a grep over piped file content searches that file; an empty pattern searches nothing", () => {
    const root = project();
    expect(readsOf(root, "cat src/a.ts | grep -n cap")).toEqual([
      { absolute: "src/a.ts", directory: false, grep },
    ]);
    expect(readsOf(root, "grep '' src/a.ts")).toEqual([
      { absolute: "src/a.ts", directory: false },
    ]);
  });

  test("a shell -c script is read as its own command line", () => {
    const root = project();
    expect(readsOf(root, `bash -lc "cd src && sed -n '2,4p' a.ts"`)).toEqual([
      { absolute: "src/a.ts", directory: false, focus: [{ start: 2, end: 4 }] },
    ]);
  });
});

describe("file text", () => {
  test("a missing file has no text; an empty file has no lines", () => {
    const root = workspace([]);
    write(root, "empty.ts", "");
    expect(readText(path.join(root, "missing.ts"))).toBeUndefined();
    expect(commandReadViews("tail -n 2 empty.ts", root)).toEqual([
      {
        absolute: path.join(root, "empty.ts"),
        directory: false,
        focus: [{ start: 1, end: 0 }],
      },
    ]);
  });
});

describe("shell tool calls", () => {
  test("the command of a string or argv shell call, none for other tools", () => {
    expect(shellToolCommand("Bash", { command: "cat a.ts" })).toBe("cat a.ts");
    expect(
      shellToolCommand("shell", { command: ["bash", "-lc", "cat a.ts"] }),
    ).toBe("cat a.ts");
    expect(shellToolCommand("shell", { command: ["cat", "a.ts", 3] })).toBe(
      "cat a.ts",
    );
    expect(shellToolCommand("Read", { command: "cat a.ts" })).toBeUndefined();
    expect(shellToolCommand(undefined, {})).toBeUndefined();
    expect(shellToolCommand("Bash", null)).toBeUndefined();
    expect(shellToolCommand("Bash", { command: 3 })).toBeUndefined();
  });

  test("a shell call's read views leave out the files it writes", () => {
    const root = workspace(["src/a.ts", "src/b.ts"]);
    expect(
      shellToolReadViews("Bash", { command: "cat src/a.ts > src/b.ts" }, root),
    ).toEqual([{ absolute: path.join(root, "src/a.ts"), directory: false }]);
    expect(
      shellToolReadViews("Read", { command: "cat src/a.ts" }, root),
    ).toEqual([]);
  });

  test("cp -t targets destination dir entries and sed -f keeps the first file operand", () => {
    const root = workspace(["src/a.ts", "src/b.ts", "out/a.ts", "out/b.ts"]);
    expect(
      commandEditPaths("cp -t out src/a.ts src/b.ts", root).sort(),
    ).toStrictEqual([path.join(root, "out/a.ts"), path.join(root, "out/b.ts")]);
    expect(
      commandEditPaths("cp --target-directory=out src/a.ts", root),
    ).toStrictEqual([path.join(root, "out/a.ts")]);
    expect(commandReadViews("sed -f rules.sed src/a.ts", root)).toStrictEqual([
      { absolute: path.join(root, "src/a.ts"), directory: false },
    ]);
  });
});
