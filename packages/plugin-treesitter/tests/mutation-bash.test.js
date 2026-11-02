// executable_for TEST-kibi-tree-sitter-script-references
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { validateReferenceExtractionResult } from "kibi-plugin-sdk";

globalThis.fetch = async () => {
  throw new Error("network access is disabled in this test");
};

const { createTreeSitterReferenceExtractor } = await import("../dist/index.js");
const extractor = createTreeSitterReferenceExtractor();

/** Members (sorted, unique), the lines of the rows and their texts. */
async function read(content, extract = "env", options = {}) {
  const result = await extractor.extract({
    path: options.path ?? "s.sh",
    content: content.endsWith("\n") ? content : `${content}\n`,
    extract,
    ...(options.callee === undefined ? {} : { callee: options.callee }),
  });
  assert.deepEqual(validateReferenceExtractionResult(result), result);
  assert.equal(result.status, "ok", JSON.stringify(result));
  return {
    members: [...new Set(result.members)].sort(),
    lines: [...new Set(result.unresolved.map((row) => row.line))].sort(
      (a, b) => a - b,
    ),
    rows: result.unresolved.map((row) => `${row.line}: ${row.text}`),
  };
}

const lines = (...rows) => `${rows.join("\n")}\n`;

/** Asserts the members and the lines of the rows of one read. */
async function expect(content, extract, members, rowLines = [], options = {}) {
  const result = await read(content, extract, options);
  assert.deepEqual(
    { members: result.members, lines: result.lines },
    { members: [...members].sort(), lines: rowLines },
    `${extract}: ${content}\n${result.rows.join("\n")}`,
  );
  return result;
}

describe("Bash shell variables", () => {
  it("does not read variables bash sets at start-up from the environment", async () => {
    for (const name of [
      "BASH",
      "BASHPID",
      "BASH_COMMAND",
      "BASH_LINENO",
      "BASH_REMATCH",
      "BASH_SOURCE",
      "BASH_SUBSHELL",
      "BASH_VERSINFO",
      "BASH_VERSION",
      "EPOCHREALTIME",
      "EPOCHSECONDS",
      "EUID",
      "FUNCNAME",
      "GROUPS",
      "HISTCMD",
      "IFS",
      "LINENO",
      "OPTERR",
      "OPTIND",
      "PIPESTATUS",
      "PPID",
      "PWD",
      "RANDOM",
      "SHELLOPTS",
      "SRANDOM",
      "UID",
    ])
      await expect(`echo "$${name}"`, "env", []);
  });

  it("may read variables bash sets only on some start-ups", async () => {
    for (const name of [
      "BASHOPTS",
      "BASH_ARGC",
      "BASH_ARGV",
      "BASH_CMDS",
      "BASH_EXECUTION_STRING",
      "OLDPWD",
      "SECONDS",
      "SHLVL",
    ])
      await expect(`echo "$${name}"`, "env", [], [1]);
  });

  it("knows which shell variables always hold numbers", async () => {
    for (const name of [
      "BASHPID",
      "BASH_SUBSHELL",
      "EPOCHSECONDS",
      "EUID",
      "HISTCMD",
      "LINENO",
      "OPTIND",
      "PPID",
      "RANDOM",
      "SECONDS",
      "SRANDOM",
      "UID",
    ])
      await expect(`echo $(( ${name} + 1 ))`, "calls", ["echo"]);
    for (const name of ["#", "?", "$", "!"])
      await expect(`echo $(( $${name} + 1 ))`, "calls", ["echo"]);
    await expect("echo $(( OTHER + 1 ))", "calls", ["echo"], [1]);
  });
});

describe("Bash shells and wrappers", () => {
  it("refuses code handed to any shell", async () => {
    for (const shell of [
      "sh",
      "bash",
      "zsh",
      "dash",
      "ksh",
      "ash",
      "mksh",
      "yash",
      "rbash",
      "ksh93",
      "pdksh",
      "posh",
      "fish",
      "csh",
      "tcsh",
    ]) {
      await expect(`${shell} -c x`, "calls", [shell], [1]);
      await expect(`${shell} ./x.sh`, "calls", [shell]);
    }
  });

  it("skips the arguments of shell options before the script", async () => {
    for (const option of ["-o", "+o", "-O", "+O", "--rcfile", "--init-file"]) {
      await expect(`bash ${option} x /dev/stdin`, "calls", ["bash"], [1]);
      await expect(`bash ${option} x ./run.sh`, "calls", ["bash"]);
    }
  });
});

