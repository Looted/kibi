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
    content: options.raw || content.endsWith("\n") ? content : `${content}\n`,
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

  it("runs a function body's statements, not a subshell body's", async () => {
    await expect('f() ( X=1; echo "$X" )', "env", [], [1]);
    await expect('f() { X=1; echo "$X"; }', "env", []);
  });
});

describe("Bash arithmetic assignments", () => {
  it("binds variables assigned in arithmetic only", async () => {
    await expect('(( n = 1 ))\necho "$n"', "env", [], [2]);
    await expect('(( n++ ))\necho "$n"', "env", ["n"], [1]);
    await expect('echo $(( n -= 1 ))\necho "$n"', "env", ["n"], [1]);
    await expect(
      'for (( i = 0; i < 3; i++ )); do :; done\necho "$i"',
      "env",
      [],
      [2],
    );
    // `=` in a test compares text.
    await expect('[[ x = 1 ]]\necho "$x"', "env", ["x"]);
    await expect('[ x = 1 ]\necho "$x"', "env", ["x"]);
    await expect("echo ${x:a+1:2}", "env", [], [1]);
  });

  it("reads a script that starts with arithmetic as commands", async () => {
    await expect('(( 1 ))\necho "$HOME"', "env", ["HOME"]);
    await expect('(( 1 ))\necho "$HOME"', "calls", ["echo"]);
  });
});

describe("Bash declarations", () => {
  it("reads declaration options from option words only", async () => {
    await expect("declare xn=1", "env", []);
    await expect("declare xn=a-b", "env", []);
    await expect("declare -n r=X", "env", [], [1]);
    await expect("declare -rn r=X", "env", [], [1]);
    await expect("declare -r -n r=X", "env", [], [1]);
    await expect("declare +n r", "env", [], [1]);
    await expect("f() { local -I X; }", "env", [], [1]);
    await expect('f() { local X=1; echo "$X"; }', "env", []);
    await expect('local X=1\necho "$X"', "env", ["X"]);
    await expect('f() { typeset X; echo "$X"; }', "env", []);
    await expect('f() { typeset -g X; echo "$X"; }', "env", ["X"]);
  });
});

describe("Bash builtins that set variables", () => {
  it("knows read's options", async () => {
    for (const option of ["-d", "-i", "-n", "-N", "-p", "-u"]) {
      await expect(`read ${option} v N\necho "$v $N"`, "env", ["v"]);
      await expect(`read -r${option.slice(1)} v N\necho "$v $N"`, "env", ["v"]);
      await expect(`read ${option}v N\necho "$v $N"`, "env", ["v"]);
    }
    await expect('read -a v N\necho "$v $N"', "env", []);
    await expect('read -av N\necho "$v $N"', "env", []);
    await expect('read -ra\necho "$a $REPLY"', "env", ["a", "REPLY"], [1]);
    await expect('read -ra v\necho "$v $REPLY"', "env", ["REPLY"]);
    await expect('read -x v\necho "$v $REPLY"', "env", ["REPLY"]);
    await expect('read -- -d A\necho "$A $REPLY"', "env", ["REPLY"]);
    await expect('read -\necho "$REPLY"', "env", ["REPLY"]);
    await expect('read A -d B\necho "$A $B"', "env", []);
    for (const script of [
      "read -a",
      'read -a "$x"',
      "read -t",
      'read -t "$x" A',
    ])
      assert.ok((await read(script)).lines.includes(1), script);
  });

  it("knows read -t 0 sets nothing", async () => {
    for (const zero of ["0", "00", "0.00", ".0", "0."])
      await expect(`read -t ${zero} N\necho "$N"`, "env", ["N"]);
    for (const time of ["5", "10", "0x", "0.5", "1.0"])
      await expect(`read -t ${time} N\necho "$N"`, "env", []);
    await expect('read -t5 N\necho "$N"', "env", []);
    await expect('read -t0 N\necho "$N"', "env", ["N"]);
  });

  it("knows mapfile's options", async () => {
    for (const option of ["-d", "-n", "-O", "-s", "-u", "-c"])
      await expect(`mapfile ${option} L\necho "$L $MAPFILE"`, "env", ["L"]);
    await expect('mapfile -C L\necho "$L"', "env", ["L"], [1]);
    await expect('mapfile -t L\necho "$L $MAPFILE"', "env", ["MAPFILE"]);
    await expect('mapfile -t\necho "$MAPFILE"', "env", []);
    await expect('mapfile\necho "$MAPFILE"', "env", []);
    await expect('readarray\necho "$MAPFILE"', "env", []);
    await expect('mapfile "$m"', "env", ["m"], [1]);
  });

  it("knows printf -v, getopts and wait -p", async () => {
    await expect('printf x\necho "$x"', "env", ["x"]);
    await expect("printf 'a[1]' x\necho \"$a\"", "env", ["a"]);
    await expect('printf -v ab x\necho "$ab $a"', "env", ["a"]);
    await expect("printf -v 'a[1]' x\necho \"$a\"", "env", []);
    await expect("printf -v", "env", [], [1]);
    await expect('printf -v "$x" y', "env", ["x"], [1]);
    await expect('getopts ab o\necho "$o $OPTARG"', "env", []);
    await expect('getopts ab\necho "$OPTARG"', "env", ["OPTARG"]);
    await expect('getopts ab "$x"', "env", ["x"], [1]);
    await expect('wait x\necho "$x"', "env", ["x"]);
    await expect('wait -p J\necho "$J"', "env", [], [2]);
    await expect('wait -n -p J\necho "$J"', "env", [], [2]);
    await expect("wait -p", "env", [], [1]);
    await expect('wait -p "$x"', "env", ["x"], [1]);
    await expect('[ -v "a[1]" ]', "env", ["a"]);
    await expect('[[ -v ab ]]; [[ -v "c[x]" ]]', "env", ["ab", "c"]);
  });
});

