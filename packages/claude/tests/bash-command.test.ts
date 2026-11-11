import { afterEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import {
  commandEditPaths,
  commandFilePaths,
  filesChangedSince,
  isSearchCommand,
} from "../src/bash-command";
import { cleanupTempDirs, tempDir, write } from "./fixture";

afterEach(cleanupTempDirs);

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
    // Descriptor redirections, here-strings and quoted `>` are not writes.
    for (const command of [
      "cat a.ts 2>b.ts",
      "cat a.ts &>b.ts",
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
