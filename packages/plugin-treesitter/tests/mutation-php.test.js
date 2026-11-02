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

describe("PHP array literals and array builtins", () => {
  const p = (key, cases) => reads("property", cases, { key });

  it("numbers the implicit keys of an array literal", async () => {
    await p("k", [
      ["$a = [/*c*/ 'k' => 'v'];", ["v"]],
      ["$a = ['k' => /*c*/ 'v'];", ["v"]],
      ["$a = [...$d, 'k' => 'x'];", [], ["2: [...$d, 'k' => 'x']"]],
      ["$o = [...$d] + $x;", [], ["2: [...$d]"]],
      ["$o += [...$d];", [], ["2: [...$d]"]],
      [
        "$o += ['j' => 'y', 'k' => 'x'];",
        ["x"],
        ["2: $o += ['j' => 'y', 'k' => 'x']"],
      ],
      ["$o += [$j => 'x'];", [], ["2: $o += [$j => 'x']", "2: $j => 'x'"]],
    ]);
    await p("1", [
      ["$a = ['a', 'b'];", ["b"]],
      ["$a = [0 => 'a', 'b'];", ["b"]],
    ]);
    await p("0", [
      ["$a = [-5 => 'a', 'b'];", [], ["2: [-5 => 'a', 'b']"]],
      ["$a = ['5x' => 'a', 'b'];", ["b"]],
      ["$a = ['05' => 'a', 'b'];", ["b"]],
      ["$a = [CURLOPT_URL => 'a', 'b'];", ["b"], ["2: CURLOPT_URL => 'a'"]],
    ]);
    await p("-3", [["$a = [-5 => 'a', -3 => 'c'];", ["c"]]]);
    await p("6", [
      ["$a = [5 => 'a', 2 => 'b', 'c'];", ["c"]],
      ["$a = ['05' => 'a', 'b'];", []],
    ]);
    await p("11", [["$a = [10 => 'a', 'b'];", ["b"]]]);
  });

  it("reads define and compact", async () => {
    await p("K", [
      ["define();", [], ["2: define()"]],
      ["define(...);", [], ["2: define(...)"]],
      ["define('K');", [], ["2: define('K')"]],
      ["define('K', foo: 1);", [], ["2: define('K', foo: 1)"]],
      ["define(value: 1, constant_name: 'K');", ["1"]],
      ["define(VALUE: 1, Constant_Name: 'K');", ["1"]],
      ["define('OTHER', 1); define('K', 2);", ["2"]],
      ["define('K', $x);", [], ["2: define('K', $x)"]],
    ]);
    await p("k", [
      ["compact('k');", [], ["2: 'k'"]],
      ["compact('j');", []],
      ["compact($x);", [], ["2: $x"]],
    ]);
  });

  it("refuses a merge a later array may overwrite", async () => {
    await p("k", [
      ["$o = my_array_merge(['k' => 'x'], $y);", ["x"]],
      ["$o = array_merge_x(['k' => 'x'], $y);", ["x"]],
      ["$o = foo(['k' => 'x'], $y);", ["x"]],
      ["$o = array_merge(...);", []],
      ["$o = array_merge(['k' => 'x'], ['j' => 'y']);", ["x"]],
      [
        "$o = array_merge(['k' => 'x'], $y);",
        ["x"],
        ["2: array_merge(['k' => 'x'], $y)"],
      ],
      ["$o = array_merge($y, ['k' => 'x']);", ["x"]],
    ]);
    await p("acl", [
      [
        "f(array_merge_recursive($y, ['acl' => 'x']));",
        ["x"],
        ["2: array_merge_recursive($y, ['acl' => 'x'])"],
      ],
      ["f(array_merge($y, ['acl' => 'x']));", ["x"]],
      ["f(array_merge_recursive(['acl' => 'x'], ['j' => 'y']));", ["x"]],
    ]);
    await p("0", [
      ["$o = array_merge([0 => 'x']);", ["x"], ["2: array_merge([0 => 'x'])"]],
      ["$o = array_replace([0 => 'x']);", ["x"]],
      [
        "f(array_merge_recursive([0 => 'x']));",
        ["x"],
        ["2: array_merge_recursive([0 => 'x'])"],
      ],
    ]);
  });

  it("refuses a whole-array rewrite stored back", async () => {
    const replace = "str_replace('a', 'b', $o)";
    const row = [`2: ${replace}`];
    await p("acl", [
      [`function f($o) { $o = ${replace}; }`, []],
      [`function f($o) { $o = (${replace}); }`, []],
      [`function f($o) { $p = 'acl'; $o = ${replace}; }`, [], row],
      [`function f($o) { $p = 'acl'; $o = (${replace}); }`, [], row],
      [`function f($o) { $p = 'acl'; f(${replace}); }`, []],
      [`function f($o) { include 'x.php'; $o = ${replace}; }`, [], row],
      [`function f($o) { require_once 'x.php'; $o = ${replace}; }`, [], row],
      [`$o = ${replace};`, [], row],
      [`f(${replace});`, []],
      [`${replace} = 1;`, []],
      [`$o = f(${replace});`, []],
      ["function f($o) { array_splice($o, 1); }", []],
      [
        "function f($o) { $p = 'acl'; array_splice($o, 1); }",
        [],
        ["2: array_splice($o, 1)"],
      ],
      [
        "function f($o) { $o = array_change_key_case($o); return $o['ACL']; }",
        [],
        ["2: array_change_key_case($o)"],
      ],
      ["function f($o) { $o = array_change_key_case($o); }", []],
      [
        "f(array_change_key_case($o)); $p = 'Acl';",
        [],
        ["2: array_change_key_case($o)"],
      ],
    ]);
  });

  it("refuses builtins that renumber or build keys", async () => {
    await p("0", [
      ["array_push($o, 'x');", [], ["2: array_push($o, 'x')"]],
      ["array_unshift($o, 'x');", [], ["2: array_unshift($o, 'x')"]],
      ["array_shift($o);", [], ["2: array_shift($o)"]],
      ["array_pop($o);", [], ["2: array_pop($o)"]],
      ["my_array_push($o, 'x');", []],
      ["array_push_x($o, 'x');", []],
    ]);
    await p("acl", [
      ["array_push($o, 'x');", []],
      ["$o = array_combine($k, $v);", [], ["2: array_combine($k, $v)"]],
      ["$o = array_flip($v);", [], ["2: array_flip($v)"]],
      ["$o = array_fill_keys($v, 1);", [], ["2: array_fill_keys($v, 1)"]],
    ]);
  });

  it("refuses array_walk unless the callback takes values by value", async () => {
    const cases = [
      ["function ($v) {}", true],
      ["function () {}", true],
      ["fn ($v) => $v", true],
      ["function (&$v) {}", false],
      ["function (/*c*/ &$v) {}", false],
      ["fn (&$v) => $v", false],
      ["'trim'", false],
    ];
    for (const walk of ["array_walk", "array_walk_recursive"])
      for (const [callback, byValue] of cases) {
        const call = `${walk}($o, ${callback})`;
        await p("acl", [[`${call};`, [], byValue ? [] : [`2: ${call}`]]]);
      }
    await p("acl", [["array_walk($o);", [], ["2: array_walk($o)"]]]);
  });
});

