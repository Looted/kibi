// executable_for TEST-kibi-tree-sitter-script-references
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { validateReferenceExtractionResult } from "kibi-plugin-sdk";

globalThis.fetch = async () => {
  throw new Error("network access is disabled in this test");
};

const { createTreeSitterReferenceExtractor } = await import("../dist/index.js");
const extractor = createTreeSitterReferenceExtractor();

/** Rows the host drops once it has looked at the project's other files. */
const HOST_ROW =
  /^(?:\w+ may be a function of namespace [\w\\]+|.+? may define macros(?:, function pointers or unions| or function pointers) this file uses|.+? may be Illuminate\\Support\\Env or a class that extends it|.+? may be sourced by another script, whose folder \$0 names): /;

async function raw(path, content, extract, options = {}) {
  const result = await extractor.extract({
    path,
    content,
    extract,
    ...options,
  });
  assert.deepEqual(validateReferenceExtractionResult(result), result);
  return result;
}

/** Members (sorted, unique) and the lines of the rows that refuse the read. */
async function read(path, content, extract, options = {}) {
  const result = await raw(path, content, extract, options);
  assert.equal(result.status, "ok", JSON.stringify(result));
  return {
    members: [...new Set(result.members)].sort(),
    lines: [
      ...new Set(
        result.unresolved
          .filter((row) => !HOST_ROW.test(row.text))
          .map((row) => row.line),
      ),
    ].sort((a, b) => a - b),
    rows: result.unresolved.map((row) => row.text),
  };
}

const lines = (...rows) => `${rows.join("\n")}\n`;

describe("Terraform and HCL property reader", () => {
  const terraform = lines(
    'resource "aws_s3_bucket" "b" {',
    '  acl     = "private"',
    "  count   = 2",
    "  enabled = true",
    "  absent  = null",
    "  offset  = -1",
    '  name    = "x-${var.env}"',
    '  quoted  = "a\\"b \\u00e9 \\U0001F600 $${lit} %%{x}\\n"',
    '  cidr    = ["0.0.0.0/0", ["10.0.0.0/8"]]',
    "  policy  = <<EOT",
    "hello",
    "EOT",
    "  tags = {",
    '    Environment = "prod"',
    '    "Team"      = var.team',
    '    "${"acl"}" = "public"',
    '    upper("k") = "v"',
    "  }",
    "}",
  );

  it("reads literal values of an attribute anywhere in the file", async () => {
    const acl = await read("main.tf", terraform, "property", { key: "acl" });
    assert.deepEqual(acl.members, ["private"]);
    // A computed object key may be acl.
    assert.deepEqual(acl.lines, [16, 17]);
    assert.deepEqual(
      (await read("main.tf", terraform, "property", { key: "cidr" })).members,
      ["0.0.0.0/0", "10.0.0.0/8"],
    );
    for (const [key, value] of [
      ["count", "2"],
      ["enabled", "true"],
      ["absent", "null"],
      ["offset", "-1"],
      ["policy", "hello\n"],
      ["Environment", "prod"],
      ["quoted", 'a"b é 😀 ${lit} %{x}\n'],
    ])
      assert.deepEqual(
        (await read("main.tf", terraform, "property", { key })).members,
        [value],
      );
  });

  it("refuses values it would have to evaluate", async () => {
    assert.deepEqual(
      (await read("main.tf", terraform, "property", { key: "name" })).lines,
      [7, 16, 17],
    );
    assert.deepEqual(
      (await read("main.tf", terraform, "property", { key: "Team" })).lines,
      [15, 16, 17],
    );
    const source = lines(
      "locals {",
      "  a = { for k, v in var.m : k => v }",
      '  b = jsondecode("{}")',
      '  c = upper("x")',
      "  d = <<-EOT",
      "    indented",
      "    EOT",
      "  e = { x = 1 }",
      '  f = ["${var.x}"]',
      "  g = 1 + 2",
      '  h = "%{ if true }x%{ endif }"',
      "  i = -var.n",
      "}",
    );
    const keys = { c: [4], d: [5], e: [8], f: [9], g: [10], h: [11], i: [12] };
    for (const [key, refused] of Object.entries(keys)) {
      const result = await read("x.hcl", source, "property", { key });
      assert.deepEqual(result.members, [], key);
      // The `for` object and jsondecode may make the key.
      assert.deepEqual(
        result.lines,
        [2, 3, ...refused].sort((a, b) => a - b),
        key,
      );
    }
  });

  it("reads nothing else from configuration", async () => {
    for (const extract of [
      "env",
      "imports",
      "calls",
      "string_args",
      "thrown",
    ]) {
      const result = await raw("main.tf", terraform, extract);
      assert.equal(result.status, "unsupported");
      assert.match(result.message, /Terraform configuration has no/);
    }
    const hcl = await raw("x.hcl", 'a = "b"\n', "calls");
    assert.match(hcl.message, /^HCL configuration has no calls/);
  });

  it("refuses a file that does not parse", async () => {
    const result = await raw("main.tf", 'resource "x" {\n', "property", {
      key: "a",
    });
    assert.equal(result.status, "failed");
    assert.match(result.message, /not valid Terraform/);
  });
});

describe("Bash reference reader", () => {
  it("lists variables the script expands but does not set as environment reads", async () => {
    const source = lines(
      "#!/bin/bash", //1
      'echo "$HOME" ${REGION:-eu} ${#TOKEN} ${ARR[@]}', //2
      'printenv API_KEY "OTHER"', //3
      "envsubst '$A ${B}' < t", //4
      "[[ -v FLAG ]]", //5
      "cat <<EOF", //6
      "$IN_HEREDOC", //7
      "EOF", //8
      "cat <<'EOF'", //9
      "$NOT_READ", //10
      "EOF", //11
      'echo "$1 $@ $# $? $PWD $RANDOM $BASH_SOURCE"', //12
      'LOCAL=1; echo "$LOCAL"', //13
      'export OUT=1 && echo "$OUT"', //14
      "declare -p SHOWN", //15
    );
    const env = await read("deploy.sh", source, "env");
    assert.deepEqual(env.members, [
      "A",
      "API_KEY",
      "ARR",
      "B",
      "FLAG",
      "HOME",
      "IN_HEREDOC",
      "OTHER",
      "REGION",
      "SHOWN",
      "TOKEN",
    ]);
    assert.deepEqual(env.lines, []);
  });

  it("follows where the script sets a variable before reading it", async () => {
    const source = lines(
      'echo "$EARLY"', //1
      "EARLY=1", //2
      'echo "$EARLY"', //3
      'if [ -n "$C" ]; then C=1; fi', //4
      'echo "$C"', //5
      'for f in *.txt; do echo "$f"; done', //6
      'while IFS=, read -r a b; do echo "$a $b"; done < list', //7
      'for ((i = 0; i < 3; i++)); do echo "$i"; done', //8
      'f() { local v="$1"; echo "$v $G"; }', //9
      "G=1", //10
      'g() { echo "$G"; }', //11
      'h() { echo "$IN_FN"; }', //12
      ': "${D:=5}"', //13
      'echo "$D"', //14
      "COND=1", //15
      'x() { [ -n "$y" ] && y=2; echo "$y"; }', //16
    );
    const env = await read("s.sh", source, "env");
    // Read before the script sets them (EARLY, C, D), or never set (IN_FN).
    assert.deepEqual(env.members, ["C", "D", "EARLY", "IN_FN"]);
    // f may run before G is set; y is set by x itself only sometimes.
    assert.deepEqual(env.lines, [9, 16]);
    assert.match(env.rows.join("\n"), /G may be read from the environment/);
  });

  it("refuses reads whose name or value it cannot know", async () => {
    const source = lines(
      'echo "${!name}"', //1
      'echo "${!PREFIX_*}"', //2
      'echo "${!arr[@]}"', //3
      'eval "echo $X"', //4
      "source ./lib.sh", //5
      "printenv", //6
      "env", //7
      "set", //8
      "export", //9
      "declare -n ref=X", //10
      'declare "$dyn=1"', //11
      "let z=w+1", //12
      "compgen -v", //13
      "(( count > 3 ))", //14
      "n=0; (( n < 3 ))", //15
      "[[ $limit -gt 3 ]]", //16
      "echo $(( $(cat f) + 1 ))", //17
      "echo ${s:off:2}", //18
      "printenv $V", //19
      "envsubst", //20
      'bash -c "echo $Y"', //21
      "cat <<EOF", //22
      "`date`", //23
      "EOF", //24
      "[[ -v $v ]]", //25
      "x=(1 2); x[k]=3", //26
      "declare -i num; num=other", //27
      "declare -A m; echo ${m[key]}", //28
    );
    const env = await read("s.sh", source, "env");
    // A backtick in a here-document runs a command Kibi does not parse there.
    assert.deepEqual(
      env.lines,
      [
        1, 2, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 16, 17, 18, 19, 20, 21, 23,
        25, 26, 27,
      ],
    );
    assert.ok(env.members.includes("arr"));
    assert.ok(env.members.includes("count"));
    assert.ok(!env.members.includes("key"));
  });

  it("lists the commands a script runs, through wrappers", async () => {
    const source = lines(
      "sudo -E -u root rm -rf /tmp/x", //1
      "env -i PATH=/bin node app.js", //2
      "xargs -0 shred", //3
      "xargs", //4
      "find . -name x -exec chmod 600 {} \\;", //5
      "timeout 5 curl -s https://x", //6
      "nice -10 make", //7
      "/usr/bin/git status", //8
      '"git" log', //9
      "g\\it diff", //10
      "command -v jq", //11
      "time ls", //12
      "flock /tmp/lock cp a b", //13
      "stdbuf -oL grep x", //14
      "sudo --user=root id", //15
      "bash ./run.sh", //16
      "foo() { :; }", //17
      "trap foo EXIT", //18
      "trap - INT", //19
      "exec >log 2>&1", //20
      "nohup setsid sleep 1", //21
      "FOO=bar ./tool.sh", //22
      "echo $(date) `whoami`", //23
      "env -- printf x", //24
      "find . -delete", //25
    );
    const calls = await read("s.sh", source, "calls");
    assert.deepEqual(calls.members, [
      "./tool.sh",
      "/usr/bin/git",
      ":",
      "bash",
      "chmod",
      "command",
      "cp",
      "curl",
      "date",
      "echo",
      "env",
      "exec",
      "find",
      "flock",
      "foo",
      "git",
      "grep",
      "id",
      "ls",
      "make",
      "nice",
      "node",
      "nohup",
      "printf",
      "rm",
      "setsid",
      "shred",
      "sleep",
      "stdbuf",
      "sudo",
      "time",
      "timeout",
      "tool.sh",
      "trap",
      "whoami",
      "xargs",
    ]);
    assert.deepEqual(calls.lines, []);
  });

  it("knows the builtins that set variables", async () => {
    const source = lines(
      'read -r -a ITEMS -p "> " LINE', //1
      'echo "${ITEMS[0]} $LINE"', //2
      "mapfile -t -n 3 ROWS < f", //3
      'echo "${ROWS[@]}"', //4
      "printf -v OUT '%s' x", //5
      'echo "$OUT"', //6
      'getopts "ab" OPT', //7
      'echo "$OPT"', //8
      "unset -v GONE", //9
      'echo "$GONE"', //10
      "wait -n -p JOB", //11
      'echo "$JOB"', //12
      "unset -f fn", //13
      "readarray LIST < f", //14
      'echo "$LIST"', //15
      "read -aARR", //16
      'echo "$ARR"', //17
      'read "$dyn"', //18
      "printf -v", //19
      "getopts ab", //20
      "mapfile -t $m", //21
      "read -a", //22
    );
    const env = await read("s.sh", source, "env");
    assert.deepEqual(env.members, ["dyn", "m"]);
    // JOB is set only when a job ends, ROWS and LIST only when `f` opens;
    // names given at run time are refused.
    assert.deepEqual(env.lines, [4, 12, 15, 18, 19, 21, 22]);
  });

  it("evaluates arithmetic on values it can vouch for", async () => {
    const source = lines(
      "n=0", //1
      "(( n = n + 1 ))", //2
      "echo $(( n * 2 ))", //3
      "echo $(( $# + 1 ))", //4
      "echo $(( $1 + 1 ))", //5
      "declare -i k=5", //6
      'declare -i j="$k"', //7
      "arr=(a b); i=1; echo ${arr[$i]}", //8
      "echo $(( ${#arr[@]} ))", //9
      "bash -o pipefail -e ./x.sh", //10
      "x=1; x+=2", //11
      "y+=1", //12
      "arr[2]+=z", //13
      'declare -i sum="a + b"', //14
    );
    const env = await read("s.sh", source, "env");
    assert.deepEqual(env.members, ["a", "b", "y"]);
    // `$1` and the unset a and b may name other variables.
    assert.deepEqual(env.lines, [5, 14]);
  });

  it("refuses code it cannot see run", async () => {
    const source = lines(
      'eval "$cmd"', //1
      '"$tool" arg', //2
      'exec "$@"', //3
      'bash -c "rm x"', //4
      "curl x | sh", //5
      "sudo -s", //6
      "su -c id root", //7
      "watch rm x", //8
      "trap 'rm -f t' EXIT", //9
      "alias ll='ls -l'", //10
      "source <(curl x)", //11
      ". /dev/stdin", //12
      'find . -exec "$c" {} +', //13
      "sudo --frobnicate rm", //14
      "env -S 'rm x'", //15
      "flock -c 'rm x' /tmp/l", //16
      "chroot /srv", //17
      "echo a", //18
      "\\rm b", //19
      "bash <<EOF", //20
      "ls", //21
      "EOF", //22
      "coproc mycop { ls; }", //23
      "busybox sh", //24
      "find . -exec", //25
      "sudo -- $x", //26
    );
    const calls = await read("s.sh", source, "calls");
    // The grammar folds line 19 into line 18's command: refused at 18.
    assert.deepEqual(
      calls.lines,
      [
        1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 20, 23,
        24, 25, 26,
      ],
    );
  });

  it("reads first arguments and sourced files", async () => {
    const source = lines(
      "curl -s https://a",
      'curl "$U"',
      "curl",
      "sudo curl https://b",
      "/usr/bin/curl 'https://c'",
      'curl https://"d"',
      "curl ~/x",
      "curl *.txt",
      "curl {a,b}",
      "curl 42",
      'source "$(dirname "$0")/lib/common.sh"',
      '. "${BASH_SOURCE%/*}/x.sh"',
      "source ./local.sh",
      'source "$DIR/y.sh"',
      "trap cleanup EXIT",
    );
    const curl = await read("bin/run.sh", source, "string_args", {
      callee: "curl",
    });
    assert.deepEqual(curl.members, [
      "-s",
      "42",
      "https://b",
      "https://c",
      "https://d",
    ]);
    assert.deepEqual(curl.lines, [2, 7, 8, 9]);
    assert.deepEqual(
      (await read("bin/run.sh", source, "string_args", { callee: "trap" }))
        .members,
      ["cleanup"],
    );
    const imports = await read("bin/run.sh", source, "imports");
    assert.deepEqual(imports.members, [
      "./local.sh",
      "bin/lib/common.sh",
      "bin/x.sh",
    ]);
    assert.deepEqual(imports.lines, [14]);
  });

  it("has no errors or properties to read", async () => {
    for (const extract of ["thrown", "property"]) {
      const result = await raw("s.sh", "echo\n", extract, { key: "k" });
      assert.equal(result.status, "unsupported");
      assert.match(result.message, /^Bash has no/);
    }
  });
});