/** Each wrapper's options, as the reader models them. */
const WRAPPERS = {
  sudo: {
    args: "-u -g -C -D -p -r -t -U -T --user --group --prompt --chdir --role --type --other-user --command-timeout --close-from --host -R --chroot",
    flags:
      "-A -b -E -H -n -P -S -k -B -N --askpass --background --preserve-env --set-home --non-interactive --preserve-groups --stdin --reset-timestamp --bell --no-update",
    noCommand:
      "-e -l -v -V -K --edit --list --validate --version --remove-timestamp --help -h",
    code: "-s -i --shell --login",
  },
  doas: { args: "-u -C", flags: "-n", code: "-s" },
  env: {
    args: "-u -C --unset --chdir --split-string-off",
    flags: "-i -v --ignore-environment --debug -",
    noCommand: "-0 --null --help --version",
    code: "-S --split-string",
  },
  command: { flags: "-p", noCommand: "-v -V" },
  builtin: {},
  exec: { args: "-a", flags: "-c -l" },
  nohup: {},
  setsid: { flags: "-c -f -w --ctty --fork --wait" },
  nice: { args: "-n --adjustment" },
  ionice: {
    args: "-c -n --class --classdata",
    flags: "-t --ignore",
    noCommand: "-p -P -u --pid --pgid --uid",
  },
  stdbuf: { args: "-i -o -e --input --output --error" },
  time: {
    args: "-f -o --format --output",
    flags: "-p -a -v -q --portability --append --verbose --quiet",
  },
  timeout: {
    args: "-s -k --signal --kill-after",
    flags: "-v --verbose --preserve-status --foreground",
    operand: "5",
  },
  chroot: {
    args: "--userspec --groups",
    flags: "--skip-chdir",
    operand: "/srv",
  },
  flock: {
    args: "-w -E --timeout --conflict-exit-code",
    flags:
      "-s -x -u -n -o -F --shared --exclusive --unlock --nonblock --close --no-fork --verbose",
    operand: "/l",
    code: "-c --command",
  },
  xargs: {
    args: "-a -d -E -I -L -n -P -s --arg-file --delimiter --max-lines --max-args --max-procs --max-chars --process-slot-var",
    flags:
      "-0 -r -t -p -x -o --null --no-run-if-empty --verbose --interactive --exit --open-tty",
  },
  unbuffer: { flags: "-p" },
  caffeinate: { args: "-t -w", flags: "-d -i -m -s -u" },
  taskset: { flags: "-a --all-tasks", noCommand: "-p --pid", operand: "3" },
  strace: {
    args: "-e -o -p -s -u -a -I -b -E -P -S -X",
    flags:
      "-c -C -d -D -f -F -i -k -n -q -r -t -T -v -w -x -y -Z -ff -tt -ttt -yy -qq",
    noCommand: "-V --version -h --help",
  },
  ltrace: {
    args: "-e -o -p -s -u -a -n -l -L -x -F -A -w -D",
    flags: "-c -C -d -f -i -r -S -t -T -b -tt -ttt",
  },
};

const words = (text) => (text === undefined ? [] : text.split(" "));