describe("PHP builtin tables", () => {
  it("names the callables each builtin is handed", async () => {
    const table = [
      ["call_user_func", [0]],
      ["call_user_func_array", [0]],
      ["forward_static_call", [0]],
      ["forward_static_call_array", [0]],
      ["array_map", [0]],
      ["array_filter", [1]],
      ["array_find", [1]],
      ["array_find_key", [1]],
      ["array_any", [1]],
      ["array_all", [1]],
      ["array_walk", [1]],
      ["array_walk_recursive", [1]],
      ["array_reduce", [1]],
      ["usort", [1]],
      ["uasort", [1]],
      ["uksort", [1]],
      ["array_udiff", [4]],
      ["array_uintersect", [4]],
      ["array_diff_uassoc", [4]],
      ["array_diff_ukey", [4]],
      ["array_intersect_uassoc", [4]],
      ["array_intersect_ukey", [4]],
      ["array_udiff_assoc", [4]],
      ["array_uintersect_assoc", [4]],
      ["array_udiff_uassoc", [3, 4]],
      ["array_uintersect_uassoc", [3, 4]],
      ["iterator_apply", [1]],
      ["register_shutdown_function", [0]],
      ["register_tick_function", [0]],
      ["spl_autoload_register", [0]],
      ["set_error_handler", [0]],
      ["set_exception_handler", [0]],
      ["ob_start", [0]],
      ["preg_replace_callback", [1]],
      ["mb_ereg_replace_callback", [1]],
      ["header_register_callback", [0]],
      ["pcntl_signal", [1]],
      ["sapi_windows_set_ctrl_handler", [0]],
      ["readline_completion_function", [0]],
      ["readline_callback_handler_install", [1]],
      ["libxml_set_external_entity_loader", [0]],
      ["xml_set_element_handler", [1, 2]],
      ["xml_set_character_data_handler", [1]],
      ["xml_set_default_handler", [1]],
      ["xml_set_processing_instruction_handler", [1]],
      ["xml_set_start_namespace_decl_handler", [1]],
      ["xml_set_end_namespace_decl_handler", [1]],
      ["xml_set_unparsed_entity_decl_handler", [1]],
      ["xml_set_notation_decl_handler", [1]],
      ["xml_set_external_entity_ref_handler", [1]],
      ["session_set_save_handler", [0, 1, 2, 3, 4]],
      ["Closure::fromCallable", [0]],
      ["assert_options", [1]],
      ["ldap_set_rebind_proc", [1]],
      ["IntlChar::enumCharNames", [2]],
      ["IntlChar::enumCharTypes", [0]],
      ["$o->setAuthorizer", [0]],
      ["$o->uasort", [0]],
      ["$o->uksort", [0]],
      ["$o->createFunction", [1]],
      ["$o->createAggregate", [1, 2]],
      ["$o->createCollation", [1]],
      ["$o->sqliteCreateFunction", [1]],
      ["$o->sqliteCreateAggregate", [1, 2]],
      ["$o->sqliteCreateCollation", [1]],
    ];
    for (const [callee, positions] of table) {
      const args = [0, 1, 2, 3, 4].map((position) =>
        positions.includes(position) ? `'cb${position}'` : `$a${position}`,
      );
      const name = callee.replace(/^\$o->/, "*.");
      await reads("calls", [
        [
          `${callee}(${args.join(", ")});`,
          [name, ...positions.map((position) => `cb${position}`)].sort(),
        ],
      ]);
    }
  });

  it("names the callables a builtin class is built with", async () => {
    await reads("calls", [
      ["new Fiber('cb');", ["cb"]],
      ["new CallbackFilterIterator($i, 'cb');", ["cb"]],
      ["new RecursiveCallbackFilterIterator($i, 'cb');", ["cb"]],
      ["new RecursiveCallbackFilterIterator('cb', $i);", [], ["2: $i"]],
      ["create_function('', 'x');", [], ["2: create_function('', 'x')"]],
    ]);
  });

  it("trusts a catch variable handed to a builtin by value", async () => {
    const rethrow = (statement) =>
      `function f() { try {} catch (E $e) { ${statement}; throw $e; } }`;
    for (const owner of [
      "Exception",
      "ErrorException",
      "Error",
      "TypeError",
      "ValueError",
      "ArithmeticError",
      "DivisionByZeroError",
      "ArgumentCountError",
      "JsonException",
      "RuntimeException",
      "LogicException",
      "InvalidArgumentException",
      "DomainException",
      "LengthException",
      "OutOfRangeException",
      "OutOfBoundsException",
      "RangeException",
      "OverflowException",
      "UnderflowException",
      "UnexpectedValueException",
      "BadFunctionCallException",
      "BadMethodCallException",
    ])
      await reads("thrown", [[rethrow(`$x = new ${owner}('m', 0, $e)`), []]]);
    for (const callee of [
      "error_log",
      "print_r",
      "var_dump",
      "var_export",
      "get_class",
      "is_a",
      "is_subclass_of",
      "json_encode",
      "serialize",
      "spl_object_id",
      "spl_object_hash",
      "sprintf",
      "printf",
      "trigger_error",
    ])
      await reads("thrown", [[rethrow(`${callee}($e)`), []]]);
    await reads("thrown", [
      [rethrow("$x = new MyException('m', 0, $e)"), [], ["2: throw $e"]],
      [rethrow("my_log($e)"), [], ["2: throw $e"]],
    ]);
  });

  it("reads a slot handed to a builtin by value", async () => {
    for (const callee of [
      "error_log",
      "print_r",
      "var_dump",
      "var_export",
      "get_class",
      "is_a",
      "is_subclass_of",
      "json_encode",
      "serialize",
      "spl_object_id",
      "spl_object_hash",
      "sprintf",
      "printf",
      "trigger_error",
      "strtolower",
      "strtoupper",
      "ucfirst",
      "lcfirst",
      "trim",
      "ltrim",
      "rtrim",
      "strlen",
      "mb_strlen",
      "count",
      "in_array",
      "array_key_exists",
      "array_keys",
      "array_values",
      "intval",
      "floatval",
      "boolval",
      "strval",
      "is_array",
      "is_string",
      "is_int",
      "is_bool",
      "is_null",
      "is_numeric",
      "htmlspecialchars",
      "htmlentities",
      "urlencode",
      "rawurlencode",
      "base64_encode",
      "md5",
      "sha1",
      "hash",
      "explode",
      "implode",
      "join",
      "str_contains",
      "str_starts_with",
      "str_ends_with",
      "strpos",
      "stripos",
      "substr",
      "str_pad",
      "str_repeat",
      "number_format",
      "date",
      "strtotime",
      "json_decode",
      "unserialize",
      "filter_var",
      "max",
      "min",
      "abs",
      "round",
    ])
      await reads("property", [[`f(${callee}($o['acl']));`, []]], {
        key: "acl",
      });
    await reads(
      "property",
      [
        ["foo($o['acl']);", [], ["2: $o['acl']"]],
        ["echo $o['acl'], print($o['acl']);", []],
      ],
      { key: "acl" },
    );
  });

  it("refuses each whole-array rewrite stored back", async () => {
    for (const callee of [
      "str_replace",
      "str_ireplace",
      "preg_replace",
      "preg_replace_callback",
      "array_map",
      "array_filter",
      "array_change_key_case",
      "array_diff_key",
      "array_diff_assoc",
      "array_intersect_key",
      "array_intersect_assoc",
      "array_splice",
      "array_slice",
      "array_pad",
      "array_unique",
      "array_reverse",
      "array_column",
      "substr_replace",
      "preg_filter",
      "array_merge_recursive",
      "array_replace_recursive",
      "iterator_to_array",
    ])
      await reads(
        "property",
        [[`$o = ${callee}($o); // ACL`, [], [`2: ${callee}($o)`]]],
        { key: "acl" },
      );
    await reads("property", [["$o = foo($o);", []]], { key: "acl" });
  });
});