describe("Bash text that rebinds commands or reads the environment", () => {
  it("refuses text that rebinds what a command runs", async () => {
    for (const extract of ["calls", "string_args", "env"])
      await expect(
        "BASH_CMDS[c]=/bin/rm\nc x",
        extract,
        extract === "string_args" ? ["x"] : ["c"],
        [1],
        { callee: "c" },
      );
    await expect("BASH_CMDS[c]=/bin/rm\nsource a.sh", "imports", ["a.sh"]);
    const row = await read("x=1\n  BASH_ALIASES[c]=y # note\n", "calls");
    assert.deepEqual(row.rows, [
      "2: BASH_ALIASES[c]=y # note",
      "2: BASH_ALIASES[c]=y",
    ]);
    const long = `echo ${"a".repeat(90)} BASH_ARGV0`;
    assert.deepEqual((await read(`:\n${long}`, "calls")).rows, [
      `2: ${long.slice(0, 80)}`,
    ]);
  });

  it("refuses prompt variables whose value is not plain text", async () => {
    for (const value of ["abc", "'a b'", '"a b"', "abc;", "abc &"])
      await expect(`PS4=${value}\n:`, "calls", [":"]);
    await expect("PS4=abc|x", "calls", ["x"]);
    await expect("(PS4=abc)", "calls", []);
    await expect("PS4=abc", "calls", [], [], { raw: true });
    await expect("PROMPT_COMMAND=abc", "calls", [], [], { raw: true });
    for (const value of [
      "'$(x)'",
      '"$x"',
      "'a`b'",
      "'a\\b'",
      '"a\\b"',
      "$x",
      "a\\b",
      "ab'c'",
      "a<b",
      "a>b",
    ])
      await expect(`PS4=${value}\n:`, "calls", [":"], [1]);
    await expect("echo PS4 x=1", "calls", ["echo"], [1]);
    await expect("echo PS1", "calls", ["echo"], [1]);
    await expect("echo $PS1 ${PS2} aPS3", "calls", ["echo"]);
  });

  it("refuses text another language reads the environment through", async () => {
    for (const text of [
      "ENVIRON",
      "%ENV",
      "$ENV",
      "$ENV{X}",
      "os.environ",
      "os.environb",
      "os.getenv",
      "getenv(",
      "getenv  (",
      "process.env",
      "ENV[",
      "ENV  [",
      "ENV.fetch",
      "ENV .fetch",
      "-MEnv",
      "environ",
      "/proc/12/env",
      "/proc/ab/x/env",
      "/proc/self/env",
      "/proc/*/x",
      "/proc/?",
      "/proc/[",
      "/proc/$x",
      "/proc/a/../y",
      "/proc/a/./y",
      "/proc/a//x",
      "/proc/thread-self",
      "cd /proc",
      "pushd /proc",
      "cd '/proc",
      'cd "/proc',
      "cd  /proc",
    ]) {
      const result = await read(`: # ${text}`, "env");
      assert.deepEqual(result.rows, [`1: : # ${text}`], text);
    }
    for (const text of [
      "xENVIRON",
      "ENVIRONx",
      "%ENVx",
      "$ENVx",
      "xos.environb",
      "os.environbx",
      "xos.getenv",
      "os.getenvx",
      "getenv",
      "xgetenv(",
      "process.envx",
      "ENV",
      "xENV[",
      "ENV.fetchx",
      "ENV.x",
      "-MEnvx",
      "xenviron",
      "environx",
      "/proc/1/x",
      "/proc/ env",
      "/proc/;env",
      "/proc/&env",
      "/proc/|env",
      "/proc/<env",
      "/proc/>env",
      "/proc/)env",
      "/proc/'env",
      '/proc/"env',
      "/proc/.",
      "/proc/a/.../",
      "/proc/thread-selfx",
      "xcd /proc",
      "cd /procx",
      "cd/proc",
      "cd x/proc",
    ])
      await expect(`: # ${text}`, "env", [], [], {});
    assert.deepEqual((await read(": # ENVIRON", "calls")).rows, []);
  });

  it("finds the names a script declares local anywhere", async () => {
    await expect(
      "f() { local ABC DEF=1 G; }\nunset ABC\nunset DEF\nunset G\nunset H",
      "env",
      [],
      [2, 3, 4],
    );
    await expect("f() { local -r ABC; }\nunset ABC", "env", [], [2]);
    await expect("f() { local A1; local\tB; }\nunset A1 B", "env", [], [2]);
    await expect("f() { local; }; unset x", "env", [], [1]);
  });
});

