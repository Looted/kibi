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
  /^(?:\w+ may be a function of namespace [\w\\]+|.+? may define macros this file uses|.+? may be Illuminate\\Support\\Env or a class that extends it): /;

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
    // The heredoc's `date` is parsed as a command: no environment read there.
    assert.deepEqual(
      env.lines,
      [
        1, 2, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 16, 17, 18, 19, 20, 21, 25,
        26, 27,
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
  const sh = (content, extract = "env", callee) =>
    read("s.sh", content, extract, callee === undefined ? {} : { callee });

  it("reads variables bash only fills in when the environment does not", async () => {
    assert.deepEqual(
      (await sh(lines('echo "$HOSTNAME"', 'case "$OSTYPE" in x) ;; esac', 'echo "$REPLY $OPTARG"'))).members,
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
      lines("[[ -v DEBUG && -n x ]]", "[[ ! -v TRACE ]]", "test -v VERBOSE", "[ -v QUIET ]", "[ -v ]"),
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
    assert.deepEqual(await sh(lines("[ 1 -lt N ]")), { members: [], lines: [], rows: [] });
    assert.deepEqual(await sh(lines("declare -A m=([K]=v)", "unset m[J]")), {
      members: [],
      lines: [],
      rows: [],
    });
    // Loop values that are all numbers are safe to evaluate.
    assert.deepEqual(
      (await sh(lines("sum=0", "for i in 1 2 3; do (( sum += i )); done"))).lines,
      [],
    );
  });

  it("does not trust assignments that may not run", async () => {
    for (const content of [
      lines("LOGDIR=/x &", 'echo "$LOGDIR"'),
      lines("read -r VERSION < /etc/app/version", 'echo "$VERSION"'),
      lines("g(){ unset HOME; echo \"$HOME\"; }", "f(){ local HOME=/srv; g; }", "f"),
    ]) {
      const env = await sh(content);
      assert.deepEqual(env.members, [], content);
      assert.ok(env.lines.length > 0, content);
    }
    // `local` outside a function fails.
    assert.deepEqual((await sh(lines("local CONF=/x", 'echo "$CONF"'))).members, ["CONF"]);
    // Redirections Kibi can vouch for keep the assignment.
    assert.deepEqual(
      await sh(lines("read -r X <<< 1", "read -r Y < /dev/null", 'echo "$X $Y"')),
      { members: [], lines: [], rows: [] },
    );
  });

  it("refuses code it cannot see for env", async () => {
    for (const content of [
      lines("tr '\\0' '\\n' < /proc/self/environ"),
      lines("cat \"/proc/$$/environ\""),
      lines("alias show='echo $API_TOKEN'", "show"),
      lines("builtin declare -n ref=SECRET_KEY", 'echo "$ref"'),
      lines("builtin source /etc/app/overrides.sh"),
      lines('unset "$v"'),
      lines("gosu app bash -c 'echo $X'"),
    ])
      assert.ok((await sh(content)).lines.includes(1), content);
    assert.deepEqual(await sh(lines("gosu app server")), { members: [], lines: [], rows: [] });
  });

  it("knows what unset, read and here-documents leave", async () => {
    for (const content of [
      lines('unset "TMPDIR"', 'echo "${TMPDIR:-/tmp}"'),
      lines("cat <<E\\OF", "$HOME", "EOF"),
      lines("command read -r LINE", 'echo "$LINE"'),
      lines('read -rp "> " answer', 'echo "$answer"'),
      lines("read", 'echo "$REPLY"'),
      lines("select c in a b; do echo \"$REPLY\"; done"),
    ])
      assert.deepEqual(await sh(content), { members: [], lines: [], rows: [] }, content);
  });

  it("follows sourced files through command and builtin", async () => {
    assert.deepEqual(
      (
        await sh(
          lines("builtin source /etc/app/overrides.sh", "command . ./local.sh", "source -- ./lib.sh", "gosu app server"),
          "imports",
        )
      ).members,
      ["./lib.sh", "./local.sh", "/etc/app/overrides.sh"],
    );
  });

  it("follows the commands wrappers run", async () => {
    for (const [content, expected] of [
      [lines("find . -exec chmod {} \\; -exec rm -f {} \\;"), ["chmod", "find", "rm"]],
      [lines("xargs -0 < list rm -f"), ["rm", "xargs"]],
      [lines("sudo 2>/dev/null rm x"), ["rm", "sudo"]],
      [lines("busybox rm x"), ["busybox", "rm"]],
      [lines("ip netns exec ns rm x"), ["ip", "rm"]],
      [lines("trap -- cleanup EXIT"), ["cleanup", "trap"]],
      [lines("sudo -nE rm x"), ["rm", "sudo"]],
    ])
      assert.deepEqual(await sh(content, "calls"), { members: expected, lines: [], rows: [] }, content);
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

  it("reads first arguments past redirections and refuses ones from input", async () => {
    assert.deepEqual(await sh(lines("curl >out.html https://trusted.example/x"), "string_args", "curl"), {
      members: ["https://trusted.example/x"],
      lines: [],
      rows: [],
    });
    assert.deepEqual((await sh(lines("rm 2>/dev/null -rf x"), "string_args", "rm")).members, ["-rf"]);
    assert.deepEqual((await sh(lines("cat urls | xargs curl"), "string_args", "curl")).lines, [1]);
    assert.deepEqual((await sh(lines("find . -exec curl {} \\;"), "string_args", "curl")).lines, [1]);
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
      ["$o = ['acl' => 'private'];\n$o['acl'] = 'public-read';", "acl", ["private", "public-read"]],
      ["class S { public $acl = 'private'; function f() { $this->acl = 'public-read'; } }", "acl", ["private", "public-read"]],
      ["self::$acl = 'x';", "acl", ["x"]],
      ["$a['b']['acl'] = 'x';", "acl", ["x"]],
      ["class C { function __construct(public string $acl = 'private') {} }", "acl", ["private"]],
      ["enum Acl: string { case Private = 'private'; }", "Private", ["private"]],
      ["$a = ['x', 'y', 5 => 'z', 'w'];", "6", ["w"]],
      ["$a = ['acl' => <<<'N'\n  raw $x\n  N\n];", "acl", ["raw $x"]],
      ["$a = ['acl' => <<<N\n\n  a\n    b\n  N\n];", "acl", ["\na\n  b"]],
      ["$o = [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, CURLOPT_URL => 'x'];", "db", []],
    ])
      assert.deepEqual(await php(body, "property", { key }), ok(expected), body);
  });

  it("compares numbers by value", async () => {
    const body = "$c = ['a' => 0x1F90, 'b' => 0755, 'c' => 1.50, 'd' => 1e3, 'e' => 0o17, 'f' => 0b11, 'g' => -0x10, 'h' => -0.0, 'i' => 1_000];";
    for (const [key, value] of [["a", "8080"], ["b", "493"], ["c", "1.5"], ["d", "1000"], ["e", "15"], ["f", "3"], ["g", "-16"], ["h", "0"], ["i", "1000"]])
      assert.deepEqual((await php(body, "property", { key })).members, [value], key);
    // Past the integer range PHP reads a float Kibi does not round.
    assert.deepEqual((await php("$c = ['h' => 0xFFFFFFFFFFFFFFFF, 'p' => 3.14159265358979323];", "property", { key: "h" })).lines, [2]);
    assert.deepEqual((await php("$c = ['p' => 3.14159265358979323];", "property", { key: "p" })).lines, [2]);
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
    assert.deepEqual(await php("$a = array_merge(['other' => 1], $x);", "property", { key: "acl" }), ok([]));
  });

  it("refuses reflection and reads callables builtins are handed", async () => {
    assert.deepEqual((await php("(new ReflectionFunction('system'))->invoke('id');", "calls")).lines, [2]);
    assert.ok((await php("$f = new \\ReflectionFunction('get'.'env');", "env")).lines.includes(2));
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
    assert.deepEqual((await php("curl_setopt($ch, $option, $value);", "calls")).lines, [2]);
    assert.deepEqual((await php("array_map(...$args);", "calls")).lines, [2]);
    assert.deepEqual(
      (await php("class Job { function run() { array_map(['self', 'purge'], []); array_map([static::class, 'y'], []); } }", "calls")).members,
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
      assert.deepEqual((await php(body, "string_args", { callee })).lines, [2], body);
    assert.deepEqual(await php("exit('bye'); die('x');", "string_args", { callee: "exit" }), ok(["bye", "x"]));
    assert.deepEqual(await php("$s = strlen(...);", "string_args", { callee: "strlen" }), ok([]));
  });

  it("trusts a catch variable only while it holds the caught exception", async () => {
    for (const body of [
      "try { x(); } catch (\\RuntimeException $e) { $e = new \\LogicException('w'); throw $e; }",
      "try { x(); } catch (\\Throwable $e) { foreach (errs() as $e) throw $e; }",
      "try { x(); } catch (\\Throwable $e) { $f = function () { $e = new \\DomainException; throw $e; }; }",
      "try { x(); } catch (\\Throwable $e) { $f = function () use (&$e) { $e = null; }; throw $e; }",
    ])
      assert.deepEqual((await php(body, "thrown")).lines, [2], body);
    assert.deepEqual(
      await php("try { x(); } catch (\\Throwable $e) { report($e); Log::error($e->getMessage(), ['e' => $e]); if ($e instanceof \\X) {} throw $e; }", "thrown"),
      ok([]),
    );
    assert.deepEqual((await php("class E extends \\Exception { static function make() { throw new static('x'); } }", "thrown")).lines, [2]);
    assert.deepEqual(await php("class E extends \\Exception { static function make() { throw new self('x'); } }", "thrown"), ok(["E"]));
  });

  it("reads Laravel's environment class through subclasses", async () => {
    const env = "use Illuminate\\Support\\Env;\n";
    assert.deepEqual(await php(`${env}class Config extends Env {}\nConfig::get('DB_HOST');`, "env"), ok(["DB_HOST"]));
    assert.deepEqual(await php(`${env}Env::getOrFail('DB_PASSWORD');`, "env"), ok(["DB_PASSWORD"]));
    assert.deepEqual(await php("class Local { static function get($k) {} }\nLocal::get('k');", "env"), ok([]));
    for (const body of [
      `${env}$cls = Env::class; $cls::get('DB_USER');`,
      `${env}class AppEnv extends Env { static function h() { return static::get('APP_HOST'); } }`,
      `${env}Env::getRepository()->get('X');`,
    ])
      assert.deepEqual((await php(body, "env")).lines, [3], body);
    // A class of another file, and a callable's class, may extend it: the
    // host drops the row once the project does not name the class.
    const row = await php("Cache::get('k');\ncall_user_func_array([$this->c, $this->a], []);", "env");
    assert.deepEqual([row.members, row.lines], [[], []]);
    assert.equal(row.rows.length, 2);
    for (const body of ["$f = 'env'; $f('APP_KEY');", "(new ReflectionFunction('env'))->invoke('APP_KEY');"])
      assert.ok((await php(body, "env")).lines.includes(2), body);
    assert.deepEqual(await php("$cfg = ['env' => 'production']; getenv('env');", "env"), ok(["env"]));
  });

  it("applies imports from where they are and reads more include paths", async () => {
    assert.deepEqual(
      (await php("namespace App;\nFoo::bar();\nuse Lib\\Foo;\nFoo::baz();", "calls")).members,
      ["App\\Foo::bar", "Lib\\Foo::baz"],
    );
    assert.deepEqual(
      await php("require __DIR__ . '/../lib/' . 'helpers.inc';\nrequire dirname(__DIR__) . '/x.php';\nrequire __dir__ . '/y.php';\nrequire dirname(__FILE__, 2) . '/z.php';", "imports"),
      ok(["lib/helpers.inc", "src/y.php", "x.php", "z.php"]),
    );
    assert.deepEqual(await php('echo "home $_SERVER[HOME]";', "env"), ok(["HOME"]));
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
    assert.deepEqual(env.lines, []);
  });

  it("lists calls, macro expansions and functions handed on", async () => {
    const calls = await read("src/a.c", source, "calls");
    assert.deepEqual(calls.members, [
      "*.run",
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
    assert.deepEqual(calls.lines, []);
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
    assert.match(env.rows[0], /^local\.h may define macros this file uses: /);
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
      ["c", ["'x'"]],
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
          lines("#define S(x) #x", "int main(void) { int y = S; return y; }"),
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

  it("refuses keys that are evaluated", async () => {
    for (const content of [
      lines("locals {", '  objs = [for k in ["acl"] : { (k) = "public-read" }]', "}"),
      lines("locals {", '  objs = [for k, v in { a = "acl" } : { (v) = "public-read" }]', "}"),
      lines("locals {", '  m = regex("^(?P<acl>[a-z-]+)$", "public-read")', "}"),
      lines("locals {", '  m = regexall("(?P<acl>[a-z-]+)", "public-read")', "}"),
      lines("locals {", '  m = core::jsondecode("{}")', "}"),
      lines("locals {", '  m = core::zipmap(["acl"], ["x"])', "}"),
      lines("locals {", '  m = provider::aws::arn_parse("x")', "}"),
      lines("locals {", '  m = { for k, v in var.x : k => v }', "}"),
    ])
      assert.deepEqual((await property(content)).lines, [2], content);
    // A literal in parentheses is still a name.
    assert.deepEqual(
      await property(lines("locals {", '  m = { ("acl") = "private", (local.other) = 1 }', "}")),
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
      lines("locals {", "  days = 007", "  days = 3.0e3", "  days = 1.50", "  days = -0", "}"),
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
      (await property(lines("locals {", '  actions = [', '    "s3:Get", # read', '    /* c */ "s3:Put",', "  ]", "}"), "actions")).members,
      ["s3:Get", "s3:Put"],
    );
  });

  it("reads a variable's type as a constraint, with optional defaults as values", async () => {
    const read1 = await property(
      lines(
        'variable "bucket" {',
        "  type = object({",
        "    acl  = optional(string, \"private\")",
        "    name = optional(string)",
        "    tags = map(string)",
        "  })",
        "}",
      ),
    );
    assert.deepEqual(read1, { members: ["private"], lines: [], rows: [] });
  });

  it("refuses a Terragrunt include, which merges another file", async () => {
    const content = lines('include "root" {', '  path = find_in_parent_folders("root.hcl")', "}", "inputs = {", '  acl = "private"', "}");
    assert.deepEqual((await property(content, "acl", "terragrunt.hcl")).lines, [1]);
    assert.deepEqual(
      (await property(lines("locals {", '  common = read_terragrunt_config("common.hcl")', "}"), "acl", "terragrunt.hcl")).lines,
      [2],
    );
  });
});
