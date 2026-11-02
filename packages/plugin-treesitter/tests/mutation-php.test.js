// executable_for TEST-kibi-tree-sitter-script-references
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { validateReferenceExtractionResult } from "kibi-plugin-sdk";

globalThis.fetch = async () => {
  throw new Error("network access is disabled in this test");
};

const { createTreeSitterReferenceExtractor } = await import("../dist/index.js");
const extractor = createTreeSitterReferenceExtractor();

/** The whole result of one extract of `<?php\n${body}\n`. */
async function run(body, extract, options = {}) {
  const result = await extractor.extract({
    path: options.path ?? "src/a.php",
    content: `<?php\n${body}\n`,
    extract,
    ...options,
  });
  assert.deepEqual(validateReferenceExtractionResult(result), result);
  assert.equal(result.status, "ok", JSON.stringify(result));
  return result;
}

/** Members (sorted, unique) and the unresolved rows as `line: text`. */
async function php(body, extract, options = {}) {
  const result = await run(body, extract, options);
  return {
    members: [...new Set(result.members)].sort(),
    rows: result.unresolved.map((row) => `${row.line}: ${row.text}`),
  };
}

/** The values of key `k` in `$a = ['k' => <value>];`, or "refused". */
async function value(source) {
  const { members, rows } = await php(`$a = ['k' => ${source}];`, "property", {
    key: "k",
  });
  if (rows.length > 0) {
    assert.deepEqual(members, [], source);
    return "refused";
  }
  assert.equal(members.length, 1, source);
  return members[0];
}

async function values(cases) {
  for (const [source, expected] of cases)
    assert.deepEqual(await value(source), expected, source);
}

/** Each `[body, members, rows = []]` read as `extract`. */
async function reads(extract, cases, options = {}) {
  for (const [body, members, rows = []] of cases)
    assert.deepEqual(
      await php(body, extract, options),
      { members, rows },
      body,
    );
}

const lines = (...rows) => rows.join("\n");

describe("PHP literal values", () => {
  it("decodes the escapes of a double-quoted string", async () => {
    await values([
      ['"\\n\\t\\r\\v\\e\\f\\\\\\$\\""', '\n\t\r\v\x1b\f\\$"'],
      ['"x\\x41\\x4a\\101\\u{42}"', "xAJAB"],
      ['"\\u{e9}\\xc3\\xa9"', "éé"],
      ['"\\400"', "\0"],
      ['"\\u{10FFFF}"', "\u{10FFFF}"],
      ['"\\u{D7FF}\\u{E000}"', "\u{D7FF}\u{E000}"],
      ['"\\u{110000}"', "refused"],
      ['"\\u{D800}"', "refused"],
      ['"\\u{DFFF}"', "refused"],
      ['"\\xff"', "refused"],
      ['"a$x"', "refused"],
      ['"a{$x}"', "refused"],
      ['b"q\\x41"', "qA"],
      ['"\\q"', "\\q"],
    ]);
  });

  it("reads single-quoted strings", async () => {
    await values([
      ["'a\\\\b\\'c\\n'", "a\\b'c\\n"],
      ["b'q'", "q"],
      ["B'\\\\'", "\\"],
      ["''", ""],
    ]);
  });

  it("reads integers by value", async () => {
    await values([
      ["0X1F", "31"],
      ["0B11", "3"],
      ["0O17", "15"],
      ["0_7", "7"],
      ["0", "0"],
      ["00", "0"],
      ["100", "100"],
      ["10755", "10755"],
      ["0755", "493"],
      ["9223372036854775807", "9223372036854775807"],
      ["9223372036854775808", "refused"],
      ["-+5", "refused"],
    ]);
  });

  it("reads floats only where a double holds them exactly", async () => {
    await values([
      ["1_000.5", "1000.5"],
      ["1.23456789012345", "1.23456789012345"],
      ["1.234567890123456", "refused"],
      ["1000000000000000.5", "refused"],
      ["0.00123456789012345", "0.00123456789012345"],
      ["1.50000000000000000", "1.5"],
      ["1.23456789012345e14", "123456789012345"],
      ["1.23456789012345E14", "123456789012345"],
      ["1e999", "refused"],
      ["1e21", "refused"],
      [".5", "0.5"],
    ]);
  });

  it("reads heredocs and nowdocs less the closing indentation", async () => {
    await values([
      ["<<<X\nX", "refused"],
      ["<<<X\n  a\n   b\n  X", "a\n b"],
      ["<<<X\n\ta\n\tX", "a"],
      ["<<<X\n  a\n b\n  X", "refused"],
      ["<<<X\n  a\\qb\n  X", "refused"],
      ["<<<X\n  a\\n\n  X", "refused"],
      ["<<<X\n  a$v\n  X", "refused"],
      ["<<<'X'\n  a\\qb\n  X,", "a\\qb"],
      ["<<<X\n  a\n\n \n   \n  b\n  X", "a\n\n\n \nb"],
      ["<<<X\r\n  a\r\n \r\n\r\n  b\r\n  X", "a\r\n\r\n\r\nb"],
      ["<<<X\r\n  a\r\r\n  X", "a\r"],
      ['<<<"X"\nx\nX', "x"],
      ["<<<X\n x\nX", " x"],
    ]);
  });
});