describe("Bash places that set a variable", () => {
  it("binds assignments, elements and declarations", async () => {
    await expect('X=1 cmd\necho "$X"', "env", ["X"]);
    await expect('a[1]=x\necho "$a"', "env", [], [2]);
    for (const [value, rows] of [
      ["5", []],
      ["$(( 2 ))", []],
      ["", [2]],
      ["a", [2]],
    ])
      await expect(`X=${value}\necho $(( X + 1 ))`, "calls", ["echo"], rows);
    await expect("a=1; a[1]=x; echo $(( a + 1 ))", "calls", ["echo"], [1]);
    await expect('f() { export X; echo "$X"; }', "env", ["X"]);
    await expect('f() { readonly X; echo "$X"; }', "env", ["X"]);
    await expect('f() { declare X; echo "$X"; }', "env", []);
    await expect('declare X\necho "$X"', "env", ["X"]);
    await expect("f() { local X; echo $(( X + 1 )); }", "calls", ["echo"]);
  });

  it("binds loop variables", async () => {
    await expect('for f in a; do :; done\necho "$f"', "env", [], [2]);
    for (const values of [
      "1 2",
      "-1 23",
      "{1..3}",
      "{-1..-3}",
      "{1..9..2}",
      "{12..34..-56}",
    ])
      await expect(
        `for i in ${values}; do echo $(( i )); done`,
        "calls",
        ["echo"],
        [],
      );
    for (const values of [
      "a",
      "1 a",
      "1x",
      "x1",
      "x{1..3}",
      "{1..3}x",
      "{a..c}",
      "{1..3..}",
      "{1..c}",
      "{1..3..x}",
    ])
      await expect(
        `for i in ${values}; do echo $(( i )); done`,
        "calls",
        ["echo"],
        [1],
      );
    await expect("for i; do echo $(( i )); done", "calls", ["echo"], [1]);
    await expect('select x in a; do :; done\necho "$REPLY"', "env", [], [2]);
    await expect('for x in a; do :; done\necho "$REPLY"', "env", ["REPLY"]);
    await expect(
      "select x in a; do echo $(( REPLY )); done",
      "calls",
      ["echo"],
      [1],
    );
  });

  it("binds arithmetic assignments", async () => {
    for (const expression of [
      "n = 1",
      "n += 1",
      "n -= 1",
      "n *= 1",
      "n /= 1",
      "n %= 1",
      "n &= 1",
      "n |= 1",
      "n ^= 1",
      "n <<= 1",
      "n >>= 1",
      "n++",
      "n--",
      "++n",
      "--n",
    ]) {
      const result = await read(`f() { (( ${expression} )); }`);
      assert.deepEqual(result.members, [], expression);
    }
    for (const expression of [
      "n == 1",
      "n != 1",
      "n <= 1",
      "n >= 1",
      "n < 1",
      "n + 1",
      "-n",
      "!n",
    ])
      assert.deepEqual(
        (await read(`f() { (( ${expression} )); }`)).members,
        ["n"],
        expression,
      );
    await expect("n=1; (( n += 1 )); echo $(( n + 1 ))", "calls", ["echo"]);
  });

  it("binds through command and builtin", async () => {
    await expect('builtin read X\necho "$X"', "env", []);
    await expect('command command read X\necho "$X"', "env", []);
    await expect('command -p read X\necho "$X"', "env", ["X"]);
    await expect("command\nbuiltin", "env", []);
  });

  it("binds unset names unless it unsets functions", async () => {
    await expect('unset -f X\necho "$X"', "env", ["X"]);
    await expect('unset -vf X\necho "$X"', "env", ["X"]);
    await expect('unset -vvf X\necho "$X"', "env", ["X"]);
    await expect('unset fx\necho "$fx"', "env", []);
    await expect('unset -v X\necho "$X"', "env", []);
    await expect('f() { unset X; echo "$X"; }', "env", [], [1]);
  });

  it("binds a default assigned in an expansion", async () => {
    await expect('f() { : "${XY:=5}"; }', "env", [], [1]);
    await expect('f() { : "${XY=5}"; }', "env", [], [1]);
    await expect('f() { : "${XY}"; }', "env", ["XY"]);
    await expect(
      'XY=1; : "${XY:=a}"; echo $(( XY ))',
      "calls",
      [":", "echo"],
      [1],
    );
  });
});