describe("Bash constructs Kibi must not misread", () => {
  const sh = (content, extract = "env", callee = undefined) =>
    read("s.sh", content, extract, callee === undefined ? {} : { callee });

  it("follows wrapper options and namespaces of the second round", async () => {
    for (const [extract, content] of [
      ["calls", 'ip "$o" netns exec ns rm y\n'],
      ["env", "env -i0\n"],
      ["env", "env --version\n"],
    ]) {
      const result = await raw("s.sh", content, extract);
      assert.ok(result.unresolved.length > 0, content);
    }
    assert.deepEqual((await sh("sudo --user=root rm y\n", "calls")).members, [
      "rm",
      "sudo",
    ]);
    assert.deepEqual((await sh("ip -n x link\n", "calls")).members, ["ip"]);
  });

  it("reads the second round of Bash constructs exactly or refuses them", async () => {
    for (const [extract, content] of [
      ["calls", 'args=(-exec rm -rf {} +); find /tmp/c "${args[@]}"\n'],
      ["calls", "bash /dev/stdin <<'EOF'\nrm -rf x\nEOF\n"],
      ["calls", "BASH_ALIASES[c]='rm -rf x'\nc\n"],
      ["calls", "BASH_CMDS[c]=/bin/rm\nc\n"],
      ["calls", "x='$(rm -rf y)'\necho \"${x@P}\"\n"],
      ["calls", "r\\\nm -rf /\n"],
      ["env", "env -0 | grep token\n"],
      ["env", "printenv -0\n"],
      ["env", "g(){ unset HOME; }\nf(){ local HOME=/x; g; echo $HOME; }\nf\n"],
      ["imports", "s=source; $s ./lib.sh\n"],
      ["env", "f(){ local -I X; echo $X; }\n"],
      ["env", "shopt -s localvar_inherit\n"],
      ["env", "fakeroot printenv\n"],
      ["env", "cmd=printenv; $cmd\n"],
      ["env", "cat /proc/thread-self/environ\n"],
      ["env", "cat /proc//self/environ\n"],
      ["env", "ps eww\n"],
      ["calls", "fish -c 'rm x'\n"],
      ["calls", "PS4='$(rm -rf x)'\nset -x\n"],
      ["calls", "echo `echo \\`rm x\\``\n"],
      ["env", "read 'a[IDX]'\n"],
      ["env", "printf -v 'a[IDX]' %s x\n"],
      ["env", "echo ${s:1+OFF:2}\n"],
      ["env", "echo $SECONDS\n"],
      ["env", "awk 'BEGIN{print ENVIRON[\"HOME\"]}'\n"],
      ["calls", "cat <<EOF\nx\nEOF \nrm y\nEOF\n"],
      [
        "env",
        "f(){ declare -A m; m[k]=1; }\ng(){ local m=(); echo ${m[KEY]}; }\n",
      ],
      ["calls", "cat <<EOF\n$[1+2]\nEOF\n"],
    ]) {
      const result = await raw("s.sh", content, extract);
      assert.ok(
        result.status === "failed" ||
          result.unresolved.some((row) => !HOST_ROW.test(row.text)),
        content,
      );
    }
    for (const [extract, content, callee, members] of [
      ["calls", "sudo <<EOF rm -rf /tmp/x\ny\nEOF\n", null, ["rm", "sudo"]],
      [
        "string_args",
        "curl {fd}>/tmp/x https://e/x\n",
        "curl",
        ["https://e/x"],
      ],
      ["calls", "timeout -- 5 rm -rf x\n", null, ["rm", "timeout"]],
      ["calls", "env -- X=1 rm y\n", null, ["env", "rm"]],
      ["calls", "sudo -R /mnt rm y\n", null, ["rm", "sudo"]],
      ["calls", "ip -all netns exec rm y\n", null, ["ip", "rm"]],
      ["calls", "strace -V rm\n", null, ["strace"]],
      ["calls", "sudo --preserve-env=PATH rm x\n", null, ["rm", "sudo"]],
      ["env", "cd --\n", null, ["HOME"]],
      ["env", '[[ $a =~ (x) ]] && echo "${BASH_REMATCH[1]}"\n', null, ["a"]],
      ["env", "ls | wc; echo ${PIPESTATUS[0]}\n", null, []],
      [
        "env",
        "while read -r l || [[ -n $l ]]; do echo $l; done < f\n",
        null,
        [],
      ],
      ["env", 'echo "${X:-~/x}"\n', null, ["X"]],
    ])
      assert.deepEqual(
        await sh(content, extract, callee ?? undefined),
        { members, lines: [], rows: [] },
        content,
      );
  });

  it("reads variables bash only fills in when the environment does not", async () => {
    assert.deepEqual(
      (
        await sh(
          lines(
            'echo "$HOSTNAME"',
            'case "$OSTYPE" in x) ;; esac',
            'echo "$REPLY $OPTARG"',
          ),
        )
      ).members,
      ["HOSTNAME", "OPTARG", "OSTYPE", "REPLY"],
    );
    const shell = await sh(lines('echo "$OLDPWD $SHLVL"'));
    assert.deepEqual([shell.members, shell.lines], [[], [1]]);
  });

  it("reads HOME through a tilde", async () => {
    for (const content of [
      lines("cp x ~/.config/a"),
      lines("cd"),
      lines("PATH=~/bin:$PATH"),
      lines("X=a:~/b"),
      lines("~/bin/tool"),
      lines("for d in ~/a; do :; done"),
      lines("a=(~/x)"),
      lines("a=([1]=~/y)"),
    ])
      assert.ok((await sh(content)).members.includes("HOME"), content);
    for (const content of [
      lines('echo ~"/d"'),
      lines("echo $x~/e"),
      lines("echo \\~/f"),
      lines("echo '~/g'"),
      lines("echo a~/h"),
    ])
      assert.ok(!(await sh(content)).members.includes("HOME"), content);
    // `~-` is OLDPWD, which bash may set; `make P=~/x` expands only in bash.
    assert.deepEqual((await sh(lines("cd ~-"))).lines, [1]);
    assert.deepEqual((await sh(lines("make P=~/c"))).lines, [1]);
  });

  it("reads the names that test -v checks", async () => {
    const env = await sh(
      lines(
        "[[ -v DEBUG && -n x ]]",
        "[[ ! -v TRACE ]]",
        "test -v VERBOSE",
        "[ -v QUIET ]",
        "[ -v ]",
      ),
    );
    assert.deepEqual(env.members, ["DEBUG", "QUIET", "TRACE", "VERBOSE"]);
    assert.deepEqual(env.lines, []);
  });

  it("evaluates [[ -lt ]] operands and array indexes as arithmetic", async () => {
    for (const [content, name] of [
      [lines("n=1", "[[ $n -gt 0 && $n -lt MAX_RETRIES ]]"), "MAX_RETRIES"],
      [lines("f() { local arr[SLOT]=1; }"), "SLOT"],
      [lines("arr=([SLOT]=v [3]=w x)"), "SLOT"],
      [lines("unset a[IDX]"), "IDX"],
      [lines("unset 'a[IDX]'"), "IDX"],
    ]) {
      const env = await sh(content);
      assert.deepEqual(env.members, [name], content);
      assert.ok(env.lines.length > 0, content);
    }
    // `[ ]` compares text, an associative key is text.
    assert.deepEqual(await sh(lines("[ 1 -lt N ]")), {
      members: [],
      lines: [],
      rows: [],
    });
    assert.deepEqual(await sh(lines("declare -A m=([K]=v)", "unset m[J]")), {
      members: [],
      lines: [],
      rows: [],
    });
    // Loop values that are all numbers are safe to evaluate.
    assert.deepEqual(
      (await sh(lines("sum=0", "for i in 1 2 3; do (( sum += i )); done")))
        .lines,
      [],
    );
  });

  it("does not trust assignments that may not run", async () => {
    for (const content of [
      lines("LOGDIR=/x &", 'echo "$LOGDIR"'),
      lines("read -r VERSION < /etc/app/version", 'echo "$VERSION"'),
      lines(
        'g(){ unset HOME; echo "$HOME"; }',
        "f(){ local HOME=/srv; g; }",
        "f",
      ),
    ]) {
      const env = await sh(content);
      assert.deepEqual(env.members, [], content);
      assert.ok(env.lines.length > 0, content);
    }
    // `local` outside a function fails.
    assert.deepEqual(
      (await sh(lines("local CONF=/x", 'echo "$CONF"'))).members,
      ["CONF"],
    );
    // Redirections Kibi can vouch for keep the assignment.
    assert.deepEqual(
      await sh(
        lines("read -r X <<< 1", "read -r Y < /dev/null", 'echo "$X $Y"'),
      ),
      { members: [], lines: [], rows: [] },
    );
  });

  it("refuses code it cannot see for env", async () => {
    for (const content of [
      lines("tr '\\0' '\\n' < /proc/self/environ"),
      lines('cat "/proc/$$/environ"'),
      lines("alias show='echo $API_TOKEN'", "show"),
      lines("builtin declare -n ref=SECRET_KEY", 'echo "$ref"'),
      lines("builtin source /etc/app/overrides.sh"),
      lines('unset "$v"'),
      lines("gosu app bash -c 'echo $X'"),
    ])
      assert.ok((await sh(content)).lines.includes(1), content);
    assert.deepEqual(await sh(lines("gosu app server")), {
      members: [],
      lines: [],
      rows: [],
    });
  });

  it("knows what unset, read and here-documents leave", async () => {
    for (const content of [
      lines('unset "TMPDIR"', 'echo "${TMPDIR:-/tmp}"'),
      lines("cat <<E\\OF", "$HOME", "EOF"),
      lines("command read -r LINE", 'echo "$LINE"'),
      lines('read -rp "> " answer', 'echo "$answer"'),
      lines("read", 'echo "$REPLY"'),
      lines('select c in a b; do echo "$REPLY"; done'),
    ])
      assert.deepEqual(
        await sh(content),
        { members: [], lines: [], rows: [] },
        content,
      );
  });

  it("follows sourced files through command and builtin", async () => {
    assert.deepEqual(
      (
        await sh(
          lines(
            "builtin source /etc/app/overrides.sh",
            "command . ./local.sh",
            "source -- ./lib.sh",
            "gosu app server",
          ),
          "imports",
        )
      ).members,
      ["./lib.sh", "./local.sh", "/etc/app/overrides.sh"],
    );
  });

  it("follows the commands wrappers run", async () => {
    for (const [content, expected] of [
      [
        lines("find . -exec chmod {} \\; -exec rm -f {} \\;"),
        ["chmod", "find", "rm"],
      ],
      [lines("xargs -0 < list rm -f"), ["rm", "xargs"]],
      [lines("sudo 2>/dev/null rm x"), ["rm", "sudo"]],
      [lines("busybox rm x"), ["busybox", "rm"]],
      [lines("ip netns exec ns rm x"), ["ip", "rm"]],
      [lines("trap -- cleanup EXIT"), ["cleanup", "trap"]],
      [lines("sudo -nE rm x"), ["rm", "sudo"]],
    ])
      assert.deepEqual(
        await sh(content, "calls"),
        { members: expected, lines: [], rows: [] },
        content,
      );
  });

  it("refuses commands that run code Kibi cannot follow", async () => {
    for (const content of [
      lines('bash -Ec "rm x"'),
      lines('sh -Cc "rm x"'),
      lines('nohup >/dev/null 2>&1 bash -c "rm"'),
      lines('sudo su - app -c "rm"'),
      lines('sudo watch "rm"'),
      lines('command eval "rm -rf /tmp/cache"'),
      lines("runuser -u u -- rm x"),
      lines('script -qc "rm" /dev/null'),
      lines('mapfile -t -C "rm -rf" -c 1 lines'),
      lines("hash -p /bin/rm ls"),
    ])
      assert.deepEqual((await sh(content, "calls")).lines, [1], content);
  });

  it("covers the rest of the wrapper and binding rules", async () => {
    const none = { members: [], lines: [], rows: [] };
    assert.deepEqual(await sh(lines("read -r -- X", 'echo "$X"')), none);
    assert.deepEqual(await sh(lines('f() { local X; echo "$X"; }')), none);
    assert.deepEqual(
      (await sh(lines('while true; do echo "$X"; X=1; done'))).lines,
      [1],
    );
    for (const content of [
      lines('busybox "$x" rm'),
      lines('ip netns exec ns "$cmd"'),
      lines("find . -name x $op rm {} ;"),
      lines("env env env env env env env env env rm"),
    ])
      assert.deepEqual((await sh(content, "calls")).lines, [1], content);
    assert.deepEqual(await sh(lines('find "$dir" -type f -delete'), "calls"), {
      members: ["find"],
      lines: [],
      rows: [],
    });
    assert.deepEqual((await sh(lines("nice -n-5 rm x"), "calls")).members, [
      "nice",
      "rm",
    ]);
  });

  it("reads first arguments past redirections and refuses ones from input", async () => {
    assert.deepEqual(
      await sh(
        lines("curl >out.html https://trusted.example/x"),
        "string_args",
        "curl",
      ),
      {
        members: ["https://trusted.example/x"],
        lines: [],
        rows: [],
      },
    );
    assert.deepEqual(
      (await sh(lines("rm 2>/dev/null -rf x"), "string_args", "rm")).members,
      ["-rf"],
    );
    assert.deepEqual(
      (await sh(lines("cat urls | xargs curl"), "string_args", "curl")).lines,
      [1],
    );
    assert.deepEqual(
      (await sh(lines("find . -exec curl {} \\;"), "string_args", "curl"))
        .lines,
      [1],
    );
  });
});