describe("Bash wrapper options", () => {
  for (const [wrapper, model] of Object.entries(WRAPPERS)) {
    const operand = model.operand === undefined ? "" : ` ${model.operand}`;
    it(`follows ${wrapper} through its options`, async () => {
      for (const option of words(model.args)) {
        await expect(`${wrapper} ${option} val${operand} tool x`, "calls", [
          wrapper,
          "tool",
        ]);
        if (option.startsWith("--"))
          await expect(`${wrapper} ${option}=val${operand} tool`, "calls", [
            wrapper,
            "tool",
          ]);
      }
      for (const option of words(model.flags))
        await expect(`${wrapper} ${option}${operand} tool x`, "calls", [
          wrapper,
          "tool",
        ]);
      for (const option of words(model.noCommand))
        await expect(`${wrapper} ${option} tool x`, "calls", [wrapper]);
      for (const option of words(model.code))
        await expect(`${wrapper} ${option} tool x`, "calls", [wrapper], [1]);
      await expect(
        `${wrapper} --bogus${operand} tool`,
        "calls",
        [wrapper],
        [1],
      );
      await expect(`${wrapper} -%${operand} tool`, "calls", [wrapper], [1]);
      await expect(`${wrapper}${operand} tool x`, "calls", [wrapper, "tool"]);
    });
  }

  it("reads a lone dash as env's empty environment", async () => {
    await expect("env - rm x", "calls", ["env", "rm"]);
    await expect("env - X=1 rm x", "calls", ["env", "rm"]);
    await expect("env -- - x", "calls", ["-", "env"]);
  });
});

describe("Bash commands that run code Kibi does not follow", () => {
  it("refuses commands that run shell code", async () => {
    for (const name of ["watch", "parallel", "sem", "su", "sg", "script"])
      await expect(`${name} x`, "calls", [], [1]);
  });

  it("refuses runners whose options it does not model", async () => {
    const runners = [
      "runuser",
      "chrt",
      "unshare",
      "setpriv",
      "systemd-run",
      "pkexec",
      "fakeroot",
      "fakechroot",
      "nsenter",
      "firejail",
      "bwrap",
      "proot",
      "cgexec",
      "numactl",
      "prlimit",
      "schroot",
      "chpst",
      "softlimit",
      "envdir",
      "setuidgid",
      "dbus-run-session",
      "dbus-launch",
      "xvfb-run",
      "faketime",
      "torsocks",
      "proxychains",
      "proxychains4",
      "tsocks",
      "catchsegv",
      "valgrind",
      "start-stop-daemon",
      "daemonize",
      "chronic",
      "ssh-agent",
      "with-contenv",
      "s6-setuidgid",
      "gosu",
      "su-exec",
      "tini",
      "dumb-init",
    ];
    for (const name of runners) {
      await expect(`${name} x`, "calls", [], [1]);
      await expect(`${name} x`, "env", []);
    }
    // For env, a runner refuses only when it may start a shell or print the
    // environment.
    for (const dumper of [
      "env",
      "printenv",
      "set",
      "export",
      "declare",
      "typeset",
      "compgen",
      "ps",
      "bash",
      "watch",
      "/usr/bin/env",
    ])
      await expect(`chrt 5 ${dumper}`, "env", [], [1]);
    await expect('chrt 5 "$x"', "env", ["x"], [1]);
  });

  it("refuses interpreters handed code it cannot see", async () => {
    for (const name of [
      "awk",
      "gawk",
      "mawk",
      "nawk",
      "busybox",
      "jq",
      "python",
      "python2",
      "python3",
      "perl",
      "ruby",
      "node",
      "nodejs",
      "deno",
      "bun",
      "php",
      "lua",
      "tclsh",
      "Rscript",
      "osascript",
      "/usr/bin/perl",
    ]) {
      await expect(`${name} "$p"`, "env", ["p"], [1]);
      await expect(`${name} -e 'print 1'`, "env", []);
    }
    await expect('cat "$p"', "env", ["p"]);
  });

  it("refuses text another language reads the environment through", async () => {
    // A word that also matches the whole-file pattern gives two rows.
    for (const [text, count] of [
      ["ENVIRON", 2],
      ["a$ENV", 2],
      ["$ENV{X}", 2],
      ["%ENV", 2],
      ["environ", 2],
      ["process.env", 2],
      ["getenv", 1],
      ["env.X", 1],
      ["env._", 1],
      ["env[1]", 1],
    ]) {
      const result = await read(`foo '${text}'`);
      assert.equal(result.rows.length, count, text);
    }
    for (const text of [
      "xENVIRON",
      "ENVIRONx",
      "$ENVx",
      "%ENVx",
      "xenviron",
      "environx",
      "xgetenv",
      "getenvx",
      "process.envx",
      "xenv.X",
      "env.1",
      "env.",
      "xenv[1]",
      "env",
    ])
      await expect(`foo '${text}'`, "env", []);
  });

  it("refuses declarations run through command or builtin", async () => {
    for (const name of [
      "declare",
      "typeset",
      "local",
      "export",
      "readonly",
      "unset",
    ]) {
      await expect(`command ${name} x`, "env", [], [1]);
      await expect(`builtin ${name} x`, "env", [], [1]);
    }
  });
});