describe("PHP strings that may name a getter", () => {
  /** Each body with the string rows it refuses, besides `rows`. */
  const refused = (body, strings = [], members = []) =>
    reads("env", [[body, members, strings.map((text) => `2: ${text}`)]]);

  it("names getenv, env handed to a function and the Env class", async () => {
    for (const name of [
      "getenv",
      "apache_getenv",
      "Illuminate\\Support\\Env",
      "\\Illuminate\\Support\\Env::get",
    ])
      await refused(`$f = '${name}';`, [`'${name}'`]);
    for (const name of [
      "mygetenv",
      "getenvx",
      "env",
      "Illuminate\\Support\\Envx",
      "xIlluminate\\Support\\Env",
      "Illuminate\\Support\\Env::",
      "Illuminate\\Support\\Env::get-x",
    ])
      await refused(`$f = '${name}';`);
    await refused("'getenv';", ["'getenv'"]);
    await refused("foo('env');", ["'env'"]);
    await refused("$o->m('env');");
    await refused("new X('env');");
    await refused("('env' . 'x')('y');", ["('env' . 'x')('y')"]);
    await refused("('getenv' . 'x')('y');", [
      "('getenv' . 'x')('y')",
      "'getenv'",
    ]);
  });

  it("skips keys and the variable a getter is asked for", async () => {
    await refused("$a = ['getenv' => 1];");
    await refused("$a = ['x' => 'getenv'];", ["'getenv'"]);
    await refused("$a = ['getenv'];", ["'getenv'"]);
    await refused("$x = $a['getenv'];");
    await refused("$x = 'getenv'[0];", ["'getenv'"]);
    await refused("getenv('getenv');", [], ["getenv"]);
    await refused("env('getenv');", [], ["getenv"]);
    await refused("Illuminate\\Support\\Env::get('getenv');", [], ["getenv"]);
    await refused(
      "'Illuminate\\Support\\Env::get'('getenv');",
      ["'Illuminate\\Support\\Env::get'"],
      ["getenv"],
    );
    await refused(
      "namespace App; getenv('getenv');",
      ["getenv may be a function of namespace App: getenv('getenv')"],
      ["getenv"],
    );
    await refused("$f('getenv');", ["$f('getenv')", "'getenv'"]);
    await refused("new X('getenv');", ["'getenv'"]);
    await refused("foo('getenv');", ["'getenv'"]);
  });
});