describe("PHP reference reader", () => {
  const source = lines(
    "<?php", //1
    "namespace App\\Svc;", //2
    "use Foo\\Bar as Baz, Foo\\Qux;", //3
    "use function Foo\\helper as h;", //4
    "use const Foo\\X;", //5
    "use Grp\\{One, Two as T};", //6
    "require_once __DIR__ . '/vendor/autoload.php';", //7
    "include 'conf.php';", //8
    "$a = \\getenv('A');", //9
    "$b = $_ENV['B'] ?? null;", //10
    '$c = $_SERVER["C"];', //11
    '$d = \\GETENV("D");', //12
    "$e = filter_input(INPUT_ENV, 'E');", //13
    "\\exec('ls');", //14
    "$obj->run();", //15
    "Baz::make();", //16
    "h();", //17
    "\\array_map('trim', $xs);", //18
    "\\call_user_func([Qux::class, 'go']);", //19
    "echo `whoami`;", //20
    "function local_fn() {}", //21
    "local_fn();", //22
    "class C extends Baz { function m() { $this->n(); self::s(); parent::p(); static::q(); } }", //23
    "$o = ['mode' => 'strict', 'n' => -2, 'k' => Qux::class];", //24
    "new Qux(mode: 'loose');", //25
    "exit(1);", //26
  );

  it("reads environment variables by name", async () => {
    const env = await read("src/a.php", source, "env");
    assert.deepEqual(env.members, ["A", "B", "C", "D", "E"]);
    assert.deepEqual(env.lines, []);
  });

  it("names calls through the namespace and imports", async () => {
    const calls = await read("src/a.php", source, "calls");
    assert.deepEqual(calls.members, [
      "*.n",
      "*.q",
      "*.run",
      "App\\Svc\\C::s",
      "Foo\\Bar::make",
      "Foo\\Bar::p",
      "Foo\\Qux::go",
      "app\\svc\\local_fn",
      "array_map",
      "call_user_func",
      "die",
      "exec",
      "exit",
      "filter_input",
      "foo\\helper",
      "getenv",
      "shell_exec",
      "trim",
    ]);
    assert.deepEqual(calls.lines, []);
  });

  it("lists imports and included files", async () => {
    const imports = await read("src/a.php", source, "imports");
    assert.deepEqual(imports.members, [
      "Foo\\Bar",
      "Foo\\Qux",
      "Foo\\X",
      "Foo\\helper",
      "Grp\\One",
      "Grp\\Two",
      "conf.php",
      "src/vendor/autoload.php",
    ]);
  });

  it("reads keyed values, named arguments and defaults", async () => {
    assert.deepEqual(
      (await read("src/a.php", source, "property", { key: "mode" })).members,
      ["loose", "strict"],
    );
    assert.deepEqual(
      (await read("src/a.php", source, "property", { key: "n" })).members,
      ["-2"],
    );
    assert.deepEqual(
      (await read("src/a.php", source, "property", { key: "k" })).members,
      ["Foo\\Qux"],
    );
  });

  it("marks unqualified calls another namespace file may declare", async () => {
    const namespaced = lines(
      "<?php",
      "namespace App;",
      "getenv('X');",
      "strlen('y');",
    );
    const env = await read("a.php", namespaced, "env");
    assert.deepEqual(env.members, ["X"]);
    assert.deepEqual(env.rows, [
      "getenv may be a function of namespace App: getenv('X')",
    ]);
    const calls = await read("a.php", namespaced, "calls");
    assert.deepEqual(calls.rows.length, 2);
  });

  it("refuses targets and names computed at run time", async () => {
    const dynamic = lines(
      "<?php", //1
      "$f('X');", //2
      "$o->$m();", //3
      "X::$sm();", //4
      "call_user_func($cb);", //5
      "eval('1;');", //6
      "getenv($name);", //7
      "getenv();", //8
      "foreach ($_ENV as $k => $v) {}", //9
      "$_SERVER[$k];", //10
      "$GLOBALS['_ENV'];", //11
      "$$n = 1;", //12
      "$g = 'getenv';", //13
      "create_function('', 'x');", //14
      "filter_input_array(INPUT_ENV);", //15
      "$v = get_defined_vars();", //16
      "assert('1 == 1');", //17
      "array_map('getenv', $xs);", //18
      "('getenv')('Y');", //19
    );
    const env = await read("a.php", dynamic, "env");
    assert.deepEqual(
      env.lines,
      // `X::$sm()` may be Env::get.
      [2, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19],
    );
    const calls = await read("a.php", dynamic, "calls");
    assert.deepEqual(calls.lines, [2, 3, 4, 5, 6, 14, 17]);
  });

  it("reads literals, block namespaces and relative names", async () => {
    const more = lines(
      "<?php", //1
      "namespace Lib { function own() {} own(); }", //2
      "namespace App {", //3
      "  use Lib\\Sub;", //4
      '  getenv("ESC\\x41\\101\\u{42}\\t");', //5
      '  getenv("BAD\\q");', //6
      "  $a = ['i' => 1_000, 'f' => 1.5, 'b' => TRUE, 'z' => NULL, 'p' => ('x'), 'm' => -1.5];", //7
      "  Sub\\Deep::run();", //8
      "  namespace\\helper();", //9
      "  \\Full\\Name::go();", //10
      "  Other\\fn();", //11
      "  filter_input(INPUT_GET, 'q');", //12
      "  filter_input($src, 'q');", //13
      "  class K { public $mode = 'x'; const MODE = 'y'; public $other; var $w = $z; }", //14
      "  $k = [$key => 1, ...$rest];", //15
      "}", //16
    );
    const env = await read("a.php", more, "env");
    // PHP keeps an escape it does not know as written.
    assert.deepEqual(env.members, ["BAD\\q", "ESCAAB\t"]);
    assert.deepEqual(env.lines, [13]);
    const calls = await read("a.php", more, "calls");
    for (const name of [
      "lib\\own",
      "Lib\\Sub\\Deep::run",
      "app\\helper",
      "Full\\Name::go",
      "app\\other\\fn",
    ])
      assert.ok(calls.members.includes(name), name);
    for (const [key, value] of [
      ["i", "1000"],
      ["f", "1.5"],
      ["b", "true"],
      ["z", "null"],
      ["p", "x"],
      ["m", "-1.5"],
      ["mode", "x"],
      ["MODE", "y"],
    ])
      assert.deepEqual(
        (await read("a.php", more, "property", { key })).members,
        [value],
        key,
      );
    assert.deepEqual(
      (await read("a.php", more, "property", { key: "w" })).lines,
      [14, 15],
    );
  });

  it("names thrown classes and factories", async () => {
    const thrown = lines(
      "<?php",
      "namespace App;",
      "use Lib\\Err;",
      "throw new \\RuntimeException('x');",
      "throw new Err();",
      "throw Err::create();",
      "try { x(); } catch (\\Exception $e) { throw $e; }",
      "throw $other;",
      "throw new $cls;",
      "$f = fn() => throw new Local();",
    );
    const result = await read("a.php", thrown, "thrown");
    assert.deepEqual(result.members, [
      "App\\Local",
      "Lib\\Err",
      "Lib\\Err::create",
      "RuntimeException",
    ]);
    assert.deepEqual(result.lines, [8, 9]);
  });

  it("reads first arguments of a callee", async () => {
    const args = lines(
      "<?php",
      "exec('ls -l');",
      'EXEC("id");',
      "exec($cmd);",
      "exec('a' . 'b');",
      "echo `uptime`;",
    );
    const exec = await read("a.php", args, "string_args", { callee: "exec" });
    assert.deepEqual(exec.members, ["ab", "id", "ls -l"]);
    assert.deepEqual(exec.lines, [4]);
    const shell = await read("a.php", args, "string_args", {
      callee: "shell_exec",
    });
    assert.deepEqual(shell.members, ["uptime"]);
  });
});