describe("PHP computed literals", () => {
  it("reads negated numbers, `.` chains and X::class", async () => {
    await values([
      ["+5", "refused"],
      ["-0", "0"],
      ["-0.0", "0"],
      ["'1' + '2'", "refused"],
      ["'a' . true", "a1"],
      ["'a' . false", "a"],
      ["'a' . null", "a"],
      ["'a' . 1.5", "refused"],
      ["'a' . -1.5", "refused"],
      ["'a' . -1", "a-1"],
      ["'a' . (1.5)", "a1.5"],
      ["X::FOO", "refused"],
      ["X::class", "X"],
    ]);
  });
});

describe("PHP included paths", () => {
  const include = (body, members, rows) => [
    body,
    members,
    rows ?? (members.length === 0 ? [`2: ${body.slice(0, -1)}`] : []),
  ];
  it("resolves a path from the file's folder", async () => {
    await reads(
      "imports",
      [
        include("include 'php://memory';", []),
        include("include 'a1+.-b://x';", []),
        include("include 'data:text/plain,x';", []),
        include("include 'lib/a://b.php';", ["lib/a://b.php"]),
        include("include 'lib/data:x.php';", ["lib/data:x.php"]),
        include("include ('x.php');", ["x.php"]),
        include("include (__DIR__) . '/x.php';", ["app/src/lib/x.php"]),
        include("include (__DIR__ /*c*/) . '/x.php';", []),
        include("include __DIR__ + '/x.php';", []),
        include("include $base . '/x.php';", []),
        include("include __DIR__ . MY_DIRECTORY_SEPARATOR . 'x.php';", []),
        include("include __DIR__ . DIRECTORY_SEPARATOR_X . 'x.php';", []),
        include("include __DIR__ . \\DIRECTORY_SEPARATOR . 'x.php';", [
          "app/src/lib/x.php",
        ]),
        include("include __DIR__ . '/' . $x;", []),
        include("include __DIR__ . 'x.php';", []),
        include("include __DIR__;", []),
        include("include X__DIR__ . '/a.php';", []),
        include("include __DIR__X . '/a.php';", []),
        include("include dirname(X__FILE__) . '/a.php';", []),
        include("include dirname(__FILE__X) . '/a.php';", []),
        include("include dirname(__FILE__) . '/a.php';", ["app/src/lib/a.php"]),
        include("include dirname( __DIR__ , 2 ) . '/a.php';", ["app/a.php"]),
        include("include dirname(Xdirname(__DIR__)) . '/a.php';", []),
        include("include Xdirname(__DIR__) . '/a.php';", []),
        include("include dirname(__DIR__)[0] . '/a.php';", []),
        include("include dirname(__DIR__, 10) . '/a.php';", [
          "../../../../../../../a.php",
        ]),
        include("include dirname($x) . '/a.php';", []),
        include("include __FILE__ . '/x.php';", []),
        include("include dirname(dirname(__FILE__)) . '/a.php';", [
          "app/src/a.php",
        ]),
        include("include \\dirname(__DIR__) . '/a.php';", ["app/src/a.php"]),
      ],
      { path: "app/src/lib/a.php" },
    );
  });
});