describe("PHP callback filters, fetch modes and ini options", () => {
  /** Each call, refused or read by name. */
  const calls = async (cases) => {
    for (const [call, refusedCall] of cases) {
      const name = call.replace(/\(.*/s, "").replace(/^\$\w+->/, "*.");
      await reads("calls", [
        refusedCall ? [`${call};`, [], [`2: ${call}`]] : [`${call};`, [name]],
      ]);
    }
  };

  it("refuses a filter that may be a callback", async () => {
    await calls([
      ["filter_var($x, 1024)", true],
      ["filter_var($x, FILTER_DEFAULT)", false],
      ["filter_var($x, \\FILTER_DEFAULT)", false],
      ["filter_varx($x, 1)", false],
      ["xfilter_var($x, 1)", false],
      ["filter_var($x)", false],
      ["filter_input(INPUT_GET, 'x', FILTER_DEFAULT)", false],
      ["filter_input(INPUT_GET, 'x', 1024)", true],
      ["filter_input_array(INPUT_GET, FILTER_DEFAULT, true)", false],
      ["filter_input_array(INPUT_GET, 1024)", true],
      ["filter_input_array(INPUT_GET, ['a' => FILTER_DEFAULT])", false],
      ["filter_var(...)", true],
      ["filter_var($x, FILTER_DEFAULT, flags: 0)", true],
      ["filter_var(value: $x, filter: FILTER_DEFAULT)", true],
      ["filter_var($x, 1|FILTER_DEFAULT)", true],
      ["filter_var($x, FILTER_DEFAULT|1)", true],
      ["filter_var_array($x, FILTER_DEFAULT)", false],
      ["filter_var_array($x, ['a' => FILTER_DEFAULT])", false],
      ["filter_var_array($x, 1024)", true],
      ["filter_var($x, ['flags' => 1])", true],
    ]);
  });

  it("reads the filter of a definition array", async () => {
    await calls([
      ["filter_var_array($x, ['a' => ['filter'=>1024]])", true],
      ["filter_var_array($x, ['a' => ['filter' =>1024]])", true],
      ["filter_var_array($x, ['a' => ['filter'=> 1024]])", true],
      [
        "filter_var_array($x, ['a' => ['filter' => FILTER_DEFAULT | 1024]])",
        true,
      ],
      ["filter_var_array($x, ['a' => ['filter' => FILTER_DEFAULT]])", false],
      [
        "filter_var_array($x, ['a' => ['filter' => FILTER_DEFAULT, 'flags' => 1]])",
        false,
      ],
      [
        "filter_var_array($x, ['a' => [\"filter\" =>  \\FILTER_DEFAULT ]])",
        false,
      ],
      ["filter_var_array($x, ['a' => ['filter' => FILTER_D]])", false],
    ]);
  });

  it("refuses a fetch mode that may be a callback", async () => {
    await calls([
      ["$st->fetch(10, 'f')", true],
      ["$st->fetch(10)", false],
      ["$st->fetch()", false],
      ["$st->fetchx(10, 2)", false],
      ["$st->xfetch(10, 2)", false],
      ["PDOStatement::fetchAll(10, 2)", true],
      ["$st->FetchAll(PDO::FETCH_ASSOC, 1)", false],
      ["$st->fetchAll(\\PDO::FETCH_ASSOC, 1)", false],
      ["$st->fetchAll(1|PDO::FETCH_ASSOC, 1)", true],
      ["$st->fetchAll(PDO::FETCH_GROUP|10, 1)", true],
      ["$st->fetchAll(PDO::FETCH_A|PDO::FETCH_BC, 1)", false],
      ["$st->fetchAll(PDO::FETCH_A | \\PDO::FETCH_BC, 1)", false],
      ["$st->setFetchMode(PDO::FETCH_A, 1)", false],
      ["$st->fetchObject(PDO::FETCH_A, 1)", false],
      ["$st->fetchAll(...$a, 1)", true],
    ]);
  });

  it("refuses an ini option that takes a callback", async () => {
    await calls([
      ["ini_set('display_errors', '1')", false],
      ["ini_alter('unserialize_callback_func', 'x')", true],
      ["ini_set('UNSERIALIZE_CALLBACK_FUNC', 'x')", true],
      ["ini_set('assert.callback', 'x')", true],
      ["ini_set('assertxcallback', 'x')", false],
      ["ini_set('xunserialize_callback_func', 1)", false],
      ["ini_set('assert.callbackx', 1)", false],
      ["ini_set(...)", true],
      ["ini_set(option: 'x', value: 'y')", true],
      ["ini_set('display_errors', value: 1)", true],
      ["ini_set($o, 1)", true],
      ["ini_get('assert.callback')", false],
    ]);
  });
});

describe("PHP forms each extract reads", () => {
  const property = (cases, key = "acl") => reads("property", cases, { key });

  it("reads only its own forms whatever options it is given", async () => {
    const body = lines(
      "$o['acl'] = 'x'; $o['acl']++; unset($o['acl']); foreach ($a as &$v) {} [$o['acl']] = $x; $r = &$o['acl'];",
      "$o = $d + ['acl' => 'x']; [$a, &$b] = $x; $o = ['acl' => &$a]; $o += ['acl' => 1];",
      "enum E: string { case acl = 'x'; }",
      "class C { public $acl { get => 1; } const acl = 1; public $b = 2; function __construct(public $acl = 1) {} }",
      "foo(acl: 'x'); bar($o['acl']); preg_match('/(?<acl>x)/', $s);",
      "`ls`; exit('x'); throw $e; $o->offsetSet('acl', 1); compact('acl'); define('acl', 1); foo('y');",
    );
    const options = { key: "acl", callee: "foo" };
    await reads("env", [[body, []]], options);
    await reads(
      "calls",
      [
        [
          body,
          [
            "*.offsetSet",
            "bar",
            "compact",
            "define",
            "die",
            "exit",
            "foo",
            "preg_match",
            "shell_exec",
          ],
        ],
      ],
      options,
    );
    await reads("string_args", [[body, ["y"], ["6: foo(acl: 'x')"]]], options);
    await reads("thrown", [[body, [], ["7: throw $e"]]], options);
    await reads("imports", [[body, []]], options);
    await reads("imports", [
      [
        "ReflectionMethod::createFromMethodName('A::m'); $r->invoke('x'); new ReflectionClass($x); eval('x');",
        [],
        ["2: eval('x')"],
      ],
    ]);
    await property([
      [
        "ReflectionMethod::createFromMethodName('A::m'); $r->invoke('x'); new ReflectionClass($x); eval('x');",
        [],
      ],
    ]);
  });

  it("names calls, code and reflection", async () => {
    await reads("calls", [
      ["$o?->m();", ["*.m"]],
      ["assert();", ["assert"]],
      ["assert($x);", ["assert"]],
      ["assert('x');", [], ["2: assert('x')"]],
      ['assert("x$y");', [], ['2: assert("x$y")']],
      ["$r->invokex('x');", ["*.invokex"]],
      ["$r->invoke('x');", [], ["2: $r->invoke('x')"]],
      ["new $c($x);", [], ["2: new $c($x)"]],
      ["new ($x)($y);", [], ["2: new ($x)($y)"]],
      ["new $c;", []],
      ["new App\\MyReflection($x);", []],
      ["new ReflectionClass('X');", [], ["2: new ReflectionClass('X')"]],
      ["new class($x) {};", []],
      ["new Fiber();", []],
      ["new static($x);", []],
      ["`ls`;", ["shell_exec"]],
      ["include 'a.php';", []],
      [
        "include_once 'data://text/plain,x';",
        [],
        ["2: include_once 'data://text/plain,x'"],
      ],
      ["require 'php://filter/x';", [], ["2: require 'php://filter/x'"]],
      ["$c = ['notification' => 'cb'];", ["cb"]],
      ["$c = ['notification'];", []],
    ]);
    await reads("string_args", [["$f('x');", [], ["2: $f('x')"]]], {
      callee: "foo",
    });
    await reads(
      "string_args",
      [["$c = ['notification' => 'cb'];", [], ["2: 'notification' => 'cb'"]]],
      { callee: "cb" },
    );
    await reads(
      "string_args",
      [
        ["`ls -l`;", ["ls -l"]],
        ["`ls $x`;", [], ["2: `ls $x`"]],
        ["``;", [""]],
      ],
      { callee: "shell_exec" },
    );
    await reads(
      "string_args",
      [
        ["exit('x');", ["x"]],
        ["die('y');", ["y"]],
        ["exit;", []],
        ["exit($x);", [], ["2: exit($x);"]],
      ],
      { callee: "exit" },
    );
    await reads("string_args", [["exit('x');", ["x"]]], { callee: "die" });
    await reads("string_args", [["exit('x');", []]], { callee: "foo" });
  });

  it("reads getters by their parameter names", async () => {
    await reads("env", [
      ["getenv(name: 'X');", ["X"]],
      ["apache_getenv(variable: 'X');", ["X"]],
      ["env(key: 'X');", ["X"]],
      ["getenv(other: 1, name: 'X');", ["X"]],
      ["getenv(variable: 'X');", [], ["2: getenv(variable: 'X')"]],
      ["apache_getenv(name: 'X');", [], ["2: apache_getenv(name: 'X')"]],
      ["env(name: 'X');", [], ["2: env(name: 'X')"]],
      ["getenv(...);", [], ["2: getenv(...)"]],
      ["getenv(...$a);", [], ["2: getenv(...$a)"]],
      ["getenv();", [], ["2: getenv()"]],
    ]);
  });

  it("reads filter_input sources", async () => {
    await reads("env", [
      ["filter_has_var(INPUT_ENV, 'X');", ["X"]],
      ["filter_input(\\INPUT_ENV, 'X');", ["X"]],
      ["filter_input(INPUT_GET, 'a');", []],
      ["define('X', INPUT_ENV); filter_input(\\INPUT_ENV, 'HOME');", ["HOME"]],
      ["filter_input();", [], ["2: filter_input()"]],
      [
        "filter_input_array(INPUT_ENV, 'X');",
        [],
        ["2: filter_input_array(INPUT_ENV, 'X')"],
      ],
      [
        "filter_input(INPUT_GETX, 'a');",
        [],
        ["2: filter_input(INPUT_GETX, 'a')"],
      ],
      [
        "filter_input(MY_INPUT_GET, 'a');",
        [],
        ["2: filter_input(MY_INPUT_GET, 'a')"],
      ],
      [
        "const INPUT_GET = \\INPUT_ENV; filter_input(INPUT_GET, 'a');",
        [],
        ["2: filter_input(INPUT_GET, 'a')"],
      ],
    ]);
  });

  it("reads superglobal subscripts", async () => {
    await reads("env", [
      ["$x = X_ENV['HOME'];", []],
      ["$x = $_SERVER[HOME];", [], ["2: $_SERVER[HOME]"]],
      ['$x = "$_SERVER[HOME]";', ["HOME"]],
      ["$_ENV[] = 1;", [], ["2: $_ENV[]"]],
      ["$x = $_ENV[getenv('X')];", ["X"], ["2: $_ENV[getenv('X')]"]],
      ["$x = $GLOBALS['x'];", []],
      ["$x = $GLOBALS['_SERVER'];", [], ["2: $GLOBALS['_SERVER']"]],
      ["$x = $GLOBALS['GLOBALS'];", [], ["2: $GLOBALS['GLOBALS']"]],
      ["$x = $GLOBALS[$k];", [], ["2: $GLOBALS[$k]"]],
      ["$x = $GLOBALS[getenv('X')];", ["X"], ["2: $GLOBALS[getenv('X')]"]],
      ["$x = $o['x'];", []],
      ["foo($GLOBALS);", [], ["2: $GLOBALS"]],
      ["foo($_ENV);", [], ["2: $_ENV"]],
      ['$f = "getenv";', [], ['2: "getenv"']],
      [
        "$c = ['notification' => 'getenv'];",
        [],
        ["2: 'notification' => 'getenv'", "2: 'getenv'"],
      ],
    ]);
  });

  it("names thrown classes and calls", async () => {
    await reads("thrown", [
      ["throw (new X);", ["X"]],
      ["throw (new X /*c*/);", [], ["2: throw (new X /*c*/)"]],
      ["throw new $c;", [], ["2: throw new $c"]],
      ["throw $f();", [], ["2: throw $f()"]],
      ["throw foo();", ["foo"]],
      [
        "namespace App; throw make();",
        ["make"],
        ["2: make may be a function of namespace App: make()"],
      ],
    ]);
  });

  it("refuses named regex groups for the key", async () => {
    await property(
      [
        ["preg_match(\"/(?<axb>x)(?'axb'x)/\", $s, $m);", []],
        ['preg_match("/(?<a.b>x)/", $s, $m);', [], ['2: "/(?<a.b>x)/"']],
        ["preg_match(\"/(?'a.b'x)/\", $s, $m);", [], ["2: \"/(?'a.b'x)/\""]],
      ],
      "a.b",
    );
    await property(
      [
        ["preg_match(\"/(?'ab'x)/\", $s, $m);", [], ["2: \"/(?'ab'x)/\""]],
        ["preg_match('/(?P<ab>x)/', $s, $m);", [], ["2: '/(?P<ab>x)/'"]],
      ],
      "ab",
    );
  });

  it("refuses references and writes to the key", async () => {
    await property([
      ["$o = ['acl' => &$a];", [], ["2: 'acl' => &$a", "2: 'acl' => &$a"]],
      ["$o = ['x' => &$a];", []],
      ["$o = [&$a];", [], ["2: &$a"]],
      ["$o = [$k => &$a];", [], ["2: $k => &$a", "2: $k => &$a"]],
      ["[$a, &$b] = $x;", [], ["2: [$a, &$b]"]],
      ["list($a, &$b) = $x;", [], ["2: list($a, &$b)"]],
      ["[$a, $b] = $x;", []],
      ["$o = $d . ['acl' => 'x'];", ["x"]],
      ["$o = $d + ['acl' => 'x'];", ["x"], ["2: $d + ['acl' => 'x']"]],
      ["$o = ['acl' => 1] + ['b' => 2];", ["1"]],
      ["$o = $d + ['b' => 1];", []],
      ["$o['acl']++;", [], ["2: $o['acl']++"]],
      ["$o['x']++;", []],
      ["unset($o['acl']);", [], ["2: unset($o['acl']);"]],
      ["unset($o[$k]);", [], ["2: unset($o[$k]);"]],
      ["unset($x, $o['acl']);", [], ["2: unset($x, $o['acl']);"]],
      ["[$o['acl']] = $x;", [], ["2: [$o['acl']] = $x"]],
      ["[$o->acl] = $x;", [], ["2: [$o->acl] = $x"]],
      ["[X::$acl] = $x;", [], ["2: [X::$acl] = $x"]],
      ["list($o['acl']) = $x;", [], ["2: list($o['acl']) = $x"]],
      ["[[$o['acl']]] = $x;", [], ["2: [[$o['acl']]] = $x"]],
      ["[$o['x']] = $x;", []],
      ["$r = &$o['acl'];", [], ["2: $r = &$o['acl']"]],
      ["$r = &$o['x'];", []],
      ["$o['acl'] = &$r;", [], ["2: $o['acl'] = &$r"]],
      ["$o += ['acl' => 1];", ["1"], ["2: $o += ['acl' => 1]"]],
      ["$o += $x;", []],
      ["$o['acl'] += 1;", [], ["2: $o['acl'] += 1"]],
      ["$o ??= ['acl' => 1];", ["1"]],
      ["$o -= ['acl' => 1];", ["1"]],
    ]);
  });

  it("refuses foreach targets that write the key", async () => {
    const refused = (header) => [
      `foreach (${header}) {}`,
      [],
      [`2: foreach (${header}) {}`],
    ];
    await property([
      ["foreach ($a as $v) { $o['acl'] = 1; }", ["1"]],
      ["foreach ($a as $v) { $b = &$v; }", []],
      ["foreach ($a as $o['x']) {}", []],
      ["foreach ($o['acl'] as $v) {}", []],
      ["foreach ($a as $k => $v): endforeach;", []],
      refused("$a as &$v"),
      refused("$a as $k => &$v"),
      refused("$a as $o['acl']"),
      refused("$a as [$o['acl']]"),
      refused("$a as $o->acl"),
      refused("$a as $o?->acl"),
      refused("$a as X::$acl"),
      refused("$a as $o[$k]"),
    ]);
  });

  it("reads enum cases, arguments and declared properties", async () => {
    await property([
      ["enum E { case acl; }", []],
      ["enum E: string { case acl = 'x'; }", ["x"]],
      ["enum E: string { case acl = X; }", [], ["2: case acl = X;"]],
      ["enum E: string { case Acl = 'x'; }", []],
      [
        "class C { function __construct(public $acl = 1) {} }",
        [],
        ["2: public $acl = 1"],
      ],
      ["class C { function __construct(public $x = 1) {} }", []],
      ["foo(acl: 'x');", ["x"]],
      ["foo(acl: $x);", [], ["2: acl: $x"]],
      ["strtolower($o['acl']);", []],
      ["\\strtolower($o['acl']);", []],
      ["STRTOLOWER($o['acl']);", []],
      ["foo($o['x']);", []],
      ["$o->m($o['acl']);", [], ["2: $o['acl']"]],
      ["new X($o['acl']);", [], ["2: $o['acl']"]],
      ["foo($o->acl);", [], ["2: $o->acl"]],
      ["foo(X::$acl);", [], ["2: X::$acl"]],
      [
        "class C { public $acl { get => 1; } }",
        [],
        ["2: public $acl { get => 1; }"],
      ],
      ["class C { public $x { get => 1; } }", []],
      [
        "class C { public $b = 1, $acl { get => 1; } }",
        [],
        ["2: public $b = 1, $acl { get => 1; }"],
      ],
      ["class C { public $acl = 1; }", ["1"]],
      ["class C { public $acl /*c*/ = 2; }", ["2"]],
      ["class C { public $acl; }", []],
      ["class C { const acl = 1; }", ["1"]],
      [
        "define('acl', 1); define('acl', 2); class C { public $acl = 3; }",
        ["3"],
        ["2: define('acl', 1)", "2: define('acl', 2)"],
      ],
    ]);
    await property(
      [
        [
          "define('K', 1); define('K', 2); define('OTHER', 3);",
          [],
          ["2: define('K', 1)", "2: define('K', 2)"],
        ],
      ],
      "K",
    );
  });

  it("refuses array builtins that write slots", async () => {
    await property([
      ["$o->offsetSet('acl', 1);", [], ["2: $o->offsetSet('acl', 1)"]],
      ["X::offsetSet('acl', 1);", [], ["2: X::offsetSet('acl', 1)"]],
      ["$o->offsetSetx('acl', 1);", []],
      [
        "$o->setValue($x, 1); new ReflectionClass('C');",
        [],
        ["2: $o->setValue($x, 1)"],
      ],
      ["$o->setValue($x, 1);", []],
      ["$o->setValuex(1); // Reflection", []],
      ["$o->foo(); // Reflection", []],
    ]);
  });

  it("knows which class self names inside closures and nested classes", async () => {
    const bound = (body) => `${body} $f->bindTo($o);`;
    await reads("calls", [
      [
        bound("class C { function m() { $f = fn() => self::x(); } }"),
        ["*.bindTo", "*.x"],
      ],
      [bound("self::x();"), ["*.bindTo", "*.x"]],
      [
        bound(
          "class C { function m() { $f = function () { function g() { self::x(); } }; } }",
        ),
        ["*.bindTo", "C::x"],
      ],
      [
        bound(
          "class C { function m() { $f = function () { enum E { case A; function n() { self::x(); } } }; } }",
        ),
        ["*.bindTo", "E::x"],
      ],
      [
        bound(
          "class C { function m() { $f = function () { class D { const X = self::x(); } }; } }",
        ),
        ["*.bindTo", "D::x"],
      ],
      [
        "class C { function m() { trait T { function n() { self::x(); } } } }",
        ["*.x"],
      ],
      [
        "class C { function m() { enum E { case A; function n() { self::x(); } } } }",
        ["E::x"],
      ],
      [
        "trait T { public $p = self::x(); } $f->bindTo($o);",
        ["*.bindTo", "*.x"],
      ],
      [
        "$o = new class { const X = self::x(); }; $f->bindTo($o);",
        ["*.bindTo", "*.x"],
      ],
    ]);
  });

  it("reads the rest of each form only where it belongs", async () => {
    await reads(
      "string_args",
      [
        [
          "namespace App; foo('x');",
          ["x"],
          ["2: foo may be a function of namespace App: foo('x')"],
        ],
      ],
      { callee: "foo" },
    );
    for (const callee of ["shell_exec", "exit"])
      await reads(
        "calls",
        [["`ls`; exit('x');", ["die", "exit", "shell_exec"]]],
        { callee },
      );
    for (const extract of ["property", "thrown", "imports"])
      await reads(extract, [["$c = ['notification' => 'cb'];", []]], {
        key: "acl",
        callee: "cb",
      });
    await reads("calls", [
      ["include $x;", []],
      [
        "new Fiber(); new Fiber($x); new CallbackFilterIterator($i);",
        [],
        ["2: $x"],
      ],
    ]);
    await reads("env", [
      ["$x = \"{$_SERVER['HOME']}\";", ["HOME"]],
      ["$GLOBALS[] = 1;", [], ["2: $GLOBALS[]"]],
      [
        "filter_input_array(INPUT_ENV, ['X' => FILTER_DEFAULT]);",
        [],
        ["2: filter_input_array(INPUT_ENV, ['X' => FILTER_DEFAULT])"],
      ],
    ]);
    await property([
      ["foreach ($a as /*c*/ &$v) {}", [], ["2: foreach ($a as /*c*/ &$v) {}"]],
      [
        "foreach ($a as /*c*/ $o['acl']) {}",
        [],
        ["2: foreach ($a as /*c*/ $o['acl']) {}"],
      ],
      ["$x = $o['acl'];", []],
    ]);
  });
});