describe("PHP constructs Kibi must not misread", () => {
  const php = (body, extract, options = {}) =>
    read(options.path ?? "src/a.php", `<?php\n${body}\n`, extract, options);
  const ok = (members) => ({ members, lines: [], rows: [] });

  it("reads constants, writes after initialisation and promoted defaults", async () => {
    for (const [body, key, expected] of [
      ["define('DB_HOST', '127.0.0.1');", "DB_HOST", ["127.0.0.1"]],
      [
        "$o = ['acl' => 'private'];\n$o['acl'] = 'public-read';",
        "acl",
        ["private", "public-read"],
      ],
      [
        "class S { public $acl = 'private'; function f() { $this->acl = 'public-read'; } }",
        "acl",
        ["private", "public-read"],
      ],
      ["self::$acl = 'x';", "acl", ["x"]],
      ["$a['b']['acl'] = 'x';", "acl", ["x"]],
      [
        "class C { function __construct(public string $acl = 'private') {} }",
        "acl",
        ["private"],
      ],
      [
        "enum Acl: string { case Private = 'private'; }",
        "Private",
        ["private"],
      ],
      ["$a = ['x', 'y', 5 => 'z', 'w'];", "6", ["w"]],
      ["$a = ['acl' => <<<'N'\n  raw $x\n  N\n];", "acl", ["raw $x"]],
      ["$a = ['acl' => <<<N\n\n  a\n    b\n  N\n];", "acl", ["\na\n  b"]],
      [
        "$o = [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, CURLOPT_URL => 'x'];",
        "db",
        [],
      ],
    ])
      assert.deepEqual(
        await php(body, "property", { key }),
        ok(expected),
        body,
      );
  });

  it("compares numbers by value", async () => {
    const body =
      "$c = ['a' => 0x1F90, 'b' => 0755, 'c' => 1.50, 'd' => 1e3, 'e' => 0o17, 'f' => 0b11, 'g' => -0x10, 'h' => -0.0, 'i' => 1_000];";
    for (const [key, value] of [
      ["a", "8080"],
      ["b", "493"],
      ["c", "1.5"],
      ["d", "1000"],
      ["e", "15"],
      ["f", "3"],
      ["g", "-16"],
      ["h", "0"],
      ["i", "1000"],
    ])
      assert.deepEqual(
        (await php(body, "property", { key })).members,
        [value],
        key,
      );
    // Past the integer range PHP reads a float Kibi does not round.
    assert.deepEqual(
      (
        await php(
          "$c = ['h' => 0xFFFFFFFFFFFFFFFF, 'p' => 3.14159265358979323];",
          "property",
          { key: "h" },
        )
      ).lines,
      [2],
    );
    assert.deepEqual(
      (
        await php("$c = ['p' => 3.14159265358979323];", "property", {
          key: "p",
        })
      ).lines,
      [2],
    );
  });

  it("refuses property values it cannot vouch for", async () => {
    for (const [body, key] of [
      ["$a = array_merge(['acl' => 'private'], $x);", "acl"],
      ["$a = ['acl' => 'x'] + $defaults;", "acl"],
      ["$a = ['acl' => 'private', 'acl' => 'public-read'];", "acl"],
      ["$a = [true => 'yes', 1.7 => 'float'];", "1"],
      ["$acl = 'x'; upload(compact('acl'));", "acl"],
      ["$a['acl'] .= 'x';", "acl"],
      ["$a[$k] = 'x';", "acl"],
      ["$o->$k = 'y';", "acl"],
      ["$a[] = 'x';", "0"],
      ["define($name, 'x');", "acl"],
    ])
      assert.deepEqual((await php(body, "property", { key })).lines, [2], body);
    assert.deepEqual(
      await php("$a = array_merge(['other' => 1], $x);", "property", {
        key: "acl",
      }),
      ok([]),
    );
  });

  it("refuses reflection and reads callables builtins are handed", async () => {
    assert.deepEqual(
      (await php("(new ReflectionFunction('system'))->invoke('id');", "calls"))
        .lines,
      [2],
    );
    assert.ok(
      (
        await php("$f = new \\ReflectionFunction('get'.'env');", "env")
      ).lines.includes(2),
    );
    assert.deepEqual(
      (
        await php(
          lines(
            "pcntl_signal(SIGTERM, 'cleanup');",
            "preg_replace_callback_array(['/x/' => 'system'], $s);",
            "array_find($a, 'passthru');",
            "session_set_save_handler('open_h', 'close_h');",
            "curl_setopt($ch, CURLOPT_WRITEFUNCTION, 'writer');",
            "array_udiff_uassoc($a, $b, 'vcmp', 'kcmp');",
            "$f = new Fiber('task');",
            "die('bye');",
          ),
          "calls",
        )
      ).members,
      [
        "array_find",
        "array_udiff_uassoc",
        "cleanup",
        "close_h",
        "curl_setopt",
        "die",
        "exit",
        "kcmp",
        "open_h",
        "passthru",
        "pcntl_signal",
        "preg_replace_callback_array",
        "session_set_save_handler",
        "system",
        "task",
        "vcmp",
        "writer",
      ],
    );
    assert.deepEqual(
      (await php("curl_setopt($ch, $option, $value);", "calls")).lines,
      [2],
    );
    assert.deepEqual((await php("array_map(...$args);", "calls")).lines, [2]);
    assert.deepEqual(
      (
        await php(
          "class Job { function run() { array_map(['self', 'purge'], []); array_map([static::class, 'y'], []); } }",
          "calls",
        )
      ).members,
      ["*.y", "Job::purge", "array_map"],
    );
  });

  it("reads first arguments only where the call is certainly the callee", async () => {
    for (const [body, callee] of [
      ["exec(command: 'rm -rf /tmp/cache');", "exec"],
      ["exec(...$args);", "exec"],
      ["$this->db->prepare('DELETE FROM song');", "PDO::prepare"],
      ["$this->db->prepare('DELETE FROM song');", "prepare"],
      ["array_map('exec', $commands);", "exec"],
    ])
      assert.deepEqual(
        (await php(body, "string_args", { callee })).lines,
        [2],
        body,
      );
    assert.deepEqual(
      await php("exit('bye'); die('x');", "string_args", { callee: "exit" }),
      ok(["bye", "x"]),
    );
    // `strlen(...)` is a callable of the callee, called with unseen arguments.
    assert.deepEqual(
      (await php("$s = strlen(...);", "string_args", { callee: "strlen" }))
        .lines,
      [2],
    );
  });

  it("reads the second round of PHP constructs exactly or refuses them", async () => {
    // `die` and `exit` are one construct.
    assert.deepEqual(
      (
        await php("die('Database connection failed');", "string_args", {
          callee: "die",
        })
      ).members,
      ["Database connection failed"],
    );
    assert.deepEqual((await php("die('x');", "calls")).members, [
      "die",
      "exit",
    ]);
    // A CRLF heredoc ends before its `\r\n`.
    assert.deepEqual(
      (
        await read(
          "src/a.php",
          "<?php\r\n$o = ['acl' => <<<EOT\r\npublic-read\r\nEOT];\r\n",
          "property",
          { key: "acl" },
        )
      ).members,
      ["public-read"],
    );
    for (const [body, extract, options] of [
      // A class computed at run time may be Reflection.
      ["$f = new $cls('system'); $f->invoke();", "calls"],
      ["$f = new ('Reflection' . 'Function')('passthru');", "calls"],
      ["ReflectionMethod::createFromMethodName('A::m');", "calls"],
      // The catch variable rebound without an assignment in the catch.
      [
        "function g() { $f = function () use (&$e) { $e = new \\LogicException; }; try { x(); } catch (\\RuntimeException $e) { $f(); throw $e; } }",
        "thrown",
      ],
      [
        "function g() { try { x(); } catch (\\RuntimeException $e) { extract(['e' => 1]); throw $e; } }",
        "thrown",
      ],
      [
        "try { x(); } catch (\\RuntimeException $e) { log_it(); throw $e; }",
        "thrown",
      ],
      // Writes Kibi does not follow.
      [
        "$o = ['acl' => 'private']; $r = &$o['acl']; $r = 'public-read';",
        "property",
        { key: "acl" },
      ],
      [
        "$o = ['acl' => 'private']; foreach ($o as &$v) { $v = 'x'; }",
        "property",
        { key: "acl" },
      ],
      [
        "$o = ['acl' => 'private']; array_walk($o, function (&$v) { $v = 'x'; });",
        "property",
        { key: "acl" },
      ],
      [
        "$o = ['acl' => 'private']; [$o['acl']] = ['x'];",
        "property",
        { key: "acl" },
      ],
      ["$c = ['port' => 80]; $c['port']++;", "property", { key: "port" }],
      [
        "$o = ['acl' => 'private']; unset($o['acl']);",
        "property",
        { key: "acl" },
      ],
      ["$o = load(); $o += ['acl' => 'private'];", "property", { key: "acl" }],
      [
        "$o = array_merge(['acl' => 'a'], ['acl' => 'b']);",
        "property",
        { key: "acl" },
      ],
      ["$o = array_merge(['acl' => 'a'], $more);", "property", { key: "acl" }],
      ["$o = array_fill_keys(['acl'], 'x');", "property", { key: "acl" }],
      ["$o = [-5 => 'a', 'b'];", "property", { key: "-4" }],
    ])
      assert.ok((await php(body, extract, options)).lines.length > 0, body);
    // Callbacks of builtin classes.
    for (const body of [
      "new CallbackFilterIterator($it, 'unlink');",
      "$a->uasort('system');",
      "$db->createFunction('f', 'system');",
      "assert_options(ASSERT_CALLBACK, 'passthru');",
    ])
      assert.ok(
        (await php(body, "calls")).members.some((name) =>
          ["unlink", "system", "passthru"].includes(name),
        ),
        body,
      );
    // `parent` in an anonymous class, `self` in a trait (the using class).
    assert.deepEqual(
      (
        await php(
          "class O extends \\B { function f() { return new class extends \\Other { function g() { parent::boot(); } }; } }",
          "calls",
        )
      ).members,
      ["Other::boot"],
    );
    assert.deepEqual(
      (await php("trait T { function f() { self::purge(); } }", "calls"))
        .members,
      ["*.purge"],
    );
    // A static getter called on an instance of a subclass.
    assert.deepEqual(
      (
        await php(
          "class C extends \\Illuminate\\Support\\Env { function f() { return $this->get('DB_HOST'); } }",
          "env",
        )
      ).members,
      ["DB_HOST"],
    );
    // Env getters on objects the code names, and on objects it does not.
    for (const [body, members, refused] of [
      ["(new \\Illuminate\\Support\\Env)->get('A');", ["A"], false],
      [
        "class C extends \\Illuminate\\Support\\Env { function f() { return (new self)->get('B'); } }",
        ["B"],
        false,
      ],
      [
        "class C extends \\Illuminate\\Support\\Env { function f() { return (new static)->get('B'); } }",
        [],
        true,
      ],
      ["trait T { function f() { return $this->get('C'); } }", [], true],
      ["(new $cls)->get('D');", [], true],
      ["$repo->get('E');", [], false],
    ]) {
      const result = await php(body, "env");
      assert.deepEqual(
        [result.members, result.lines.length > 0],
        [members, refused],
        body,
      );
    }
    assert.deepEqual(
      (
        await php(
          "function g() { try { x(); } catch (\\RuntimeException $e) { $copy = $e; throw $e; } }",
          "thrown",
        )
      ).lines,
      [2],
    );
    // What is still read exactly.
    assert.deepEqual(
      (
        await php("$o = array_merge($defaults, ['acl' => 'b']);", "property", {
          key: "acl",
        })
      ).members,
      ["b"],
    );
    assert.deepEqual(
      (
        await php("define(value: 'v', constant_name: 'K');", "property", {
          key: "K",
        })
      ).members,
      ["v"],
    );
    assert.deepEqual(
      (
        await php("$x = ['k' => 'a' . null . true . false];", "property", {
          key: "k",
        })
      ).members,
      ["a1"],
    );
    assert.deepEqual(
      (await php("$a = new static(); $b = new self();", "calls")).lines,
      [],
    );
    assert.deepEqual(
      (await php("include 'data://text/plain,x';", "imports")).lines,
      [2],
    );
  });

  it("trusts a catch variable only while it holds the caught exception", async () => {
    for (const body of [
      "try { x(); } catch (\\RuntimeException $e) { $e = new \\LogicException('w'); throw $e; }",
      "try { x(); } catch (\\Throwable $e) { foreach (errs() as $e) throw $e; }",
      "try { x(); } catch (\\Throwable $e) { $f = function () { $e = new \\DomainException; throw $e; }; }",
      "try { x(); } catch (\\Throwable $e) { $f = function () use (&$e) { $e = null; }; throw $e; }",
      "function g() { try { x(); } catch (\\Throwable $e) { report($e); throw $e; } }",
      "function g() { try { x(); } catch (\\Throwable $e) { include 'h.inc'; throw $e; } }",
    ])
      assert.deepEqual((await php(body, "thrown")).lines, [2], body);
    assert.deepEqual(
      await php(
        "function g() { try { x(); } catch (\\Throwable $e) { error_log($e); throw new \\RuntimeException('w', 0, $e); Log::error($e->getMessage(), ['e' => $e]); if ($e instanceof \\X) {} throw $e; } }",
        "thrown",
      ),
      ok(["RuntimeException"]),
    );
    assert.deepEqual(
      (
        await php(
          "class E extends \\Exception { static function make() { throw new static('x'); } }",
          "thrown",
        )
      ).lines,
      [2],
    );
    assert.deepEqual(
      await php(
        "class E extends \\Exception { static function make() { throw new self('x'); } }",
        "thrown",
      ),
      ok(["E"]),
    );
  });

  it("reads Laravel's environment class through subclasses", async () => {
    const env = "use Illuminate\\Support\\Env;\n";
    assert.deepEqual(
      await php(
        `${env}class Config extends Env {}\nConfig::get('DB_HOST');`,
        "env",
      ),
      ok(["DB_HOST"]),
    );
    assert.deepEqual(
      await php(`${env}Env::getOrFail('DB_PASSWORD');`, "env"),
      ok(["DB_PASSWORD"]),
    );
    assert.deepEqual(
      await php(
        "class Local { static function get($k) {} }\nLocal::get('k');",
        "env",
      ),
      ok([]),
    );
    for (const body of [
      `${env}$cls = Env::class; $cls::get('DB_USER');`,
      `${env}class AppEnv extends Env { static function h() { return static::get('APP_HOST'); } }`,
      `${env}Env::getRepository()->get('X');`,
    ])
      assert.deepEqual((await php(body, "env")).lines, [3], body);
    // A class of another file, and a callable's class, may extend it: the
    // host drops the row once the project does not name the class.
    const row = await php(
      "Cache::get('k');\ncall_user_func_array([$this->c, $this->a], []);",
      "env",
    );
    assert.deepEqual([row.members, row.lines], [[], []]);
    assert.equal(row.rows.length, 2);
    for (const body of [
      "$f = 'env'; $f('APP_KEY');",
      "(new ReflectionFunction('env'))->invoke('APP_KEY');",
    ])
      assert.ok((await php(body, "env")).lines.includes(2), body);
    assert.deepEqual(
      await php("$cfg = ['env' => 'production']; getenv('env');", "env"),
      ok(["env"]),
    );
  });

  it("covers the rest of the key, callable and getter rules", async () => {
    assert.deepEqual(
      (await php("$c = ['k' => -X];", "property", { key: "k" })).lines,
      [2],
    );
    assert.deepEqual(
      await php("$c = ['k' => 0B11];", "property", { key: "k" }),
      ok(["3"]),
    );
    assert.deepEqual(
      await php("$c = [null => 'n', -1 => 'm'];", "property", { key: "" }),
      ok(["n"]),
    );
    assert.deepEqual(
      await php("$c = [null => 'n', -1 => 'm'];", "property", { key: "-1" }),
      ok(["m"]),
    );
    assert.deepEqual(
      (
        await php(
          "class Job { function run() { array_map('self::purge', []); array_map('static::x', []); } }",
          "calls",
        )
      ).members,
      ["*.x", "Job::purge", "array_map"],
    );
    assert.deepEqual(
      await php("array_map(strlen(...), $a);", "calls"),
      ok(["array_map", "strlen"]),
    );
    assert.deepEqual(
      (
        await php("array_map([$o, 'exec'], $x);", "string_args", {
          callee: "exec",
        })
      ).lines,
      [2],
    );
    for (const body of [
      "preg_replace_callback_array($map, $s);",
      "curl_setopt_array($ch, $options);",
      "curl_setopt_array($ch, [CURLOPT_URL => 'x', 'y']);",
    ])
      assert.deepEqual((await php(body, "calls")).lines, [2], body);
    assert.deepEqual(
      (
        await php(
          "curl_setopt_array($ch, [CURLOPT_URL => 'x', CURLOPT_WRITEFUNCTION => 'w']);",
          "calls",
        )
      ).members,
      ["curl_setopt_array", "w"],
    );
    assert.deepEqual(await php("$a['env'];", "env"), ok([]));
  });

  it("applies imports from where they are and reads more include paths", async () => {
    assert.deepEqual(
      (
        await php(
          "namespace App;\nFoo::bar();\nuse Lib\\Foo;\nFoo::baz();",
          "calls",
        )
      ).members,
      ["App\\Foo::bar", "Lib\\Foo::baz"],
    );
    assert.deepEqual(
      await php(
        "require __DIR__ . '/../lib/' . 'helpers.inc';\nrequire dirname(__DIR__) . '/x.php';\nrequire __dir__ . '/y.php';\nrequire dirname(__FILE__, 2) . '/z.php';",
        "imports",
      ),
      ok(["lib/helpers.inc", "src/y.php", "x.php", "z.php"]),
    );
    assert.deepEqual(
      await php('echo "home $_SERVER[HOME]";', "env"),
      ok(["HOME"]),
    );
  });
});

