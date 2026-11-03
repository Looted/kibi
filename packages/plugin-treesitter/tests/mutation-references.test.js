// executable_for TEST-kibi-tree-sitter-references
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { validateReferenceExtractionResult } from "kibi-plugin-sdk";

globalThis.fetch = async () => {
  throw new Error("network access is disabled in this test");
};

const { createTreeSitterReferenceExtractor } = await import("../dist/index.js");
const extractor = createTreeSitterReferenceExtractor();

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

/** Members (sorted, unique) and the texts of the rows, in order. */
async function read(path, content, extract, options = {}) {
  const result = await raw(path, content, extract, options);
  assert.equal(result.status, "ok", JSON.stringify(result));
  return {
    members: [...new Set(result.members)].sort(),
    rows: result.unresolved.map((row) => `${row.line}: ${row.text}`),
  };
}

const lines = (...rows) => `${rows.join("\n")}\n`;
const rust = (content, extract, options) =>
  read("src/lib.rs", content, extract, options);

describe("reference refusals name the languages and the extract", () => {
  it("lists every language an unsupported path could have been", async () => {
    const result = await raw("notes.txt", "x", "env");
    assert.equal(result.status, "unsupported");
    assert.equal(
      result.message,
      "kibi-plugin-treesitter reads references of Go, Java, C#, Rust, Terraform, HCL, Bash, PHP and C files, not notes.txt",
    );
  });

  it("names the language of a file that does not parse", async () => {
    for (const [path, content, name] of [
      ["a.sh", "if then\n", "Bash"],
      ["a.php", "<?php if (\n", "PHP"],
      ["a.c", "int f( {\n", "C"],
    ]) {
      const result = await raw(path, content, "env");
      assert.equal(result.status, "failed");
      assert.equal(result.message, `line 1 is not valid ${name}`);
    }
  });

  it("says which extract Bash has no values for", async () => {
    const thrown = await raw("a.sh", "echo hi\n", "thrown");
    assert.equal(thrown.status, "unsupported");
    assert.equal(thrown.message, "Bash has no thrown errors to extract");
    const property = await raw("a.sh", "echo hi\n", "property", { key: "x" });
    assert.equal(property.status, "unsupported");
    assert.equal(property.message, "Bash has no property values to extract");
  });
});

describe("C property reads without a key", () => {
  it("refuses a macro whose body could hold any key", async () => {
    const result = await read(
      "a.c",
      lines(
        "#define INIT (1)",
        "struct s v = { .a = INIT };",
        "int f(void) { return g(INIT); }",
      ),
      "property",
    );
    assert.deepEqual(result, {
      members: [],
      rows: ["2: INIT", "3: INIT"],
    });
  });
});

describe("C# environment copies", () => {
  it("reads System.Environment itself as the process environment", async () => {
    const result = await read(
      "A.cs",
      lines(
        'class A { void M() { var x = System.Environment.GetEnvironmentVariable("HOME"); } }',
      ),
      "env",
    );
    assert.deepEqual(result, { members: ["HOME"], rows: [] });
  });

  it("reads other members of System.Environment as no copy", async () => {
    for (const type of [
      "System.Environment",
      "S.Environment",
      "global::System.Environment",
    ]) {
      const result = await read(
        "A.cs",
        lines(
          "using S = System;",
          `class A { void M() { var n = ${type}.NewLine; } }`,
        ),
        "env",
      );
      assert.deepEqual(result, { members: [], rows: [] }, type);
    }
  });

  it("refuses the environment copy of a ProcessStartInfo", async () => {
    const result = await read(
      "A.cs",
      lines(
        "class A { void M() { var p = new System.Diagnostics.ProcessStartInfo(); var n = p.Environment; } }",
      ),
      "env",
    );
    assert.deepEqual(result, { members: [], rows: ["1: p.Environment"] });
  });
});