describe("Bash words", () => {
  it("reads the literal value of a word", async () => {
    const arg = (content, members, rowLines = []) =>
      expect(content, "string_args", members, rowLines, { callee: "curl" });
    await arg("curl a\\*b", ["a*b"]);
    await arg("curl a\\$b", ["a$b"]);
    await arg("curl 'a\\'", ["a\\"]);
    await arg("curl a\\\\", ["a\\"]);
    for (const glob of ["a*b", "a?b", "a[b]", "a$b", "a`b`", "~/x"])
      await arg(`curl ${glob}`, [], [1]);
    await arg("curl x~", ["x~"]);
    // Brace expansions; an escaped character joins no brace.
    for (const brace of ["{ab,c}", "{a,bc}", "{1..3}", "x{a,b}"])
      await arg(`curl ${brace}`, [], [1]);
    for (const text of ["{1.\\x.2}", "{ab}", "{a\\,b}", "{1.2}"])
      await arg(`curl ${text}`, [text.replace("\\", "")]);
    await arg('curl a"$x"', [], [1]);
    await arg("curl a\"b\"'c'", ["abc"]);
    await arg('curl "a\\$b" "x"', ["a$b"]);
    await arg('curl "a\\x"', ["a\\x"]);
    await arg('curl "a\\"b\\\\c\\`"', ['a"b\\c`']);
  });

  it("reads the arguments of a redirected command", async () => {
    const arg = (content, members, rowLines = []) =>
      expect(content, "string_args", members, rowLines, { callee: "curl" });
    await arg("cat <<A 2>/n y && curl x\nA", ["x"]);
    await arg("curl x{fd}>/tmp/x URL", ["x{fd}"]);
    await arg("curl {fd}x>/tmp/x URL", ["{fd}x"]);
    await arg("curl {fdx}>/tmp/x URL", ["URL"]);
    await arg("curl a>/tmp/x URL", ["a"]);
    await arg("curl {fd} >/tmp/x URL", ["{fd}"]);
    await arg("curl {fd}>/a 2>/b URL", ["URL"]);
    await arg("curl >o b c", ["b"]);
    await arg("curl <<A b\nA", ["b"]);
    await arg("curl <<<x b", ["b"]);
    await expect("sudo <<A 2>/dev/null rm -rf x\nA", "calls", ["rm", "sudo"]);
  });

  it("refuses a line splice inside a word", async () => {
    for (const extract of ["imports", "env", "calls"])
      await expect("source a\\\nb.sh", extract, [], [1]);
    await expect("so\\\nurce a.sh", "imports", [], [1]);
    await expect("source \\\na.sh", "imports", ["a.sh"]);
    await expect("source a\\\\\nb.sh", "imports", ["a\\"]);
  });

  it("reads the parameter an expansion names", async () => {
    await expect('echo "$a1" "${10}" "$1" ${#} ${#x}', "env", ["a1", "x"]);
    await expect('echo "${arr[1]}" ${@} ${#@}', "env", ["arr"]);
  });
});