describe("C reference reader", () => {
  const source = lines(
    "#include <stdio.h>", //1
    "#include <stdlib.h>", //2
    '#define LOG(x) printf("%s", x)', //3
    "#define CMD system", //4
    "static int cmp(const void *a, const void *b);", //5
    "struct opts { const char *mode; int n; };", //6
    "int main(void) {", //7
    '  char *h = getenv("HOME");', //8
    '  const char *s = secure_getenv("SE" "CRET");', //9
    '  LOG("x");', //10
    '  CMD("id");', //11
    "  ops->run(1);", //12
    "  int xs[3] = {3, 1, 2};", //13
    "  qsort(xs, 3, sizeof(int), cmp);", //14
    '  struct opts o = { .mode = "strict", .n = 2 };', //15
    "  atexit(cleanup);", //16
    '  fputs("x", stdout);', //17
    "  exit(1);", //18
    "}", //19
  );

  it("reads environment variables by name", async () => {
    const env = await read("src/a.c", source, "env");
    assert.deepEqual(env.members, ["HOME", "SECRET"]);
    // `ops->run` calls through a function pointer, which may be getenv.
    assert.deepEqual(env.lines, [12]);
  });

  it("lists calls, macro expansions and functions handed on", async () => {
    const calls = await read("src/a.c", source, "calls");
    assert.deepEqual(calls.members, [
      "CMD",
      "LOG",
      "atexit",
      "cleanup",
      "cmp",
      "exit",
      "fputs",
      "getenv",
      "printf",
      "qsort",
      "secure_getenv",
      "system",
    ]);
    assert.deepEqual(calls.lines, [12]);
  });

  it("lists includes and reads designated initializers", async () => {
    assert.deepEqual((await read("src/a.c", source, "imports")).members, [
      "stdio.h",
      "stdlib.h",
    ]);
    const mode = await read("src/a.c", source, "property", { key: "mode" });
    assert.deepEqual(mode.members, ["strict"]);
    assert.deepEqual(mode.lines, []);
  });

  it("refuses what the preprocessor or a pointer decides", async () => {
    const tricky = lines(
      '#include "local.h"', //1
      "#ifdef DEBUG", //2
      "#define TRACE(x) system(x)", //3
      "#endif", //4
      "#define CAT(a, b) a##b", //5
      "#define GE getenv", //6
      "#define getenv my_getenv", //7
      "extern char **environ;", //8
      "int main(int argc, char **argv, char **envp) {", //9
      "  int (*fp)(const char *) = system;", //10
      '  fp("ls");', //11
      '  TRACE("x");', //12
      '  CAT(sys, tem)("id");', //13
      '  GE("A");', //14
      '  getenv("NOT_ENV");', //15
      "  char **e = environ;", //16
      "#ifdef _WIN32", //17
      '  _putenv("X=1");', //18
      "#endif", //19
      '  (*fp)("x");', //20
      "  tbl[0]();", //21
      "  getenv(name);", //22
      "  return 0;", //23
      "}", //24
      "#include MACRO_H", //25
    );
    const env = await read("src/a.c", tricky, "env");
    assert.deepEqual(env.members, []);
    // After `#define getenv my_getenv`, GE("A") and getenv(name) call my_getenv.
    assert.deepEqual(env.lines, [9, 11, 12, 13, 16, 20, 21, 25]);
    assert.match(
      env.rows[0],
      /^local\.h may define macros or function pointers this file uses: /,
    );
    const calls = await read("src/a.c", tricky, "calls");
    assert.deepEqual(calls.lines, [11, 12, 13, 17, 20, 21, 25]);
    assert.ok(calls.members.includes("my_getenv"));
    assert.ok(calls.members.includes("system"));
  });

  it("reads escapes, literals, enums and #undef", async () => {
    const more = lines(
      "enum mode { FAST, SLOW };", //1
      "#define DEF_CMD run_default()", //2
      "#define OLD old_fn", //3
      "#undef OLD", //4
      "void f(void) {", //5
      '  getenv("A\\x41\\101\\n");', //6
      '  getenv(L"WIDE");', //7
      '  getenv("BAD\\q");', //8
      '  getenv_s(&n, buf, sizeof buf, "S");', //9
      "  void *p = DEF_CMD;", //10
      "  p = system;", //11
      "  p = &unlink;", //12
      "  int m = FAST;", //13
      "  OLD();", //14
      "}", //15
      "struct o { const char *k; int n; char c; void *v; };", //16
      "struct o a = { .k = \"s\", .n = -3, .c = 'x', .v = NULL };", //17
      'struct o b = { .n = (4), .k = "a" "b" };', //18
      'struct o c = (struct o){ "pos" };', //19
    );
    const env = await read("a.c", more, "env");
    assert.deepEqual(env.members, ["AAA\n", "S", "WIDE"]);
    assert.deepEqual(env.lines, [8]);
    const calls = await read("a.c", more, "calls");
    for (const name of ["run_default", "system", "unlink", "OLD"])
      assert.ok(calls.members.includes(name), name);
    assert.ok(!calls.members.includes("FAST"));
    assert.ok(!calls.members.includes("old_fn"));
    for (const [key, values] of [
      ["k", ["ab", "s"]],
      ["n", ["-3", "4"]],
      // A character constant is a number Kibi does not spell: refused.
      ["c", []],
      ["v", ["NULL"]],
    ])
      assert.deepEqual(
        (await read("a.c", more, "property", { key })).members,
        values,
        key,
      );
    assert.deepEqual(
      (await read("a.c", more, "property", { key: "k" })).lines,
      [19],
    );
  });

  it("refuses a macro that names a getter", async () => {
    const env = await read(
      "a.c",
      lines(
        "#define GE getenv",
        "void f(void) {",
        '  GE("A");',
        "  char *(*g)(const char *) = getenv;",
        "}",
      ),
      "env",
    );
    assert.deepEqual(env.lines, [3, 4]);
  });

  it("refuses positional struct initializers for a property", async () => {
    const positional = lines(
      "struct opts { const char *mode; };",
      'struct opts a = { "loose" };',
      'const char *names[] = { "x", "y" };',
      "struct opts b = { .mode = name };",
    );
    const mode = await read("a.c", positional, "property", { key: "mode" });
    assert.deepEqual(mode.members, []);
    assert.deepEqual(mode.lines, [2, 4]);
  });

  it("reads first arguments of a callee and refuses it through macros", async () => {
    const args = lines(
      "#define RUN system",
      "void f(void) {",
      '  system("ls");',
      "  system(cmd);",
      '  RUN("id");',
      "  void (*g)(const char *) = system;",
      "}",
    );
    const system = await read("a.c", args, "string_args", { callee: "system" });
    assert.deepEqual(system.members, ["ls"]);
    assert.deepEqual(system.lines, [4, 5, 6]);
  });

  it("reads a header as C and has no thrown errors", async () => {
    const header = await read(
      "include/a.h",
      "#ifndef A_H\n#define A_H\nint f(void);\n#endif\n",
      "calls",
    );
    assert.deepEqual(header.lines, []);
    const thrown = await raw("a.c", "int x;\n", "thrown");
    assert.equal(thrown.status, "unsupported");
  });
});