describe("Bash values the script certainly set", () => {
  it("follows read in lists and loops", async () => {
    await expect(
      'while read -r line; do f() { echo "$line"; }; done',
      "env",
      [],
      [1],
    );
    await expect('while :; do read X; echo "$X"; done', "env", [], [1]);
    await expect('read X || echo "$X"', "env", []);
    await expect('read X "$X" || :', "env", ["X"], [1]);
    await expect('[[ x ]] || read X\necho "$X"', "env", [], [2]);
    await expect('while (read X); do echo "$X"; done', "env", [], [1]);
    await expect('while [[ x ]] && read X; do echo "$X"; done', "env", [], [1]);
    await expect('while read X && :; do echo "$X"; done', "env", []);
    await expect('while read X; do echo "$X"; done', "env", []);
    await expect('until read X; do echo "$X"; done', "env", []);
    await expect('while printf -v X a; do echo "$X"; done', "env", [], [1]);
    await expect(
      'while :; do printf -v X a || echo "$X"; done',
      "env",
      [],
      [1],
    );
    await expect('while [[ x ]]; do echo "$X"; done', "env", ["X"]);
  });

  it("follows for and select loops", async () => {
    await expect('for y in a; do echo "$X"; done', "env", ["X"]);
    await expect('for y in a; do echo "$y"; done', "env", []);
    await expect('select x in a; do echo "$Y"; done', "env", ["Y"]);
    await expect('for x in a; do echo "$REPLY"; done', "env", ["REPLY"]);
    await expect('select x in a; do echo "$REPLY"; done', "env", []);
    await expect('for (( i = 0; i < 3; i++ )); do echo "$i"; done', "env", []);
    await expect("for (( i = i; ; )); do :; done", "env", [], [1]);
    await expect('for (( i++; i < 3; )); do echo "$i"; done', "env", [], [1]);
    await expect('for (( ; i < 3; )); do echo "$i"; done', "env", ["i"], [1]);
  });

  it("follows bindings into the functions that run after them", async () => {
    await expect('X=1\nf() { echo "$X"; }', "env", []);
    await expect('f() { echo "$X"; }\nX=1', "env", [], [1]);
    await expect('f() { X=1; }\necho "$X"', "env", [], [2]);
    await expect('f() { X=1; }\ng() { echo "$X"; }', "env", [], [2]);
    await expect('f() { echo "$X"; X=1; }', "env", [], [1]);
    await expect('f() { X=1; echo "$X"; }', "env", []);
  });

  it("knows a loop may set a variable before it reads it again", async () => {
    for (const loop of ["while :", "for i in a", "for ((;;))"])
      await expect(`${loop}; do echo "$X"; X=1; done`, "env", [], [1]);
    await expect('echo "$X"; X=1', "env", ["X"]);
    await expect('while :; do echo "$X"; done; X=2', "env", ["X"]);
    await expect('while :; do echo "$X"; X=1; done; X=2', "env", [], [1]);
  });

  it("keeps the first row for a variable that may be the environment's", async () => {
    await expect('f() { echo "$X"; }\ng() { echo "$X"; }\nX=1', "env", [], [1]);
    const name = `L${"X".repeat(90)}`;
    const long = await read(`f() { echo "$${name}"; }\n${name}=1`);
    assert.equal(
      long.rows[0],
      `1: ${`${name} may be read from the environment: $${name}`.slice(0, 80)}`,
    );
  });

  it("knows which values are numbers", async () => {
    await expect("declare -i n\necho $(( n + 1 ))", "calls", ["echo"]);
    await expect("n=1; n=a; echo $(( n ))", "calls", ["echo"], [1]);
    await expect("n=1; echo $(( n ))", "calls", ["echo"]);
  });
});