describe("Bash sourced files", () => {
  const sourced =
    "s.sh may be sourced by another script, whose folder $0 names";

  it("reads paths relative to the script's folder", async () => {
    await expect("source", "imports", [], [1]);
    await expect(". ", "imports", [], [1]);
    for (const [word, path] of [
      ['"$(dirname "$BASH_SOURCE")/a.sh"', "a.sh"],
      ['"$(dirname "${BASH_SOURCE[0]}")/a.sh"', "a.sh"],
      ['"$(dirname "${BASH_SOURCE}")/a.sh"', "a.sh"],
      ['"${BASH_SOURCE%/*}/b/a.sh"', "b/a.sh"],
      ['"${BASH_SOURCE[0]%/*}/a.sh"', "a.sh"],
    ])
      await expect(`source ${word}`, "imports", [path], [], { path: "s.sh" });
    await expect('source "$(dirname $0)/x/../a.sh"', "imports", ["a.sh"], [1]);
    await expect('source "${0%/*}/a.sh"', "imports", ["a.sh"], [1]);
    for (const word of [
      '"x$(dirname "$0")/a.sh"',
      '"$(dirname "$0")/a.sh "',
      '"$(dirname "$0")"',
      '"$(dirname "$0")/a b"',
      '"${BASH_SOURCE[1]%/*}/a.sh"',
      '"${0%/}/a.sh"',
      '"$(dirname "$1")/a.sh"',
      '"$(basename "$0")/a.sh"',
    ])
      await expect(`source ${word}`, "imports", [], [1]);
    const nested = await read('source "$(dirname "$0")/a.sh"', "imports", {
      path: "bin/run.sh",
    });
    assert.deepEqual(nested.members, ["bin/a.sh"]);
    assert.deepEqual(nested.rows, [
      `1: run.sh may be sourced by another script, whose folder $0 names: source "$(dirname "$0")/a.sh"`,
    ]);
  });

  it("refuses a $0 path after the script changes directory", async () => {
    const source = 'source "$(dirname "$0")/a.sh"';
    for (const before of ["cd /x", "pushd /x", "popd", "f() { cd /x; }"])
      await expect(`${before}\n${source}`, "imports", [], [2]);
    for (const before of [
      "(cd /x)",
      "cat <(cd /x)",
      "echo $(cd /x)",
      "cd() { :; }",
      "xcd /x",
      "cdx /x",
      "echo cd",
    ]) {
      const result = await read(`${before}\n${source}`, "imports");
      assert.deepEqual(result.members, ["a.sh"], before);
      assert.deepEqual(result.rows, [`2: ${sourced}: ${source}`], before);
    }
    const after = await read(`${source}\ncd /x`, "imports");
    assert.deepEqual(after.members, ["a.sh"]);
  });
});

describe("Bash statements that always run", () => {
  it("knows which redirections cannot fail before the command runs", async () => {
    for (const redirect of [
      "</dev/null",
      "< <(ls)",
      '<<<"a"',
      "<<A\na\nA",
      "2>/dev/null",
      "</dev/null 2>/dev/null",
    ])
      await expect(`read X ${redirect}\necho "$X"`, "env", [], []);
    for (const redirect of [
      "<f",
      "</dev/nullx",
      "<x/dev/null",
      "<f 2>/dev/null",
      "2>/dev/null <f",
      "3<&-",
      "<&3-",
    ]) {
      const result = await read(`read X ${redirect}\necho "$X"`);
      assert.deepEqual(result.members, [], redirect);
      assert.equal(result.lines.at(-1), redirect.split("\n").length + 1);
    }
  });

  it("knows which statements of a list or block run", async () => {
    for (const script of [
      "false && X=1",
      "if c; then X=1; fi",
      "X=1 &",
      "while c; do X=1; done",
      "{ X=1; }",
    ])
      await expect(`${script}\necho "$X"`, "env", [], [2]);
    for (const script of ["X=1 && false", "X=1; false", "X=1\n:"])
      await expect(`${script}\necho "$X"`, "env", []);
    await expect('f() { X=1; echo "$X"; }', "env", []);
  });

  it("refuses a line of assignments the grammar joins to the next command", async () => {
    for (const script of [
      'X=1 >/dev/null\necho "$X"',
      'X=1 2>&1\n\necho "$X"',
      '>o X=1\necho "$X"',
    ])
      await expect(script, "env", [], [1]);
    await expect('X=1 \\\necho "$X"', "env", ["X"]);
    await expect('X=1 \\\\ echo "$X"', "env", ["X"]);
    await expect("X=1 >/dev/null\nrm x", "calls", ["rm"]);
  });
});