describe("PHP call targets", () => {
  it("names self and parent only where the class is known", async () => {
    await reads("calls", [
      [
        "$o = new class { function m() { self::x(); parent::y(); } }; class C { function m() { parent::z(); } }",
        ["*.x", "*.y", "*.z"],
      ],
      ["Foo \\ bar(); \\Foo\\baz();", ["foo\\bar", "foo\\baz"]],
      [
        "('trim')($x); (\"strlen\")($y); ((('ucfirst')))($z);",
        ["strlen", "trim", "ucfirst"],
      ],
      [
        "('TRIM')($x); \\exit(1); die('x'); $o?->m(); namespace\\Foo::m(); $c::m(); X::{'m'}(); $o->{'m'}(); new Fiber;",
        ["*.m", "Foo::m", "die", "exit", "trim"],
        ["2: X::{'m'}()", "2: $o->{'m'}()"],
      ],
      ["\\exit(1);", ["die", "exit"]],
    ]);
  });

  it("names the callables a builtin is handed", async () => {
    await reads("calls", [
      [
        "class C { function m() { array_map('self::ab', $x); array_map('Foo::b', $x); array_map('TRIM', $x); array_map('X\\self::c', $x); array_map(function($x){}, $x); array_map(fn($x) => 1, $x); array_map([$o, 'm'], $x); array_map(strlen(...), $x); } }",
        ["*.m", "C::ab", "Foo::b", "X\\self::c", "array_map", "strlen", "trim"],
      ],
      [
        "new class { function m() { array_map('self::p', []); } };",
        ["*.p", "array_map"],
      ],
      ...[
        "[X::class, 'm', 'z']",
        "['k' => X::class, 'm']",
        "[X::class, $m]",
        "strlen()",
        "strlen($y)",
      ].map((handed) => [
        `array_map(${handed}, $x);`,
        handed.startsWith("strlen") ? ["array_map", "strlen"] : ["array_map"],
        [`2: ${handed}`],
      ]),
      ["array_map($o->m(...), $x);", ["*.m", "array_map"], ["2: $o->m(...)"]],
    ]);
  });

  it("reads first arguments of the callee only", async () => {
    await reads(
      "string_args",
      [
        [
          "exec(/*c*/'ls'); exec(); exec(...); exec(...$a); xxexec('a'); $o->run('x'); $f('x');",
          ["ls"],
          ["2: exec(...)", "2: exec(...$a)", "2: $f('x')"],
        ],
      ],
      { callee: "exec" },
    );
    await reads("string_args", [["$o->exec('x');", ["x"]]], {
      callee: "*.exec",
    });
    await reads(
      "string_args",
      [["$db->prepare('x');", [], ["2: $db->prepare('x')"]]],
      { callee: "Db\\Pdo::prepare" },
    );
  });

  it("names thrown method calls", async () => {
    await reads("thrown", [
      ["throw $o->make(); throw $o?->make();", ["*.make"]],
    ]);
  });
});