describe("C constructs Kibi must not misread", () => {
  const c = (content, extract, options = {}) =>
    read("a.c", `${content}\n`, extract, options);
  const ok = (members) => ({ members, lines: [], rows: [] });

  it("reads a macro's own name in its body as the function", async () => {
    // `#define getenv(n) (log(n), getenv(n))` still reads the variable.
    for (const [content, extract, options] of [
      [
        '#define getenv(n) (log_access(n), getenv(n))\nvoid f(void) { getenv("A"); }',
        "env",
      ],
      ['#define getenv getenv\nvoid f(void) { getenv("A"); }', "env"],
      [
        '#define getenv(n) traced(n)\n#define traced(n) getenv(n)\nvoid f(void) { getenv("A"); }',
        "env",
      ],
      [
        '#define system(c) (audit(c), system(c))\nvoid f(void) { system("rm"); }',
        "string_args",
        { callee: "system" },
      ],
      [
        '#define system system\nvoid f(void) { system("rm"); }',
        "string_args",
        { callee: "system" },
      ],
      // Through an object-like macro: the function itself, or a rescan.
      [
        "#define getenv(n) cfg(n)\n#define LOOKUP getenv\nvoid f(void) { reg(LOOKUP); }",
        "env",
      ],
    ])
      assert.deepEqual(
        (await c(content, extract, options)).lines.length > 0,
        true,
        content,
      );
    const calls = await c(
      '#define system(c) (audit(c), system(c))\nvoid f(void) { system("rm"); }',
      "calls",
    );
    assert.ok(calls.members.includes("system"));
    const paren = await c(
      '#define system(c) safe(c)\n#define RUN (system)\nvoid f(void) { RUN("rm"); }',
      "calls",
    );
    assert.ok(paren.members.includes("system"));
    const rescan = await c(
      '#define getenv(n) cfg(n)\n#define LOOKUP getenv\nvoid f(void) { LOOKUP("A"); }',
      "calls",
    );
    assert.ok(rescan.members.includes("cfg"));
  });

  it("refuses aliases, pragmas and environment entry points", async () => {
    for (const [content, extract] of [
      [
        '#define log_line(m) system(m)\n_Pragma("push_macro(\\"log_line\\")")\nvoid f(void) { log_line("x"); }',
        "calls",
      ],
      [
        '#pragma redefine_extname cfg getenv\nvoid f(void) { cfg("A"); }',
        "env",
      ],
      [
        'static int run(const char*) __attribute__((weakref("system")));\nvoid f(void) { run("x"); }',
        "calls",
      ],
      [
        "#define MAIN_ARGS int c, char **v, char **e\nint main(MAIN_ARGS) { return 0; }",
        "env",
      ],
      ["int wmain(int c, wchar_t **v, wchar_t **e) { return 0; }", "env"],
      ['void f(void) { fopen("/proc/self/environ", "r"); }', "env"],
      ['void f(void) { SDL_getenv("A"); }', "env"],
      ['int go(run) int (*run)(const char *); { return run("x"); }', "calls"],
      ["void f(int n) { n * run(cmd); }", "calls"],
      ["void f(void) { int n; sys\\\ntem(n); }", "calls"],
      ['// C:\\old\\ \nvoid f(void) { system("x"); }', "calls"],
      ['// what??/\nvoid f(void) { system("x"); }', "calls"],
    ]) {
      const result = await raw("a.c", `${content}\n`, extract);
      assert.ok(
        result.status === "failed" ||
          result.unresolved.some((row) => !HOST_ROW.test(row.text)),
        content,
      );
    }
    assert.deepEqual(
      (
        await c(
          'void f(void) { uv_os_getenv("A", b, &n); apr_env_get(&v, "B", p); }',
          "env",
        )
      ).members,
      ["A", "B"],
    );
    assert.deepEqual(
      (await c('void f(void) { _Pragma("once"); }', "calls")).members,
      [],
    );
    const generic = await c(
      "void f(void) { on(_Generic(0, int: system, default: puts)); }",
      "calls",
    );
    assert.deepEqual(generic.members, ["on", "puts", "system"]);
    assert.deepEqual(
      (await c('#define run$x system\nvoid f(void) { run$x("y"); }', "calls"))
        .members,
      ["run$x", "system"],
    );
  });

  it("lists a function called through a pointer to its name", async () => {
    const pointer = await c('void f(void) { (*system)("x"); }', "calls");
    assert.ok(pointer.members.includes("system"));
    assert.deepEqual(pointer.lines, [1]);
  });

  it("reads numbers by value and refuses overridden fields", async () => {
    const value = async (text) =>
      c(`struct s v = { .n = ${text} };`, "property", { key: "n" });
    for (const [text, members] of [
      ["0x1F90", ["8080"]],
      ["017", ["15"]],
      ["0b101", ["5"]],
      ["30u", ["30"]],
      ["10ULL", ["10"]],
      ["1'000", ["1000"]],
      ["1.50", ["1.5"]],
      ["2.0f", ["2"]],
      ["-0x10", ["-16"]],
      ["-0", ["0"]],
      ["- 0", ["0"]],
    ])
      assert.deepEqual((await value(text)).members, members, text);
    for (const text of [
      "'x'",
      "0x1p3",
      "0.1f",
      "0.0000001",
      "1e300",
      "123456789012345678.5",
    ])
      assert.deepEqual((await value(text)).lines, [1], text);
    for (const body of [
      "{ .t.n = 1, .t = { .m = 5 } }",
      "{ .n = 1, n: 0 }",
      "{ .t = { .n = 1 }, .t.n = 0 }",
    ])
      assert.deepEqual(
        (await c(`struct s v = ${body};`, "property", { key: "n" })).lines,
        [1],
        body,
      );
    assert.deepEqual(
      (
        await c("struct s v = { .a.n = 1, .b.n = 2 };", "property", {
          key: "n",
        })
      ).members,
      ["1", "2"],
    );
  });

  it("refuses what macros may decide", async () => {
    for (const [content, extract] of [
      [
        '#ifndef run_task\n#define run_task system\nint main(void) { return run_task("rm"); }\n#endif',
        "calls",
      ],
      [
        '#ifndef lookup\n#define lookup getenv\nint main(void) { return lookup("K") != 0; }\n#endif',
        "env",
      ],
      [
        "#define exit(c) abort()\n#ifdef NDEBUG\n#undef exit\n#endif\nint main(void) { exit(1); }",
        "calls",
      ],
      [
        '#pragma push_macro("log_line")\nvoid f(void) { log_line("x"); }',
        "calls",
      ],
      [
        'char *(*lookup_fn)(const char*);\n#define LOOKUP(n) lookup_fn(n)\nint main(void) { return LOOKUP("K") != 0; }',
        "env",
      ],
      [
        "#define getenv(n) cfg_get(n)\nvoid f(void) { register_lookup(getenv); }",
        "env",
      ],
    ])
      assert.ok((await c(content, extract)).lines.length > 0, content);
    assert.deepEqual(
      await c(
        '#define getenv(n) "fake"\n#undef getenv // back to real\nint main(void) { return getenv("SECRET") != 0; }',
        "env",
      ),
      ok(["SECRET"]),
    );
  });

  it("lists every function a macro body may call or hand on", async () => {
    for (const [content, expected] of [
      [
        '#define RUN (system)\nint main(void) { return RUN("x"); }',
        ["RUN", "system"],
      ],
      [
        '#define RUN ((int (*)(const char *))system)\nvoid f(void) { RUN("x"); }',
        ["RUN", "system"],
      ],
      [
        '#define RUN(c) system \\\n(c)\nvoid f(void) { RUN("x"); }',
        ["RUN", "system"],
      ],
      [
        '#define SPAWN(cmd) run_cb(system, cmd)\nvoid f(void) { SPAWN("x"); }',
        ["SPAWN", "run_cb", "system"],
      ],
      [
        '#define RUN(x) _Generic((x), char*: system, default: puts)(x)\nvoid f(void) { RUN("x"); }',
        ["RUN", "puts", "system"],
      ],
      [
        "#define system(c) safe_system(c)\nvoid f(void) { on_command(system); }",
        ["on_command", "system"],
      ],
      [
        "void f(void) { on_command((system)); on_command(*system); }",
        ["on_command", "system"],
      ],
      [
        "#define MAX(a, b) ((a) > (b) ? (a) : (b))\nvoid f(size_t n) { n = MAX(n, 2); }",
        ["MAX"],
      ],
      [
        "void set_allocator(void *(*malloc)(size_t), void (*free)(void *));\nvoid f(void *p) { free(p); }",
        ["free"],
      ],
    ])
      assert.deepEqual(await c(content, "calls"), ok(expected), content);
  });

  it("refuses environment reads it cannot name", async () => {
    for (const content of [
      'char *lookup(const char *n);\nint main(void) { char *(*lookup)(const char*) = 0; return lookup("K") != 0; }',
      "int main(argc, argv, envp) int argc; char **argv; char **envp; { return 0; }",
      "#define ENTRY main\nint ENTRY(int c, char **v, char **envp) { return 0; }",
      'extern char *config_value(const char*) __asm__("getenv");',
      "int main(void) { return *_NSGetEnviron() != 0; }",
    ])
      assert.ok((await c(content, "env")).lines.length > 0, content);
    assert.deepEqual(
      await c(
        'int main(void) { return g_getenv("A") || g_environ_getenv(e, "B"); }',
        "env",
      ),
      ok(["A", "B"]),
    );
    assert.deepEqual(
      await c(
        '#define TOKEN_VAR "API_" "TOKEN"\nint main(void) { return getenv(TOKEN_VAR) != 0; }',
        "env",
      ),
      ok(["API_TOKEN"]),
    );
    assert.deepEqual(
      (await c('void f(void) { __asm__("call system"); }', "calls")).lines,
      [1],
    );
  });

  it("reads #import and #include_next and asks the host about every header", async () => {
    assert.deepEqual(
      await c(
        '#import <curl/curl.h>\n#include_next "x.h"\n#include <stdio.h>',
        "imports",
      ),
      ok(["curl/curl.h", "stdio.h", "x.h"]),
    );
    const calls = await c(
      '#import "shims.h"\n#include <project.h>\nvoid f(void) { log_line("x"); }',
      "calls",
    );
    assert.deepEqual(calls.members, ["log_line"]);
    assert.deepEqual(
      calls.rows.map((row) => row.trimEnd()),
      [
        'shims.h may define macros or function pointers this file uses: #import "shims.h"',
        "project.h may define macros or function pointers this file uses: #include <project.h>",
      ],
    );
  });

  it("reads designators exactly or refuses them", async () => {
    const key = { key: "verify_peer" };
    assert.deepEqual(
      await c("struct o x = { verify_peer: 0, timeout: 30 };", "property", key),
      ok(["0"]),
    );
    for (const content of [
      "#define verify verify_peer\nstruct o x = { .verify = 0 };",
      "struct o x = { .verify_peer = 1, .timeout = 3, .verify_peer = 0 };",
      "#undef true\n#define true 0\nstruct o x = { .verify_peer = true };",
    ])
      assert.ok((await c(content, "property", key)).lines.length > 0, content);
    // A trigraph may be another character.
    assert.deepEqual(
      (
        await c(
          'int main(void) { return system("echo ??/n"); }',
          "string_args",
          { callee: "system" },
        )
      ).lines,
      [1],
    );
  });

  it("covers the rest of the macro and declarator rules", async () => {
    assert.deepEqual(
      await c("void f(int *, char) { g(); }", "calls"),
      ok(["g"]),
    );
    assert.deepEqual(
      (
        await c("#define CB system\nvoid f(void) { reg(CB); }", "string_args", {
          callee: "system",
        })
      ).lines,
      [2],
    );
    assert.deepEqual(
      (await c("#define G getenv\nvoid f(void) { reg(G); }", "env")).lines,
      [2],
    );
    assert.ok(
      (
        await c(
          "#ifdef X\n#define CB y\n#endif\nvoid f(void) { reg(CB); }",
          "calls",
        )
      ).lines.includes(4),
    );
    // `(system)(...)` calls the function, never a function-like macro.
    const paren = await c('void f(void) { (system)("x"); }', "calls");
    assert.deepEqual([paren.members, paren.lines], [["system"], []]);
    assert.deepEqual(
      (await c("char *f(char *(*cb)(void)) { return cb(); }", "calls")).lines,
      [1],
    );
    assert.deepEqual(
      await c("int a[2] = { [0] = 1 };", "property", { key: "0" }),
      ok([]),
    );
  });

  it("blanks #if 0 the way the preprocessor reads it", async () => {
    assert.deepEqual(
      await c(
        '#if 0\n// path C:\\old\\\n/*\n#endif\nint main(void) { return getenv("K") != 0; }\n#if 1\n// */\n#endif',
        "env",
      ),
      ok(["K"]),
    );
    const digraph = await raw(
      "a.c",
      '#if 0\n%:endif\nint main(void) { return getenv("K") != 0; }\n%:if 1\n#endif\n',
      "env",
    );
    assert.notEqual(digraph.status, "ok");
  });
});