describe("Rust attributes", () => {
  it("looks through comments between a #[cfg(test)] and its item", async () => {
    for (const comment of ["// note", "/// doc", "/* block */"]) {
      const result = await rust(
        lines(
          "#[cfg(test)]",
          comment,
          'fn t() { let _ = std::env::var("A"); }',
          'fn u() { let _ = std::env::var("B"); }',
        ),
        "env",
      );
      assert.deepEqual(result, { members: ["B"], rows: [] }, comment);
    }
  });

  it("refuses a cfg_attr whose nested cfg_attr has no token tree", async () => {
    assert.deepEqual(
      await rust(
        lines("#[cfg_attr(unix, cfg_attr 5)]", "fn f() {}"),
        "imports",
      ),
      { members: [], rows: ["1: #[cfg_attr(unix, cfg_attr 5)]"] },
    );
    assert.deepEqual(
      await rust(lines("#[cfg_attr(unix, cfg_attr)]", "fn f() {}"), "imports"),
      { members: [], rows: ["1: #[cfg_attr(unix, cfg_attr)]"] },
    );
  });

  it("reads nested cfg_attr attributes", async () => {
    assert.deepEqual(
      await rust(
        lines(
          "#[cfg_attr(unix, cfg_attr(windows, derive(Foo)))]",
          "fn f() { g(); }",
        ),
        "imports",
      ),
      { members: [], rows: [] },
    );
    assert.deepEqual(
      await rust(
        lines(
          "#[cfg_attr(unix, cfg_attr(windows, derive(Debug)))]",
          "fn f() { g(); }",
        ),
        "calls",
      ),
      { members: ["g"], rows: [] },
    );
    assert.deepEqual(
      await rust(
        lines(
          "#[cfg_attr(unix, cfg_attr(windows, derive(Foo)))]",
          "fn f() { g(); }",
        ),
        "calls",
      ),
      {
        members: ["g"],
        rows: ["1: #[cfg_attr(unix, cfg_attr(windows, derive(Foo)))]"],
      },
    );
  });

  it("skips comments among a cfg_attr's tokens", async () => {
    assert.deepEqual(
      await rust(
        lines("#[cfg_attr(unix, /* c */ inline)]", "fn f() { g(); }"),
        "calls",
      ),
      { members: ["g"], rows: [] },
    );
    assert.deepEqual(
      await rust(
        lines("#[cfg_attr(unix, /* c */ derive(Foo))]", "fn f() { g(); }"),
        "calls",
      ),
      {
        members: ["g"],
        rows: ["1: #[cfg_attr(unix, /* c */ derive(Foo))]"],
      },
    );
  });

  it("reads a cfg_attr's path across ::", async () => {
    assert.deepEqual(
      await rust(
        lines("#[cfg_attr(unix, rustfmt::skip)]", "fn f() { g(); }"),
        "calls",
      ),
      { members: ["g"], rows: [] },
    );
  });

  it("refuses a cfg_attr part that is not a path", async () => {
    for (const part of ['"x"', "::"]) {
      const attribute = `#[cfg_attr(unix, ${part})]`;
      assert.deepEqual(
        await rust(lines(attribute, "fn f() { g(); }"), "imports"),
        { members: [], rows: [`1: ${attribute}`] },
      );
    }
    const attribute = '#[cfg_attr(unix, "x")]';
    const source = lines(attribute, "fn f() { g(); }");
    // Once as a conditional attribute, once as code it may generate.
    assert.deepEqual(await rust(source, "calls"), {
      members: ["g"],
      rows: [`1: ${attribute}`, `1: ${attribute}`],
    });
    assert.deepEqual(await rust(source, "env"), {
      members: [],
      rows: [`1: ${attribute}`, `1: ${attribute}`],
    });
  });

  it("reads the derives a cfg_attr applies", async () => {
    assert.deepEqual(
      await rust(
        lines("#[cfg_attr(unix, derive(Foo))]", "fn f() { g(); }"),
        "calls",
      ),
      { members: ["g"], rows: ["1: #[cfg_attr(unix, derive(Foo))]"] },
    );
    // Tokens after the list make it no derive list at all.
    assert.deepEqual(
      await rust(
        lines("#[cfg_attr(unix, derive(Foo) x)]", "fn f() { g(); }"),
        "calls",
      ),
      { members: ["g"], rows: [] },
    );
  });

  it("finds env in the words of a helper a cfg_attr applies", async () => {
    assert.deepEqual(
      await rust(
        lines(
          "#[derive(clap::Parser)]",
          "struct A {",
          "  #[cfg_attr(unix, arg = x env)]",
          "  f: u8,",
          "}",
        ),
        "env",
      ),
      { members: [], rows: ["3: #[cfg_attr(unix, arg = x env)]"] },
    );
  });

  it("reads only the parts of an attribute that may generate code", async () => {
    assert.deepEqual(
      await rust(
        lines(
          "#[derive(clap::Parser)]",
          "struct A {",
          "  #[cfg_attr(unix, arg(long), inline)]",
          "  f: u8,",
          "}",
        ),
        "env",
      ),
      { members: [], rows: [] },
    );
  });

  it("reads a derive only from its token tree", async () => {
    assert.deepEqual(
      await rust(lines("#[derive = foo(Bar)]", "fn f() { g(); }"), "calls"),
      { members: ["foo", "g"], rows: [] },
    );
    assert.deepEqual(
      await rust(lines("#[derive(Debug,)]", "fn f() { g(); }"), "calls"),
      { members: ["g"], rows: [] },
    );
  });

  it("reads standard derives by their std and core paths only", async () => {
    assert.deepEqual(
      await rust(
        lines(
          "#[derive(std::fmt::Debug, ::core::clone::Clone)]",
          "fn f() { g(); }",
        ),
        "calls",
      ),
      { members: ["g"], rows: [] },
    );
    assert.deepEqual(
      await rust(
        lines("#[derive(Destd::fmt::bug)]", "fn f() { g(); }"),
        "calls",
      ),
      { members: ["g"], rows: ["1: #[derive(Destd::fmt::bug)]"] },
    );
  });

  it("reads every rustfmt:: attribute as inert", async () => {
    assert.deepEqual(
      await rust(
        lines("#[rustfmt::skip::macros(foo)]", "fn f() { g(); }"),
        "calls",
      ),
      { members: ["g"], rows: [] },
    );
  });

  it("refuses an inner attribute macro", async () => {
    assert.deepEqual(
      await rust(lines("#![my_macro]", "fn f() { g(); }"), "calls"),
      { members: ["g"], rows: ["1: #![my_macro]"] },
    );
  });

  it("refuses a derive a cfg branch may bind to another crate", async () => {
    assert.deepEqual(
      await rust(
        lines(
          "#[cfg(a)] use serde::Serialize;",
          "#[cfg(not(a))] use other::Serialize;",
          "#[derive(Serialize)]",
          "struct S;",
        ),
        "env",
      ),
      { members: [], rows: ["3: #[derive(Serialize)]"] },
    );
    assert.deepEqual(
      await rust(
        lines(
          "#[cfg(a)] use other::Serialize;",
          "use serde::Serialize;",
          "#[derive(Serialize)]",
          "struct S;",
        ),
        "env",
      ),
      { members: [], rows: ["3: #[derive(Serialize)]"] },
    );
    assert.deepEqual(
      await rust(
        lines("use serde::Serialize;", "#[derive(Serialize)]", "struct S;"),
        "env",
      ),
      { members: [], rows: [] },
    );
  });
});