describe("PHP environment class reads", () => {
  it("refuses an unknown object's getter where the file names Env", async () => {
    for (const marker of [
      "Env::",
      "Env ::",
      "new Env",
      "new  Env",
      "extends Env",
      "extends  Env",
      "\\Env",
      "Illuminate\\Support",
      "Illuminate \\ Support",
    ])
      await reads("env", [
        [`// ${marker}\n$e->get('X');`, [], ["3: $e->get('X')"]],
      ]);
    for (const marker of ["newEnv", "xEnv::", "new Envy", ""])
      await reads("env", [[`// ${marker}\n$e->get('X');`, []]]);
  });

  it("follows the classes the file declares", async () => {
    await reads("env", [
      [
        "$cls::get('X'); static::get('Y');",
        [],
        ["2: $cls::get('X')", "2: static::get('Y')"],
      ],
      [
        "Illuminate\\Support\\Env::getRepository('X');",
        [],
        ["2: Illuminate\\Support\\Env::getRepository('X')"],
      ],
      ["class A extends B {} class B extends A {} A::get('X');", []],
      [
        "function Foo() {} Foo::get('X');",
        [],
        [
          "2: Foo may be Illuminate\\Support\\Env or a class that extends it: Foo::get('X')",
        ],
      ],
      ["class Foo {} Foo::get('X'); abget('Y');", []],
      ["namespace App; class Foo {} Foo::get('X');", []],
      [
        "class C extends \\Illuminate\\Support\\Env { function m() { $this->get('X'); ($this)->get('Y'); (new static)->get('Z'); (new self)->get('W'); } }",
        ["W", "X", "Y"],
        ["2: (new static)->get('Z')"],
      ],
      [
        "(new Env)->get('X'); (new \\Illuminate\\Support\\Env)->getOrFail('Y');",
        ["Y"],
        [
          "2: Env may be Illuminate\\Support\\Env or a class that extends it: (new Env)->get('X')",
        ],
      ],
    ]);
  });
});

describe("PHP namespaces and imports", () => {
  it("lists imports of every form", async () => {
    await reads("imports", [
      [
        lines(
          "use Foo \\ Bar;",
          "use Grp\\{function /* f */ c, const D, E};",
          "use FUNCTION Fn\\{a, b as bb};",
          "use \\Lead\\Name;",
          "use /* a */ Foo\\Baz;",
          "use Grp\\{ /* d */ G};",
        ),
        [
          "Fn\\a",
          "Fn\\b",
          "Foo\\Bar",
          "Foo\\Baz",
          "Grp\\D",
          "Grp\\E",
          "Grp\\G",
          "Grp\\c",
          "Lead\\Name",
        ],
      ],
    ]);
  });

  it("resolves function, constant and class imports apart", async () => {
    await reads("calls", [
      [
        lines(
          "use FUNCTION Fn\\{a, b as bb};",
          "use Grp\\{function /* f */ c, const D, E};",
          "use function Foo\\helper as h;",
          "use const K\\X;",
          "a(); bb(); c(); h(); X::m(); D::m(); E::m();",
        ),
        [
          "D::m",
          "Grp\\E::m",
          "X::m",
          "fn\\a",
          "fn\\b",
          "foo\\helper",
          "grp\\c",
        ],
      ],
      ["use Foo\\Bar;Bar::x();", ["Foo\\Bar::x"]],
      ["Bar::x();use Foo\\Bar;", ["Bar::x"]],
    ]);
  });

  it("matches a callee by its whole name or its last segment", async () => {
    await reads(
      "string_args",
      [
        [
          "exec('a'); Foo\\exec('b'); X::exec('c'); Xexec('d'); exec\\x('e');",
          ["a", "b", "c"],
        ],
      ],
      { callee: "exec" },
    );
    await reads("string_args", [["('')('x'); exec('y');", []]], {
      callee: "",
    });
  });

  it("scopes names to braced, unbraced and global namespaces", async () => {
    await reads("calls", [
      ["namespace { getenv('X'); function f() {} f(); }", ["f", "getenv"]],
      [
        "namespace App; class helper {} helper();",
        ["helper"],
        ["2: helper may be a function of namespace App: helper()"],
      ],
      [
        "namespace App; { function f() {} } declare(ticks=1) { function g() {} } f(); g();",
        ["app\\f", "app\\g"],
      ],
      [
        "namespace A;foo();",
        ["foo"],
        ["2: foo may be a function of namespace A: foo()"],
      ],
      ["namespace A {} foo();", ["foo"]],
      ["namespace A {}foo();", ["foo"]],
      [
        "Foo \\ Bar::x(); Foo\\Bar::y(); namespace\\helper();",
        ["Foo\\Bar::x", "Foo\\Bar::y", "helper"],
      ],
      [
        "namespace App; Foo\\Bar::y(); namespace\\helper();",
        ["App\\Foo\\Bar::y", "app\\helper"],
      ],
    ]);
  });

  it("does not name self in a closure the file may rebind", async () => {
    const method = (rebind) =>
      `class C { function m() { $f = function() { self::x(); }; ${rebind} } }`;
    for (const rebind of [
      "$f->call($o);",
      "$f -> call ( $o);",
      "$f->bindTo($o);",
      "$f->bindTo ($o);",
      "Closure::bind($f, $o);",
      "Closure :: bind ( $f, $o);",
      "X::macro('m', $f);",
      "$x -> mixin ($f);",
      "call_user_func([$fn,'call'], $o);",
      'call_user_func_array ( [ $fn , "call" ], [$o]);',
    ]) {
      const { members } = await php(method(rebind), "calls");
      assert.ok(members.includes("*.x"), rebind);
      assert.ok(!members.includes("C::x"), rebind);
    }
    assert.ok(
      (await php(method("$f->rebindTo($o);"), "calls")).members.includes(
        "C::x",
      ),
    );
  });
});