describe("reader edge cases", () => {
  it("reads C prototypes, negative and parenthesized literals, and refuses what it cannot spell", async () => {
    assert.deepEqual(
      (
        await read(
          "a.c",
          lines("int f(int);", "int main(void) { return f(1); }"),
          "calls",
        )
      ).members,
      ["f"],
    );
    const property = await read(
      "a.c",
      lines(
        "struct s { int n; };",
        "struct s v = { .n = -1 };",
        "struct s w = { .n = (2) };",
      ),
      "property",
      { key: "n" },
    );
    assert.deepEqual(property.members, ["-1", "2"]);
    assert.deepEqual(property.lines, []);
    const unary = await read(
      "a.c",
      lines(
        "struct s v = { .n = - 1 };",
        "struct s w = { .n = !1 };",
        "struct s x = { .n = -X };",
      ),
      "property",
      { key: "n" },
    );
    assert.deepEqual(unary.members, ["-1"]);
    assert.deepEqual(unary.lines, [2, 3]);
    assert.deepEqual(
      (
        await read(
          "a.c",
          lines('#include "dir/a.h"', "#include <stdio.h>"),
          "imports",
        )
      ).members,
      ["dir/a.h", "stdio.h"],
    );
    // An escape C does not define: the header's name is unknown.
    for (const extract of ["imports", "calls"])
      assert.deepEqual(
        (await read("a.c", lines('#include "a\\q.h"'), extract)).lines,
        [1],
      );
    // `#x` makes a string the reader does not expand.
    assert.deepEqual(
      (
        await read(
          "a.c",
          lines("#define S(x) #x", "int main(void) { return S(y)[0]; }"),
          "env",
        )
      ).lines,
      [2],
    );
  });

  it("reads PHP edge cases exactly or refuses them", async () => {
    // A subscript of another array is not an environment read.
    assert.deepEqual(await read("a.php", lines("<?php", "$a['x'];"), "env"), {
      members: [],
      lines: [],
      rows: [],
    });
    // `self::` outside a class names no class.
    assert.deepEqual(
      (await read("a.php", lines("<?php", "self::f();"), "calls")).members,
      ["*.f"],
    );
    // A class Kibi cannot name: `$x::class` as a key, `new ($cls)` thrown.
    assert.deepEqual(
      (await read("a.php", lines("<?php", "$_ENV[$x::class];"), "env")).lines,
      [2],
    );
    assert.deepEqual(
      (await read("a.php", lines("<?php", "throw new ($cls)();"), "thrown"))
        .lines,
      [2],
    );
    // A code point past U+10FFFF is not a string PHP makes.
    assert.deepEqual(
      (await read("a.php", lines("<?php", 'getenv("\\u{110000}");'), "env"))
        .lines,
      [2],
    );
  });
});

describe("Terraform and HCL values Kibi must not misread", () => {
  const property = (content, key = "acl", path = "main.tf") =>
    read(path, content, "property", { key });

  it("reads strings, numbers and heredocs as Terraform holds them", async () => {
    for (const [content, key, members] of [
      ['locals {\n  d = " "\n}', "d", [" "]],
      ['locals {\n  acl = "private "\n}', "acl", ["private "]],
      ['locals {\n  x = { " acl " = "public-read" }\n}', "acl", []],
      ["locals {\n  m = 0.0000001\n}", "m", ["0.0000001"]],
      ["locals {\n  m = -0.0000001\n}", "m", ["-0.0000001"]],
      ["locals {\n  m = 1.0e21\n}", "m", ["1000000000000000000000"]],
      ["locals {\n  m = 1.5e-7\n}", "m", ["0.00000015"]],
      ["locals {\n  m = 0.000\n}", "m", ["0"]],
      ['locals {\n  x = { 007 = "bond" }\n}', "7", ["bond"]],
      ["locals {\n  p = <<END-OF-POLICY\nhi\nEND-OF-POLICY\n}", "p", ["hi\n"]],
      ["locals {\r\n  p = <<EOT\r\nline\r\nEOT\r\n}", "p", ["line\r\n"]],
      ['locals {\n  x = merge(var.t, { acl = "b" })\n}', "acl", ["b"]],
      [
        'resource "x" "y" {\n  for_each = { for k in ["acl"] : k => "public-read" }\n}',
        "acl",
        [],
      ],
    ])
      assert.deepEqual(
        (await property(`${content}\n`, key)).members,
        members,
        content,
      );
  });

  it("reads bool and number object keys", async () => {
    assert.deepEqual(
      (await property('locals {\n  x = { true = "t" }\n}\n', "true")).members,
      ["t"],
    );
    assert.deepEqual(
      (await property('locals {\n  x = { 1.50 = "n" }\n}\n', "1.5")).members,
      ["n"],
    );
  });

  it("refuses keys set twice, overridable merges and misread heredocs", async () => {
    for (const content of [
      'locals {\n  cfg = { acl = "private", acl = "public-read" }\n}',
      'locals {\n  cfg = { acl = "private", "a\\u0063l" = "public-read" }\n}',
      'locals {\n  x = merge({ acl = "a" }, { acl = "b" })\n}',
      'locals {\n  x = merge({ acl = "a" }, var.t)\n}',
      'locals {\n  p = <<EOT\nhello\nEOT\u00a0\n}\nresource "a" "b" {\n  acl = "public-read"\n}\nlocals {\n  q = <<EOT\nEOT\n}',
      'variable "b" {\n  type = object({\n    s = optional(object({ acl = string }), { acl = var.x })\n  })\n}',
      'locals {\n  for_each = { for k in ["acl"] : k => "public-read" }\n}',
    ])
      assert.ok((await property(`${content}\n`)).lines.length > 0, content);
    assert.deepEqual(
      (
        await property(
          'variable "b" {\n  type = object({\n    s = optional(object({ acl = string }), { acl = "public-read" })\n  })\n}\n',
        )
      ).members,
      ["public-read"],
    );
  });

  it("reads a top-level type attribute as a value", async () => {
    assert.deepEqual(
      await property(lines('type = "x"', 'acl = "y"'), "acl", "a.hcl"),
      {
        members: ["y"],
        lines: [],
        rows: [],
      },
    );
  });

  it("refuses keys that are evaluated", async () => {
    for (const content of [
      lines(
        "locals {",
        '  objs = [for k in ["acl"] : { (k) = "public-read" }]',
        "}",
      ),
      lines(
        "locals {",
        '  objs = [for k, v in { a = "acl" } : { (v) = "public-read" }]',
        "}",
      ),
      lines(
        "locals {",
        '  m = regex("^(?P<acl>[a-z-]+)$", "public-read")',
        "}",
      ),
      lines(
        "locals {",
        '  m = regexall("(?P<acl>[a-z-]+)", "public-read")',
        "}",
      ),
      lines("locals {", '  m = core::jsondecode("{}")', "}"),
      lines("locals {", '  m = core::zipmap(["acl"], ["x"])', "}"),
      lines("locals {", '  m = provider::aws::arn_parse("x")', "}"),
      lines("locals {", "  m = { for k, v in var.x : k => v }", "}"),
    ])
      assert.deepEqual((await property(content)).lines, [2], content);
    // A literal in parentheses is still a name.
    assert.deepEqual(
      await property(
        lines(
          "locals {",
          '  m = { ("acl") = "private", (local.other) = 1 }',
          "}",
        ),
      ),
      { members: ["private"], lines: [2], rows: ["(local.other) = 1"] },
    );
  });

  it("reads keys that cannot be the one asked for", async () => {
    // for_each keys are instance keys; a template key that starts otherwise
    // cannot be acl.
    const read1 = await property(
      lines(
        'resource "aws_s3_bucket" "b" {',
        "  for_each = { for k, v in var.buckets : k => v }",
        '  tags     = { for k, v in var.tags : "tag-${k}" => v }',
        '  acl      = "private"',
        "}",
      ),
    );
    assert.deepEqual(read1, { members: ["private"], lines: [], rows: [] });
  });

  it("reads values as HCL holds them", async () => {
    const numbers = await property(
      lines(
        "locals {",
        "  days = 007",
        "  days = 3.0e3",
        "  days = 1.50",
        "  days = -0",
        "}",
      ),
      "days",
    );
    assert.deepEqual(numbers.members, ["0", "1.5", "3000", "7"]);
    // HCL normalizes strings to NFC, and a surrogate escape is no character.
    const strings = await property(
      lines("locals {", '  name = "café"', '  name = "\\ud83d\\ude00"', "}"),
      "name",
    );
    assert.deepEqual(strings.members, ["café"]);
    assert.deepEqual(strings.lines, [3]);
    // Comments are not values.
    assert.deepEqual(
      (
        await property(
          lines(
            "locals {",
            "  actions = [",
            '    "s3:Get", # read',
            '    /* c */ "s3:Put",',
            "  ]",
            "}",
          ),
          "actions",
        )
      ).members,
      ["s3:Get", "s3:Put"],
    );
  });

  it("reads a variable's type as a constraint, with optional defaults as values", async () => {
    const read1 = await property(
      lines(
        'variable "bucket" {',
        "  type = object({",
        '    acl  = optional(string, "private")',
        "    name = optional(string)",
        "    tags = map(string)",
        "  })",
        "}",
      ),
    );
    assert.deepEqual(read1, { members: ["private"], lines: [], rows: [] });
  });

  it("refuses a Terragrunt include, which merges another file", async () => {
    const content = lines(
      'include "root" {',
      '  path = find_in_parent_folders("root.hcl")',
      "}",
      "inputs = {",
      '  acl = "private"',
      "}",
    );
    assert.deepEqual(
      (await property(content, "acl", "terragrunt.hcl")).lines,
      [1],
    );
    assert.deepEqual(
      (
        await property(
          lines(
            "locals {",
            '  common = read_terragrunt_config("common.hcl")',
            "}",
          ),
          "acl",
          "terragrunt.hcl",
        )
      ).lines,
      [2],
    );
  });

  it("reads round-three values exactly: NFC identifier keys, typed defaults, blanks", async () => {
    for (const [content, key, members] of [
      ['locals {\n  x = { café = "public-read" }\n}', "café", ["public-read"]],
      ["locals {\n  p = <<EOT\nhello\n\u000bEOT\n}", "p", ["hello\n"]],
      [
        'locals {\n  tags = merge(var.tags, { Name = "x" }, { Env = "y" })\n}',
        "Name",
        ["x"],
      ],
      [
        'locals {\n  doc = jsonencode({ acl = "private" })\n}',
        "acl",
        ["private"],
      ],
      [
        'variable "v" {\n  type = string\n  default = "007"\n}',
        "default",
        ["007"],
      ],
      [
        'variable "v" {\n  type = object({ acl = string })\n  default = { acl = "private" }\n}',
        "acl",
        ["private"],
      ],
      [
        'variable "v" {\n  type = map(string)\n  default = { acl = "private" }\n}',
        "acl",
        ["private"],
      ],
      [
        'variable "v" {\n  type = list(object({ acl = string }))\n  default = [{ acl = "private" }]\n}',
        "acl",
        ["private"],
      ],
      [
        'variable "v" {\n  type = any\n  default = { acl = 1 }\n}',
        "acl",
        ["1"],
      ],
      [
        'variable "v" {\n  type = object({ acl = optional(string) })\n  default = { acl = null }\n}',
        "acl",
        ["null"],
      ],
      [`locals {\n  n = 1${"0".repeat(149)}\n}`, "n", [`1${"0".repeat(149)}`]],
    ])
      assert.deepEqual(
        (await property(`${content}\n`, key)).members,
        members,
        content,
      );
  });

  it("refuses values evaluation may drop, convert or recompose", async () => {
    for (const [content, key] of [
      ['locals {\n  x = { "ac\\n${~ local.e}l" = "public-read" }\n}', "acl"],
      ['locals {\n  x = { "a${local.e~}\\r\\ncl" = "public-read" }\n}', "acl"],
      [
        'locals {\n  x = { for k in l : "ac ${~ k}l" => "public-read" }\n}',
        "acl",
      ],
      ['locals {\n  x = { café = "a", café = "b" }\n}', "café"],
      ['locals {\n  x = { "${local.l}ᅡ" = "yes" }\n}', "가"],
      ['locals {\n  x = { "e${local.m}cl" = "yes" }\n}', "écl"],
      [
        'locals {\n  x = merge([{ acl = "private" }, { acl = "public-read" }]...)\n}',
        "acl",
      ],
      [
        'locals {\n  x = merge(merge({ acl = "private" }), { acl = "public-read" })\n}',
        "acl",
      ],
      [
        'locals {\n  x = merge(tomap({ acl = "private" }), { mode = "x" })\n}',
        "acl",
      ],
      [
        'locals {\n  x = merge({ s = { acl = "private" } }, { s = { mode = "x" } })\n}',
        "acl",
      ],
      [
        'locals {\n  x = merge({ acl = "private" }, { "${k}" = "x" })\n}',
        "acl",
      ],
      [
        'locals {\n  x = coalesce({ acl = "public-read" }, { acl = "private" })\n}',
        "acl",
      ],
      ['locals {\n  x = c ? { acl = "a" } : { acl = "b" }\n}', "acl"],
      ['locals {\n  x = [{ acl = "a" }, { acl = "b" }][1]\n}', "acl"],
      ['locals {\n  x = { acl = "a" }.acl\n}', "acl"],
      ['locals {\n  x = [for v in l : { acl = "a" }]\n}', "acl"],
      [`locals {\n  n = 1${"1".repeat(160)}\n}`, "n"],
      [`locals {\n  n = 1.${"0".repeat(168)}1\n}`, "n"],
      ['variable "v" {\n  type = number\n  default = "1.0e3"\n}', "default"],
      [
        'variable "v" {\n  type = object({ mode = string })\n  default = { mode = "x", acl = "public-read" }\n}',
        "acl",
      ],
      [
        'variable "v" {\n  type = map(string)\n  default = { acl = 7 }\n}',
        "acl",
      ],
      [
        'variable "v" {\n  type = set(string)\n  default = ["b", "a"]\n}',
        "default",
      ],
      [
        'variable "b" {\n  type = object({\n    s = optional(number, "007")\n  })\n}',
        "s",
      ],
      [
        'variable "b" {\n  type = object({\n    s = optional(object({ m = string }), { acl = "x" })\n  })\n}',
        "acl",
      ],
    ]) {
      const result = await property(`${content}\n`, key);
      assert.ok(result.lines.length > 0, content);
    }
  });
});