describe("Rust path resolution", () => {
  const command = { callee: "std::process::Command::new" };

  it("does not read an item with other attributes as cfg-gated", async () => {
    assert.deepEqual(
      await rust(
        lines(
          "#[allow(unused)]",
          "use std::env;",
          'fn f() { let _ = env::var("A"); }',
        ),
        "env",
      ),
      { members: ["A"], rows: [] },
    );
  });

  it("follows a type alias of a plain path only", async () => {
    for (const alias of [
      "type C = std::process::Command;",
      "use std::process::Command;\ntype C = Command;",
    ])
      assert.deepEqual(
        await rust(
          lines(alias, 'fn f() { C::new("rm"); }'),
          "string_args",
          command,
        ),
        { members: ["rm"], rows: [] },
        alias,
      );
    for (const alias of [
      "type C<T> = std::process::Command;",
      "type C = Vec<u8>;",
      "type C = (u8);",
    ]) {
      const source = lines(alias, 'fn f() { C::new("rm"); }');
      assert.deepEqual(
        await rust(source, "string_args", command),
        { members: [], rows: ['2: C::new("rm")'] },
        alias,
      );
    }
  });

  it("refuses an opaque alias's callee only for string_args", async () => {
    const source = lines(
      "type C<T> = std::process::Command;",
      'fn f() { C::new("rm"); }',
    );
    assert.deepEqual(await rust(source, "calls", { callee: "new" }), {
      members: ["C::new"],
      rows: [],
    });
    assert.deepEqual(await rust(source, "env", { callee: "new" }), {
      members: [],
      rows: [],
    });
  });

  it("reads an item of the file as itself", async () => {
    assert.deepEqual(
      await rust(lines("fn var(_: &str) {}", 'fn f() { var("A"); }'), "env"),
      { members: [], rows: [] },
    );
    assert.deepEqual(
      await rust(
        lines(
          "fn var(_: &str) {}",
          'fn f() { var("A"); }',
          'fn g() { other::var("B"); }',
        ),
        "calls",
      ),
      { members: ["var"], rows: ['3: other::var("B")'] },
    );
  });

  it("binds an extern crate only under its own name", async () => {
    assert.deepEqual(
      await rust(
        lines(
          "extern crate log;",
          "use std::env;",
          'fn f() { let _ = env::var("A"); }',
        ),
        "env",
      ),
      { members: ["A"], rows: [] },
    );
  });

  it("stops at cycles of aliases", async () => {
    for (const items of [
      ["extern crate b as a;", "extern crate a as b;"],
      ["use b as a;", "use a as b;"],
    ])
      assert.deepEqual(
        await rust(lines(...items, 'fn f() { let _ = a::var("A"); }'), "env"),
        { members: [], rows: ['3: a::var("A")'] },
      );
  });

  const modules = (count) => {
    let body = "pub fn var(_: &str) {}";
    for (let index = count - 1; index >= 0; index -= 1)
      body = `pub mod m${index} { ${body} }`;
    const path = Array.from({ length: count }, (_, index) => `m${index}`);
    return lines(body, `fn f() { ${path.join("::")}::var("A"); }`);
  };

  it("follows nine nested modules of the file", async () => {
    assert.deepEqual(await rust(modules(9), "env"), { members: [], rows: [] });
  });

  it("gives up on a tenth nested module", async () => {
    assert.deepEqual(await rust(modules(10), "env"), {
      members: [],
      rows: ['2: m0::m1::m2::m3::m4::m5::m6::m7::m8::m9::var("A")'],
    });
  });

  const blocks = (count, each) => {
    let body = 'let _ = env::var("A");';
    for (let index = 0; index < count; index += 1) body = `{ ${each} ${body} }`;
    return lines("use std::env;", `fn f() ${body}`);
  };

  it("looks through any number of blocks binding nothing", async () => {
    assert.deepEqual(await rust(blocks(10, ""), "env"), {
      members: ["A"],
      rows: [],
    });
  });

  it("looks out through a few cfg-gated bindings, not many", async () => {
    const gated = "#[cfg(x)] use std::env;";
    assert.deepEqual(await rust(blocks(3, gated), "env"), {
      members: ["A"],
      rows: [],
    });
    assert.deepEqual(await rust(blocks(10, gated), "env"), {
      members: [],
      rows: ['2: env::var("A")'],
    });
  });

  it("reads a crate bound by name as another crate's path", async () => {
    assert.deepEqual(
      await rust(
        lines("use dotenvy;", 'fn f() { let _ = dotenvy::var("A"); }'),
        "env",
      ),
      { members: [], rows: ['2: dotenvy::var("A")'] },
    );
  });

  it("resolves a use's target in the scope of the use", async () => {
    assert.deepEqual(
      await rust(
        lines(
          "use std::env;",
          "use env as e;",
          'fn f() { mod env { pub fn var(_: &str) {} } let _ = e::var("A"); }',
        ),
        "env",
      ),
      { members: ["A"], rows: [] },
    );
  });

  it("looks out of a scope only when all its bindings are gated", async () => {
    assert.deepEqual(
      await rust(
        lines(
          "use dotenvy as env;",
          'fn f() { #[cfg(a)] use std::env; use std::env; let _ = env::var("A"); }',
        ),
        "env",
      ),
      { members: ["A"], rows: [] },
    );
    assert.deepEqual(
      await rust(
        lines(
          "use dotenvy as env;",
          'fn f() { #[cfg(a)] use std::env; let _ = env::var("A"); }',
        ),
        "env",
      ),
      { members: [], rows: ['2: env::var("A")'] },
    );
  });
});