describe("PHP callables handed to builtins", () => {
  it("refuses class_alias and reads other callables by name", async () => {
    await reads("calls", [
      [
        "call_user_func('my_class_alias'); call_user_func('class_alias_x'); call_user_func('Class_Alias', 'A', 'B');",
        ["call_user_func", "class_alias_x", "my_class_alias"],
        ["2: 'Class_Alias'"],
      ],
      [
        "array_map(...$args); array_map('trim', ...$args); array_map(); array_map(array: $x, callback: 'trim'); array_map(callback: 'ltrim', array: $x);",
        ["array_map", "ltrim", "trim"],
        ["2: array_map(...$args)", "2: array_map('trim', ...$args)"],
      ],
      [
        "assert_options(ASSERT_CALLBACK, value: 'cb'); usort($a, value: 'x'); assert_options(callback: 'cb2'); assert_options(what: 'w'); array_map(...);",
        ["array_map", "assert_options", "cb", "cb2", "usort"],
      ],
      [
        "curl_setopt_array($ch, [/*c*/ CURLOPT_URL => 'x']);",
        ["curl_setopt_array"],
        ["2: /*c*/"],
      ],
      [
        "preg_replace_callback_array(); preg_replace_callback_array(['system'], $s); preg_replace_callback_array($m, $s);",
        ["preg_replace_callback_array", "system"],
        ["2: $m"],
      ],
      [
        "curl_setopt($ch); curl_setopt_array($ch); curl_setopt_array($ch, $opts); curl_setopt_array($ch, ['x', CURLOPT_WRITEFUNCTION => 'w']);",
        ["curl_setopt", "curl_setopt_array", "w"],
        ["2: $opts", "2: 'x'"],
      ],
      [
        "curl_setopt($ch, CURLOPT_URL . '', $v); curl_setopt($ch, MY_CURLOPT_WRITEFUNCTION, 'a'); curl_setopt($ch, CURLOPT_FUNCTION_X, 'cb'); curl_setopt($ch, \\CURLMOPT_PUSHFUNCTION, 'p');",
        ["curl_setopt", "p"],
        ["2: CURLOPT_URL . ''", "2: MY_CURLOPT_WRITEFUNCTION"],
      ],
    ]);
  });

  it("reads a handed callable for env and string_args only", async () => {
    await reads("env", [
      [
        "call_user_func($o->cb, 'X'); call_user_func([$a, $b, $c], 'Y'); call_user_func([$c, $a], 'Z');",
        [],
        [
          "2: $o->cb",
          "2: [$a, $b, $c]",
          "2: the callable's class may be Illuminate\\Support\\Env or a class that extends it: [$c, $a]",
        ],
      ],
      [
        "array_map([\\Illuminate\\Support\\Env::class, 'get'], $xs); array_map(fn($x) => 1, $xs);",
        [],
        ["2: [\\Illuminate\\Support\\Env::class, 'get']"],
      ],
      ["array_map('static::get', $x);", [], ["2: 'static::get'"]],
    ]);
    await reads(
      "string_args",
      [
        [
          "array_map(fn($x) => 1, $x); array_map('trim', $x); array_map('xxexec', $x); array_map([$o, 'run'], $x); array_map([$o, 'exec'], $x);",
          [],
          ["2: [$o, 'exec']"],
        ],
      ],
      { callee: "exec" },
    );
    await reads("property", [["array_map($cb, $x); new Fiber($cb);", []]], {
      key: "acl",
    });
    await reads("thrown", [
      ["array_map($cb, $x); new Fiber($cb); throw new E;", ["E"], ["2: $cb"]],
    ]);
  });
});