describe("script-language constructs of the third round", () => {
  const sh = (content, extract = "env") =>
    read("dir/a.sh", `#!/bin/bash\n${content}\n`, extract);
  const php = (body, extract, options = {}) =>
    read("src/a.php", `<?php\n${body}\n`, extract, options);
  const c = (content, extract, options = {}) =>
    read("src/a.c", `${content}\n`, extract, options);

  it("refuses Bash code that rebinds commands, evaluates data or hides environment reads", async () => {
    for (const [content, extract] of [
      ["cat <<EOT\n`rm -rf /tmp/x`\nEOT", "calls"],
      ["printf -v 'BASH_CMDS[ls]' '%s' /bin/rm; ls -rf x", "calls"],
      ["PS4=$'+\\x24(rm -rf x)'; set -x; echo", "calls"],
      ["n='a[$(rm -rf x)]'; echo $(( n + 1 ))", "calls"],
      ["read -r 'a[$(rm -rf x)]' <<< v", "calls"],
      [
        'g(){ unset HOME; }; f(){ declare HOME=/srv; g; echo "$HOME"; }; f',
        "env",
      ],
      [
        'g(){ unset "HOME"; }; f(){ local HOME=/srv; g; echo "$HOME"; }; f',
        "env",
      ],
      ["python3 - <<'PY'\nimport os; print(os.environ['X'])\nPY", "env"],
      ["jq -rn 'env | .X'", "env"],
      ['awk "$prog" f', "env"],
      ["for c in printenv; do $c; done", "env"],
      ["for s in source; do $s ./lib.sh; done", "imports"],
      ["cat /proc/self/env*", "env"],
      ["cd /proc/self && cat environ", "env"],
      ['echo "${m[KEY]}"; declare -A m=([KEY]=1)', "env"],
      ['cd /tmp\nsource "$(dirname "$0")/lib.sh"', "imports"],
    ]) {
      const result = await sh(content, extract);
      assert.ok(result.lines.length > 0, content);
    }
    assert.deepEqual(
      (await sh("sudo <<A 2>/dev/null rm -rf x\nhi\nA", "calls")).members,
      ["rm", "sudo"],
    );
    // `read -t 0` sets nothing, and `ip -n NS` takes the namespace.
    assert.deepEqual((await sh('read -t 0 line; echo "[$line]"')).members, [
      "line",
    ]);
    assert.deepEqual(
      (await sh("ip -n foo netns exec bar rm -rf x", "calls")).members,
      ["ip", "rm"],
    );
    // A command substitution inside double quotes expands `~`.
    assert.deepEqual((await sh('dir="$(cd ~ && pwd)"; echo "$dir"')).members, [
      "HOME",
    ]);
  });

  it("reads Bash script-folder variables and plain prompts", async () => {
    assert.deepEqual(
      await sh(
        'DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"\nsource "$DIR/lib.sh"',
        "imports",
      ),
      { members: ["dir/lib.sh"], lines: [], rows: [] },
    );
    const zero = await sh(
      'SCRIPT_DIR=$(dirname "$0")\nsource "$SCRIPT_DIR/lib.sh"',
      "imports",
    );
    assert.deepEqual(zero.members, ["dir/lib.sh"]);
    assert.deepEqual(zero.lines, []);
    assert.match(zero.rows[0], /^a\.sh may be sourced by another script/);
    assert.deepEqual(
      await sh(
        'x="$(cd /tmp && pwd)"\nsource "$(dirname "$0")/lib.sh"',
        "imports",
      ).then((r) => r.lines),
      [],
    );
    assert.deepEqual(
      (await sh("PS4='+ '; set -x; i=0; echo $(( i + 1 ))", "calls")).lines,
      [],
    );
    assert.deepEqual(
      (await sh('declare -A m=([KEY]=1); echo "${m[KEY]}"')).lines,
      [],
    );
  });

  it("refuses PHP callables, rebinding and writes it cannot follow", async () => {
    for (const [body, extract, options] of [
      [
        "array_map(exec(...), ['rm -rf /tmp/cache']);",
        "string_args",
        { callee: "exec" },
      ],
      [
        "array_walk($o, function (string &$v, $k) { $v = 'x'; });",
        "property",
        { key: "acl" },
      ],
      [
        "foreach ($b[strtolower('M')] as $k => &$v) { $v = 1; }",
        "property",
        { key: "acl" },
      ],
      ["foreach ($rows as $o['acl']) {}", "property", { key: "acl" }],
      ["[self::$acl] = ['public-read'];", "property", { key: "acl" }],
      ["setv($opts['acl'], 'public-read');", "property", { key: "acl" }],
      ["preg_match('/(?<acl>\\w+)/', $s, $m);", "property", { key: "acl" }],
      [
        "$o = ['acl' => 'private']; $o = str_replace('private', 'public-read', $o);",
        "property",
        { key: "acl" },
      ],
      [
        "$r = new class('system') extends \\ReflectionFunction {}; $r->invoke('id');",
        "calls",
      ],
      [
        "class_alias('App\\Mail\\Mailer', 'App\\Courier'); \\App\\Courier::send();",
        "calls",
      ],
      ["filter_var('x', FILTER_CALLBACK, ['options' => 'system']);", "calls"],
      [
        "$env = new \\Illuminate\\Support\\Env(); $env->get('DB_PASSWORD');",
        "env",
      ],
      [
        "function g() { try { x(); } catch (\\Throwable $e) { wrap($e); throw $e; } }",
        "thrown",
      ],
    ]) {
      const result = await php(body, extract, options);
      assert.ok(result.lines.length > 0, body);
    }
    assert.deepEqual(
      await php(
        "class A { function f() { $c = function () { self::purge(); }; $c->call(new B()); } }",
        "calls",
      ).then((r) => r.members.includes("A::purge")),
      false,
    );
  });

  it("reads PHP code the second round over-refused, and bytes as UTF-8", async () => {
    assert.deepEqual(
      await php("$c = new $controller(); $c->index(); getenv('A');", "env"),
      { members: ["A"], lines: [], rows: [] },
    );
    assert.deepEqual(
      await php("$cfg = ['source' => 'env']; getenv('A');", "env"),
      { members: ["A"], lines: [], rows: [] },
    );
    assert.deepEqual(
      await php(
        "preg_replace_callback(pattern: '/\\d+/', callback: 'intval', subject: 'abc');",
        "calls",
      ).then((r) => r.members),
      ["intval", "preg_replace_callback"],
    );
    assert.deepEqual(
      await php('$o = ["k" => "caf\\xc3\\xa9"];', "property", {
        key: "k",
      }).then((r) => r.members),
      ["café"],
    );
    assert.ok(
      (await php("$o = ['k' => 'v' . 1.5];", "property", { key: "k" })).lines
        .length > 0,
    );
  });

  it("refuses C macros, pointers and initializers the preprocessor or a union decides", async () => {
    for (const [content, extract, options] of [
      ['void f(void) { host->getenv("API_TOKEN"); }', "env", {}],
      ['void f(void) { ops->exec("rm"); }', "calls", {}],
      [
        '#define RUN_QUOTED(c) ((c)[0] == \'"\' ? system(c) : 0)\nvoid f(void) { RUN_QUOTED("x"); }',
        "string_args",
        { callee: "system" },
      ],
      [
        '#define SAVE _Pragma("push_macro(\\"log\\")")\nvoid f(void) { }',
        "calls",
        {},
      ],
      [
        "#define TLS_DEFAULTS { .verify_peer = 0 }\nstruct tls t = TLS_DEFAULTS;",
        "property",
        { key: "verify_peer" },
      ],
      [
        "#define TLS(v) { .verify_peer = v }\nstruct tls t = TLS(0);",
        "property",
        { key: "verify_peer" },
      ],
      [
        "union u { int verify_peer; int check; };\nunion u x = { .verify_peer = 1, .check = 0 };",
        "property",
        { key: "verify_peer" },
      ],
      [
        "struct s v[2] = { [0] = { .verify_peer = 1 }, [1 - 1] = { .verify_peer = 0 } };",
        "property",
        { key: "verify_peer" },
      ],
      [
        "__attribute__((constructor)) static void init(int c, char **v, char **e) { }",
        "env",
        {},
      ],
      ['void f(void) { getenv("A\\0B"); }', "env", {}],
      [
        '#if 0 /* note\n*/ || 1\nvoid f(void) { getenv("A"); }\n#endif',
        "env",
        {},
      ],
    ]) {
      const result = await c(content, extract, options);
      assert.ok(
        result.lines.length > 0 || result.members.includes("A"),
        content,
      );
    }
    assert.deepEqual(
      (
        await c(
          '#if 0\nstatic const char *o = "x\\\r\n/*";\n#endif\n#if 1\n/* */\nvoid f(void) { puts(getenv("T")); }\n#endif',
          "env",
        )
      ).members,
      ["T"],
    );
  });

  it("reads arrays of designated structs", async () => {
    assert.deepEqual(
      await c(
        "struct s v[2] = { { .verify_peer = 1 }, { .verify_peer = 0 } };",
        "property",
        { key: "verify_peer" },
      ),
      { members: ["0", "1"], lines: [], rows: [] },
    );
  });

  it("refuses the last C reads round three found", async () => {
    for (const [content, extract, options] of [
      [
        '#include <stdio.h>\n#define PROC_SELF "/proc/self/"\nvoid f(void) { fopen(PROC_SELF "environ", "r"); }',
        "env",
        {},
      ],
      [
        '#ifdef PLUGIN_RUNNER\nextern int (*run)(const char *cmd);\n#else\nint run(const char *cmd);\n#endif\nvoid go(void) { run("make install"); }',
        "calls",
        {},
      ],
    ]) {
      const result = await c(content, extract, options);
      assert.ok(result.lines.length > 0, content);
    }
    for (const content of [
      "void f(void) { register_runner(({ int x = 1; system; })); }",
      "void f(void) { register_runner(__extension__ system); }",
    ])
      assert.ok(
        (await c(content, "calls")).members.includes("system"),
        content,
      );
  });

  it("reads and refuses the last PHP forms round three found", async () => {
    // A namespace may define its own CURLOPT_ or PDO constant.
    assert.ok(
      (
        await php(
          "namespace App; const CURLOPT_ACL = 'acl'; $o = [CURLOPT_ACL => 'private'];",
          "property",
          { key: "acl" },
        )
      ).lines.length > 0,
    );
    assert.deepEqual(
      (
        await php(
          "namespace App; $o = [CURLOPT_URL => 'x', 'acl' => 'private'];",
          "property",
          { key: "acl" },
        )
      ).members,
      ["private"],
    );
    assert.ok(
      (
        await php(
          "namespace App; class PDO { const ATTR_ACL = 'acl'; } $o = [PDO::ATTR_ACL => 'private'];",
          "property",
          { key: "acl" },
        )
      ).lines.length > 0,
    );
    // A property hook computes the value.
    assert.ok(
      (
        await php(
          "class C { public string $acl { get => 'public-read'; } }",
          "property",
          { key: "acl" },
        )
      ).lines.length > 0,
    );
    // A data:// include runs code the file does not show.
    for (const extract of ["calls", "env"])
      assert.ok(
        (
          await php(
            "include 'data://text/plain;base64,PD9waHAgc3lzdGVtKCdscycpOw==';",
            extract,
          )
        ).lines.length > 0,
        extract,
      );
    assert.deepEqual(
      await php("$x = $config->getOption('env'); getenv('A');", "env"),
      { members: ["A"], lines: [], rows: [] },
    );
    assert.deepEqual(await php("getenv(name: 'HOME');", "env"), {
      members: ["HOME"],
      lines: [],
      rows: [],
    });
    assert.deepEqual(
      (
        await php(
          "require dirname(dirname(__FILE__)) . DIRECTORY_SEPARATOR . 'lib/x.php';",
          "imports",
        )
      ).members,
      ["lib/x.php"],
    );
    assert.deepEqual(
      (await php("throw (new RuntimeException('x'));", "thrown")).members,
      ["RuntimeException"],
    );
  });
});