describe("Rust getters a glob or another crate may bring in", () => {
  const glob = lines("use inner::*;", 'fn f() { var("A"); }');

  it("reads a bare getter name the file defines as its own", async () => {
    assert.deepEqual(
      await rust(
        lines("use inner::*;", "fn var(_: &str) {}", 'fn f() { var("A"); }'),
        "env",
      ),
      { members: [], rows: [] },
    );
  });

  it("reads a module of the file named like a getter as itself", async () => {
    assert.deepEqual(
      await rust(
        lines("use inner::*;", "mod var {}", 'fn f() { var("A"); }'),
        "env",
      ),
      { members: [], rows: [] },
    );
    // A module is no known crate's derive.
    assert.deepEqual(
      await rust(
        lines("mod Serialize {}", "#[derive(Serialize)]", "struct S;"),
        "env",
      ),
      { members: [], rows: ["2: #[derive(Serialize)]"] },
    );
  });

  it("refuses a bare getter name a glob may bring in", async () => {
    assert.deepEqual(await rust(glob, "env"), {
      members: [],
      rows: ['2: var("A")'],
    });
    assert.deepEqual(await rust(glob, "calls"), {
      members: [],
      rows: ["1: inner::*", '2: var("A")'],
    });
    assert.deepEqual(
      await rust(glob, "string_args", { callee: "std::env::var" }),
      { members: [], rows: ["1: inner::*", '2: var("A")'] },
    );
    assert.deepEqual(await rust(glob, "string_args", { callee: "x::run" }), {
      members: [],
      rows: ["1: inner::*"],
    });
  });

  it("refuses another crate's getter", async () => {
    const source = lines('fn f() { dotenvy::var("A"); }');
    const row = '1: dotenvy::var("A")';
    assert.deepEqual(await rust(source, "env"), { members: [], rows: [row] });
    assert.deepEqual(await rust(source, "calls"), {
      members: [],
      rows: [row],
    });
    assert.deepEqual(await rust(source, "string_args", { callee: "x::var" }), {
      members: [],
      rows: [row],
    });
    assert.deepEqual(await rust(source, "string_args", { callee: "x::run" }), {
      members: [],
      rows: [],
    });
  });

  it("refuses a getter through the crate root or ::", async () => {
    for (const path of ["::dotenvy::var", "crate::dotenvy::var"])
      assert.deepEqual(await rust(lines(`fn f() { ${path}("A"); }`), "env"), {
        members: [],
        rows: [`1: ${path}("A")`],
      });
  });
});