describe("PHP rethrown catch variables", () => {
  const inFunction = (body) =>
    `function f() { try {} catch (E $e) { ${body} } }`;
  it("trusts a catch variable that is only read", async () => {
    for (const body of [
      'echo "msg $e"; $e->code; $e?->code; $e->m(); $e?->m(); throw $e;',
      "$x = 'x' . $e; $y = $e instanceof X; throw $e;",
      "new RuntimeException('x', 0, $e); print_r($e); throw $e;",
      "$a = [$e, 'k' => $e]; throw $e;",
      "try {} catch (B $x) { throw $e; }",
    ])
      await reads("thrown", [[inFunction(body), []]]);
    await reads("thrown", [["try {} catch (E $e) { throw $e; }", []]]);
  });

  it("refuses a catch variable something may replace", async () => {
    for (const body of [
      "$f = function() use ($e) { throw $e; }; throw $e;",
      "$f = fn() => $e; throw $e;",
      "class K { function m() { $e; } } throw $e;",
      "$o->$e; throw $e;",
      "$o->m($e); throw $e;",
      "$y = $x instanceof $e; throw $e;",
      "$y = $e + 1; throw $e;",
      "new MyEx($e); throw $e;",
      "strtoupper($e); throw $e;",
      "$a = [$e => 1]; throw $e;",
      "$a = ['k' => & $e]; throw $e;",
      "$a = [&$e]; throw $e;",
      "$x = $e; throw $e;",
      "include 'x.php'; throw $e;",
      "try {} catch (B $e) { $e = new C; throw $e; }",
      "$f = fn() => throw $e; throw $e;",
      "function g() { throw $e; } throw $e;",
      'class K { public $p = "$e"; } throw $e;',
      "new $cls($e); throw $e;",
    ]) {
      const { rows } = await php(inFunction(body), "thrown");
      assert.ok(rows.includes("2: throw $e"), body);
    }
    for (const body of [
      "function f() { try {} catch (E $e) { throw $e; } GLOBAL $e; }",
      "function f() { try {} catch (E $e) { throw $e; } extract ($x); }",
      "try {} catch (E $e) { f(); throw $e; }",
      "try {} catch (E $e) { `ls`; throw $e; }",
      "function f() { try { throw $e; } catch (A $e) {} }",
      "function f() { try {} catch (A) { throw $e; } }",
      "function f($e = throw $e) {}",
      "class C { public $e = throw $e; }",
    ])
      await reads("thrown", [[body, [], ["2: throw $e"]]]);
  });
});

describe("PHP keys a write may set", () => {
  const p = (body, key, members, rows = []) =>
    reads("property", [[body, members, rows]], { key });
  it("appends at a number key", async () => {
    for (const key of ["0", "10", "5"])
      await p("$a[] = 'x';", key, [], ["2: $a[] = 'x'"]);
    for (const key of ["-1", "01", "1x", "acl"])
      await p("$a[] = 'x';", key, []);
  });

  it("names written properties and constants", async () => {
    await p("$a[CURLOPT_URL] = 'x';", "acl", []);
    await p("$o?->acl = 'x';", "acl", ["x"]);
    await p("X::$acl = 'x'; X::$$v = 'y';", "acl", ["x"], ["2: X::$$v = 'y'"]);
    await p("$o->{'acl'} = 'x';", "zz", [], ["2: $o->{'acl'} = 'x'"]);
    const curl =
      "$o = [CURLOPT_URL => 'x', 'acl' => 'y', 5 => 'z', -5 => 'w'];";
    for (const key of ["0", "10002"])
      await p(curl, key, [], ["2: CURLOPT_URL => 'x'"]);
    await p(curl, "-5", ["w"], ["2: CURLOPT_URL => 'x'"]);
    for (const key of ["05", "5x", "x5", "-0"]) await p(curl, key, []);
    await p(curl, "acl", ["y"]);
  });

  it("refuses a constant defined twice", async () => {
    await p(
      "define ('K', 1); define('K', 2);",
      "K",
      [],
      ["2: define ('K', 1)", "2: define('K', 2)"],
    );
    for (const first of [
      "const  K = 1",
      "const int K = 1",
      "const int  K = 1",
      "const K= 1",
    ])
      await p(
        `${first}; const K = 2;`,
        "K",
        [],
        [`2: ${first.replace(/^const (?:int )? ?/, "")}`, "2: K = 2"],
      );
    await p("const A = 1; const B = 2;", "A", ["1"]);
    await p("class C { const int K = 1; }", "K", ["1"]);
  });

  it("stores bool, float and negative keys as PHP does", async () => {
    const body =
      "$a = [false => 'f', 1.7 => 'g', -1.7 => 'h', -0.5 => 'i', -5 => 'j', 1e20 => 'k'];";
    await p(body, "1", ["g"], ["2: 1e20 => 'k'"]);
    await p(body, "-1", ["h"], ["2: 1e20 => 'k'"]);
    await p(body, "-5", ["j"], ["2: 1e20 => 'k'"]);
    await p(body, "0", [], ["2: 1e20 => 'k'", `2: ${body.slice(5, -1)}`]);
    await p("$a = [1e999 => 'x'];", "0", [], ["2: 1e999 => 'x'"]);
    await p("$a = [-$x => 'x'];", "0", [], ["2: -$x => 'x'"]);
    await p("$a = [-9007199254740993 => 'x'];", "-9007199254740993", ["x"]);
  });

  it("knows the integer constants of curl and PDO", async () => {
    await p(
      "$a = [MY_CURLOPT_X => 'x', CURLOPT_URLX => 'y', \\CURLOPT_URL => 'z', Foo\\CURLOPT_URL => 'w', CURLOPT_X\\Y => 'v'];",
      "acl",
      [],
      [
        "2: MY_CURLOPT_X => 'x'",
        "2: Foo\\CURLOPT_URL => 'w'",
        "2: CURLOPT_X\\Y => 'v'",
      ],
    );
    await p(
      "const CURLOPT_ACL = 'acl'; $a = [CURLOPT_ACL => 'x'];",
      "acl",
      [],
      ["2: CURLOPT_ACL => 'x'"],
    );
    await p(
      "$a = [\\CURLOPT_ACL => 'x']; define('CURLOPT_ACL', 'acl');",
      "acl",
      [],
      ["2: \\CURLOPT_ACL => 'x'"],
    );
    await p(
      "include 'x.php'; $a = [CURLOPT_URL => 'x'];",
      "acl",
      [],
      ["2: CURLOPT_URL => 'x'"],
    );
    await p(
      "$a = [PDO::ATTR_ERRMODE => 1, PDO::MY_ATTR_X => 2];",
      "acl",
      [],
      ["2: PDO::MY_ATTR_X => 2"],
    );
    for (const owner of ["X", "$x"])
      await p(
        `$a = [${owner}::ATTR_ERRMODE => 1];`,
        "acl",
        [],
        [`2: ${owner}::ATTR_ERRMODE => 1`],
      );
    await p(
      "namespace App; $a = [PDO::ATTR_ERRMODE => 1];",
      "acl",
      [],
      ["2: PDO::ATTR_ERRMODE => 1"],
    );
  });
});
