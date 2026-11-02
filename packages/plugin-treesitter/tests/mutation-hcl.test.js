// executable_for TEST-kibi-tree-sitter-script-references
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { validateReferenceExtractionResult } from "kibi-plugin-sdk";

globalThis.fetch = async () => {
  throw new Error("network access is disabled in this test");
};

const { createTreeSitterReferenceExtractor } = await import("../dist/index.js");
const extractor = createTreeSitterReferenceExtractor();

async function extract(content, key, path) {
  const result = await extractor.extract({
    path,
    content,
    extract: "property",
    key,
  });
  assert.deepEqual(validateReferenceExtractionResult(result), result);
  return result;
}

/** The members and the unresolved rows (line, text) of a read of `key`. */
async function read(content, key, path = "main.tf") {
  const result = await extract(content, key, path);
  assert.equal(result.status, "ok", JSON.stringify(result));
  return {
    members: result.members,
    rows: result.unresolved.map((row) => [row.line, row.text]),
  };
}

/** Only the members, when the read leaves nothing unresolved. */
async function members(content, key, path = "main.tf") {
  const result = await read(content, key, path);
  assert.deepEqual(result.rows, [], JSON.stringify(result));
  return result.members;
}

/** Only the lines of the unresolved rows, when the read finds no member. */
async function rows(content, key, path = "main.tf") {
  const result = await read(content, key, path);
  assert.deepEqual(result.members, [], JSON.stringify(result));
  return result.rows.map(([line]) => line);
}

const lines = (...text) => `${text.join("\n")}\n`;

describe("syntax errors and unresolved row text", () => {
  it("names the line of the first error, an ERROR or a missing node", async () => {
    for (const [content, line] of [
      [lines("x = 1", "y = [1,", "z = 2"), 2],
      [lines("x = 1", "y = (1"), 3],
    ]) {
      const result = await extract(content, "a", "main.tf");
      assert.equal(result.status, "failed");
      assert.equal(result.message, `line ${line} is not valid Terraform`);
    }
  });

  it("collapses blanks in a row's text and cuts it at 80 characters", async () => {
    assert.deepEqual(
      (await read(lines("x = jsondecode(  \t", '  "x")'), "acl")).rows,
      [[1, 'jsondecode( "x")']],
    );
    const long = `acl = upper("${"y".repeat(100)}")\n`;
    assert.deepEqual((await read(long, "acl")).rows, [
      [1, `acl = upper("${"y".repeat(100)}")`.slice(0, 80)],
    ]);
  });
});

describe("Terraform property reader: functions that build keys", () => {
  it("leaves every key function's object unread", async () => {
    for (const name of [
      "yamldecode",
      "csvdecode",
      "transpose",
      "core::zipmap",
      "provider::aws::arn_parse",
    ])
      assert.deepEqual(await rows(`x = ${name}("a")\n`, "acl"), [1], name);
  });

  it("reads a function whose name only contains core:: as another", async () => {
    assert.deepEqual(await rows("x = jsoncore::decode(1)\n", "acl"), []);
  });
});

describe("Terraform property reader: literal values", () => {
  it("decodes every escape", async () => {
    // `\\` here is one backslash in the configuration.
    const text =
      'a\\rb\\tc\\\\d\\"e\\nf$${g}h%%{i}j$k%l' +
      "\\u00e9\\U0001F600\\U0010FFFF\\uD7FF\\uE000";
    const points = String.fromCodePoint(
      0xe9,
      0x1f600,
      0x10ffff,
      0xd7ff,
      0xe000,
    );
    assert.deepEqual(await members(`acl = "${text}"\n`, "acl"), [
      `a\rb\tc\\d"e\nf\${g}h%{i}j$k%l${points}`,
    ]);
  });

  it("refuses a code point that is not a character", async () => {
    for (const code of [
      String.raw`\uD800`,
      String.raw`\uDFFF`,
      String.raw`\U00110000`,
      String.raw`\UFFFFFFFF`,
    ])
      assert.deepEqual(await rows(`acl = "${code}"\n`, "acl"), [1], code);
  });

  it("writes numbers as Terraform holds them", async () => {
    for (const [text, value] of [
      ["0.0", "0"],
      ["0.0e5", "0"],
      ["000", "0"],
      ["1.50", "1.5"],
      ["10.0", "10"],
      ["1000", "1000"],
      ["1.5E-3", "0.0015"],
      ["2.5e1", "25"],
      ["1.0e+2", "100"],
      ["1.0e401", `1${"0".repeat(401)}`],
      ["1.0e-399", `0.${"0".repeat(398)}1`],
      ["1000.0e398", `1${"0".repeat(401)}`],
      [`${"1".repeat(150)}`, "1".repeat(150)],
      [`${"1".repeat(150)}000`, `${"1".repeat(150)}000`],
      ["-0", "0"],
      ["-0.0", "0"],
      ["-2.50", "-2.5"],
      ["- 3", "-3"],
      ["-(1)", "-1"],
    ])
      assert.deepEqual(await members(`acl = ${text}\n`, "acl"), [value], text);
  });

  it("refuses a number Terraform would round or cannot hold", async () => {
    for (const text of [
      "1.0e402",
      "1.0e-400",
      "1.0e99999999999999999999",
      `${"1".repeat(151)}`,
      `0.${"1".repeat(151)}`,
    ])
      assert.deepEqual(await rows(`acl = ${text}\n`, "acl"), [1], text);
  });

  it("refuses an operation that is not a negative number", async () => {
    for (const text of [
      "!5",
      "-true",
      "-null",
      '-"12"',
      "-a[0]",
      "-x",
      "- -1",
      "-1 + 2",
      "1 - 2",
      "-(1 + 2)",
      "-1[0]",
      "-1.5.x",
      "-(a[0])",
    ])
      assert.deepEqual(await rows(`acl = ${text}\n`, "acl"), [1], text);
  });

  it("reads a tuple's items and refuses an object or a selected item", async () => {
    assert.deepEqual(await members('acl = ["a", [1, true]]\n', "acl"), [
      "a",
      "1",
      "true",
    ]);
    for (const text of ["{}", '{ a = "b" }', '["a"][0]', '["a", x]', "x"])
      assert.deepEqual(await rows(`acl = ${text}\n`, "acl"), [1], text);
  });

  it("reads a heredoc without interpolation or directive", async () => {
    assert.deepEqual(
      await members(lines("acl = <<EOT", "a $ % b", "EOT"), "acl"),
      ["a $ % b\n"],
    );
    for (const body of ["a ${x} b", "%{ if true }a%{ endif }", "a $${x}"])
      assert.deepEqual(
        await rows(lines("acl = <<EOT", body, "EOT"), "acl"),
        [1],
        body,
      );
  });

  it("refuses a heredoc a blank-trimmed marker line would end", async () => {
    // Terraform trims Unicode blanks on both sides; the grammar does not.
    const content = lines(
      "acl = <<EOT",
      "a",
      " EOT ",
      "b",
      "EOT",
      "other = <<EOT",
      "E",
      "EOT",
    );
    assert.deepEqual(await rows(content, "acl"), [1, 1]);
    assert.deepEqual(await read(content, "other"), {
      members: ["E\n"],
      rows: [[1, "<<EOT a EOT b EOT"]],
    });
  });

  it("reads a quoted template as no literal", async () => {
    assert.deepEqual(await rows('acl = "a${1}"\n', "acl"), [1]);
  });
});

describe("Terraform property reader: object keys", () => {
  it("names identifier, string and number keys, not computed ones", async () => {
    const content = lines(
      "x = {",
      '  acl = "bare"',
      '  ("acl") = "paren"',
      '  (("acl")) = "twice"',
      '  "acl" = "quoted"',
      '  007 = "seven"',
      '  true = "bool"',
      "}",
    );
    assert.deepEqual(await rows(content, "acl"), [2, 3, 4, 5]);
    assert.deepEqual(await members(content, "7"), ["seven"]);
    assert.deepEqual(await members(content, "true"), ["bool"]);
    assert.deepEqual(
      await members(lines("x = {", '  acl = "bare"', "}"), "acl"),
      ["bare"],
    );
    assert.deepEqual(
      await members(lines("x = {", '  ("acl") = "paren"', "}"), "acl"),
      ["paren"],
    );
  });

  it("treats a parenthesized identifier as a computed key", async () => {
    const content = lines("x = {", '  (acl) = "v"', "}");
    assert.deepEqual(await rows(content, "acl"), [2]);
    assert.deepEqual(await rows(content, "other"), [2]);
  });

  it("treats a selected or indexed key as computed", async () => {
    assert.deepEqual(
      await rows("x = { var.x = 1, a[0] = 2 }\n", "acl"),
      [1, 1],
    );
  });

  it("treats a string key that is no character as computed", async () => {
    assert.deepEqual(
      await rows(lines("x = {", '  "\\uD800" = 1', "}"), "acl"),
      [2],
    );
  });
});

describe("Terraform property reader: computed keys", () => {
  const computed = async (key, template) =>
    (await rows(lines("x = {", `  ${template} = 1`, "}"), key)).length === 1;

  it("rules a key out by a template's literal start or end", async () => {
    // The character next to an interpolation may compose with what it
    // yields, so it is left out.
    for (const [key, template, may] of [
      ["acl", '"${x}cl"', true],
      ["abc", '"${x}cl"', false],
      ["acl", '"ac${x}"', true],
      ["zac", '"ac${x}"', false],
      ["ba", '"ac${x}"', false],
      ["axf", '"ab${x}cd${y}ef"', true],
      ["axe", '"ab${x}cd${y}ef"', false],
      ["zzz", '"a${x}b"', true],
      ["ad", '"ab${x}cd"', true],
      ["a", '"ab${x}ba"', false],
      ["aa", '"ab${x}ba"', true],
      ["zzz", '"${x}"', true],
      ["zzz", '"\\uD800${x}"', true],
      ["zzz", '"${x}\\uD800"', true],
      ["zzz", '"a${~ x}"', true],
      ["zzz", '"%{ if x }a%{ endif }"', true],
    ])
      assert.equal(await computed(key, template), may, `${key} ${template}`);
  });

  it("may name any key with a heredoc", async () => {
    assert.deepEqual(
      await rows(lines("x = {", "  <<EOT", "a", "EOT", "  = 1", "}"), "zzz"),
      [2],
    );
  });

  it("compares a for expression's literal key", async () => {
    for (const [key, expression, may] of [
      ["acl", '"acl"', true],
      ["other", '"acl"', false],
      ["other", '("acl")', false],
      ["other", '"\\uD800"', true],
      ["other", "k", true],
      ["other", "k.x", true],
      ["other", '"ab${k}"', false],
    ])
      assert.equal(
        (await rows(`x = { for k in y : ${expression} => 1 }\n`, key)).length,
        may ? 1 : 0,
        `${key} ${expression}`,
      );
  });
});

describe("Terraform property reader: functions that keep their arguments", () => {
  it("reads an object inside each such function", async () => {
    for (const call of [
      'tomap({ acl = "a" })',
      'toset([{ acl = "a" }])',
      'tolist([{ acl = "a" }])',
      'concat([{ acl = "a" }])',
      'flatten([{ acl = "a" }])',
      'yamlencode({ acl = "a" })',
      'core::merge({ acl = "a" })',
    ])
      assert.deepEqual(await members(`x = ${call}\n`, "acl"), ["a"], call);
  });

  it("refuses an object inside another function", async () => {
    assert.deepEqual(
      await rows('x = jsoncore::merge({ acl = "a" })\n', "acl"),
      [1],
    );
  });
});

/** A variable with a type and a default. */
const variable = (type, value) =>
  lines('variable "v" {', `  type = ${type}`, `  default = ${value}`, "}");

const COMPOSED = `caf${String.fromCharCode(0xe9)}`;
const DECOMPOSED = `cafe${String.fromCharCode(0x301)}`;
const NBSP = String.fromCharCode(0xa0);

describe("Terraform property reader: typed variable defaults", () => {
  it("reads a default its type keeps as written", async () => {
    for (const [type, value, want] of [
      ["any", '"x"', ["x"]],
      ["string", '"x"', ["x"]],
      ["string", "null", ["null"]],
      ["number", "1", ["1"]],
      ["number", "-1", ["-1"]],
      ["bool", "true", ["true"]],
      ["optional(string)", '"x"', ["x"]],
      ["list(string)", '["a", "b"]', ["a", "b"]],
      ["set(string)", '["a"]', ["a"]],
      ["list(any)", "[]", []],
    ])
      assert.deepEqual(
        await members(variable(type, value), "default"),
        want,
        `${type} ${value}`,
      );
  });

  it("refuses a default its type converts", async () => {
    for (const [type, value] of [
      ["string", "1"],
      ["number", '"1"'],
      ["bool", '"true"'],
      ["list", '["a"]'],
      ["list()", '["a"]'],
      ["optional()", '"a"'],
      ["list(string)", '["a", 1]'],
      ["set(string)", '["a", 1]'],
      ["map(string)", '["a"]'],
      ["object({ acl = string })", '["a"]'],
      ["list ? x : y", "[null]"],
      ["tomap(string)", '"a"'],
      ['"string"', '"a"'],
    ])
      assert.deepEqual(
        await rows(variable(type, value), "default"),
        [3],
        `${type} ${value}`,
      );
  });

  it("reads an object default's key when its type keeps every element", async () => {
    for (const [type, value, key, kept] of [
      ["map(string)", '{ acl = "a", b = "c" }', "acl", true],
      ["map(string)", '{ acl = "a", b = "${x}" }', "acl", true],
      ["map(string)", '{ acl = "a", b = 1 }', "acl", false],
      ["map(string)", '{ acl = "a", b = <<EOT\nc\nEOT\n }', "acl", false],
      ["map(number)", '{ acl = "a", b = -2 }', "acl", false],
      ["map(any)", '{ acl = "a", b = -2 }', "acl", true],
      ["map(string)", '{ acl = "a", b = x.y }', "acl", false],
      ["list(string)", '{ acl = "a" }', "acl", false],
      ["object({ acl = string })", '{ acl = "a" }', "acl", true],
      ["object({ acl = string, b = string })", '{ acl = "a" }', "acl", true],
      ["object({ acl = string })", '{ acl = "a", b = "c" }', "acl", false],
      ["object({ acl = number })", '{ acl = "a" }', "acl", false],
      ["object({ acl = optional(string) })", '{ acl = "a" }', "acl", true],
      ["object()", '{ acl = "a" }', "acl", false],
      ["object(x)", '{ acl = "a" }', "acl", false],
      ["object({ (k) = string })", '{ acl = "a" }', "acl", false],
      [
        `object({ "${COMPOSED}" = string })`,
        `{ "${COMPOSED}" = "a" }`,
        COMPOSED,
        true,
      ],
    ]) {
      const result = await read(variable(type, value), key);
      assert.deepEqual(
        result,
        kept
          ? { members: ["a"], rows: [] }
          : { members: [], rows: [[3, `${key} = "a"`]] },
        `${type} ${value}`,
      );
    }
  });

  it("refuses a decomposed attribute name, which declares no key", async () => {
    assert.deepEqual(
      await read(
        variable(
          `object({ "${DECOMPOSED}" = string })`,
          `{ "${COMPOSED}" = "a" }`,
        ),
        COMPOSED,
      ),
      {
        members: [],
        rows: [
          [2, `"${DECOMPOSED}" = string`],
          [3, `"${COMPOSED}" = "a"`],
        ],
      },
    );
  });

  it("checks a number default", async () => {
    for (const [value, kept] of [
      ["{ acl = 1, b = -2 }", true],
      ["{ acl = 1, b = 1 + 2 }", false],
      ["{ acl = 1, b = !2 }", false],
    ]) {
      const result = await read(variable("map(number)", value), "acl");
      assert.deepEqual(
        result,
        kept
          ? { members: ["1"], rows: [] }
          : { members: [], rows: [[3, "acl = 1"]] },
        value,
      );
    }
  });

  it("refuses a computed attribute of an object type", async () => {
    assert.deepEqual(
      await rows(
        variable(
          "object({ acl = string, (k) = string })",
          '{ acl = "a", (j) = "b" }',
        ),
        "acl",
      ),
      [3, 3],
    );
  });

  it("converts only a variable's default", async () => {
    assert.deepEqual(
      await members(
        lines('variable "v" {', "  type = number", '  description = "a"', "}"),
        "description",
      ),
      ["a"],
    );
  });

  it("refuses a computed key of a map or object default", async () => {
    for (const type of ["map(string)", "object({ acl = string })"])
      assert.deepEqual(
        await rows(variable(type, '{ acl = "a", (k) = "c" }'), "acl"),
        [3, 3],
        type,
      );
  });

  it("finds the type wherever it is written", async () => {
    assert.deepEqual(
      await rows(
        lines('variable "v" {', '  default = "a"', "  type = number", "}"),
        "default",
      ),
      [2],
    );
    for (const content of [
      lines('variable "v" {', '  default = "a"', "}"),
      lines('variable "v" {', "  type {", "  }", '  default = "a"', "}"),
      lines('resource "r" "n" {', "  type = number", '  default = "a"', "}"),
      lines('default = "a"', "type = number"),
    ])
      assert.deepEqual(await members(content, "default"), ["a"], content);
  });
});

describe("Terraform property reader: variable type constraints", () => {
  const type = (constraint) =>
    lines('variable "v" {', `  type = ${constraint}`, "}");

  it("reads an optional attribute's default", async () => {
    for (const [constraint, want] of [
      ['object({ acl = optional(string, "x") })', { members: ["x"], rows: [] }],
      [
        'optional(object({ acl = optional(string, "x") }))',
        { members: ["x"], rows: [] },
      ],
      [
        'object({ s = optional(object({ acl = string }), { acl = "y" }) })',
        { members: ["y"], rows: [] },
      ],
      [
        'object({ s = optional(object({ b = string }), { acl = "y" }) })',
        { members: [], rows: [[2, '{ acl = "y" }']] },
      ],
      [
        'object({ s = optional(object({ b = string }), { c = "y" }) })',
        { members: [], rows: [] },
      ],
      [
        'object({ acl = optional(number, "007") })',
        { members: [], rows: [[2, 'acl = optional(number, "007")']] },
      ],
      ["object({ acl = optional(string) })", { members: [], rows: [] }],
      ["object({ acl = optional() })", { members: [], rows: [] }],
      [
        'object({ acl = core::optional(string, "x") })',
        { members: [], rows: [] },
      ],
      ["object({ acl = string })", { members: [], rows: [] }],
      ["object({ acl = a.b })", { members: [], rows: [] }],
      ['map(string, { acl = "x" })', { members: [], rows: [] }],
      ['object({ b = optional(string, "x") })', { members: [], rows: [] }],
    ])
      assert.deepEqual(await read(type(constraint), "acl"), want, constraint);
  });

  it("refuses a decomposed attribute name that may be the key", async () => {
    assert.deepEqual(
      await rows(
        type(`object({ "${DECOMPOSED}" = optional(string, "x") })`),
        COMPOSED,
      ),
      [2],
    );
  });

  it("reads a type attribute outside a variable as a value", async () => {
    assert.deepEqual(
      await members(
        lines('resource "r" "n" {', '  type = { acl = "a" }', "}"),
        "acl",
      ),
      ["a"],
    );
    assert.deepEqual(
      await rows(
        lines('resource "r" "n" {', '  type = c ? { acl = "a" } : {}', "}"),
        "acl",
      ),
      [2],
    );
  });
});

describe("Terraform property reader: values evaluation may drop", () => {
  it("refuses an element of a selected, converted or iterated object", async () => {
    for (const expression of [
      '{ acl = "a" }[k]',
      '{ acl = "a" }.acl',
      '[{ acl = "a" }][*]',
      '[{ acl = "a" }][*].b',
      'y[{ acl = "a" }]',
      '[for v in y : { acl = "a" }]',
      'c ? { acl = "a" } : null',
      '{ acl = "a" } == y',
      'coalesce({ acl = "a" })',
      '"%{ for v in y }${jsonencode({ acl = "a" })}%{ endfor }"',
    ])
      assert.deepEqual(
        await rows(`x = ${expression}\n`, "acl"),
        [1],
        expression,
      );
    for (const expression of [
      '{ for k in y : k => { acl = "a" } }',
      'coalesce({ acl = "a" }, { acl = "b" })',
    ])
      assert.deepEqual(
        await rows(`x = ${expression}\n`, "acl"),
        [1, 1],
        expression,
      );
  });

  it("refuses an element a later key may replace", async () => {
    for (const [object, want] of [
      [
        '{ a = { acl = "x" }, a = 1 }',
        { members: [], rows: [[1, 'acl = "x"']] },
      ],
      ['{ a = { acl = "x" }, b = 1 }', { members: ["x"], rows: [] }],
      ['{ b = 1, a = { acl = "x" } }', { members: ["x"], rows: [] }],
      [
        '{ (k) = { acl = "x" }, b = 1 }',
        {
          members: [],
          rows: [
            [1, '(k) = { acl = "x" }'],
            [1, 'acl = "x"'],
          ],
        },
      ],
      [
        '{ a = { acl = "x" }, (k) = 1 }',
        {
          members: [],
          rows: [
            [1, 'acl = "x"'],
            [1, "(k) = 1"],
          ],
        },
      ],
      ['{ acl = "a", (k) = 1 }', { members: ["a"], rows: [[1, "(k) = 1"]] }],
      [
        '{ acl = "a", acl = "b" }',
        {
          members: [],
          rows: [
            [1, 'acl = "a"'],
            [1, 'acl = "b"'],
          ],
        },
      ],
    ])
      assert.deepEqual(await read(`x = ${object}\n`, "acl"), want, object);
  });
});

describe("Terraform property reader: blocks and keys made at evaluation", () => {
  it("refuses a Terragrunt include only in an .hcl file", async () => {
    const content = lines('include "root" {', "}");
    assert.deepEqual(await rows(content, "acl", "terragrunt.hcl"), [1]);
    assert.deepEqual(await rows(content, "acl", "main.tf"), []);
    assert.deepEqual(await rows(content, "acl", "main.hcl.tf"), []);
    assert.deepEqual(
      await rows(lines('locals "root" {', "}"), "acl", "a.hcl"),
      [],
    );
  });

  it("refuses an indented heredoc a blank-trimmed marker line would end", async () => {
    assert.deepEqual(
      await rows(lines("x = <<-EOT", "  a", `${NBSP}EOT`, "  EOT"), "acl"),
      [1],
    );
  });

  it("reads a for_each map's keys as instance keys", async () => {
    const forEach = "for_each = { for k in v : k => 1 }";
    for (const block of [
      'resource "r" "n"',
      'data "d" "n"',
      'module "m"',
      "import",
      'provider "p"',
      'ephemeral "e" "n"',
    ])
      assert.deepEqual(
        await rows(lines(`${block} {`, `  ${forEach}`, "}"), "acl"),
        [],
        block,
      );
    assert.deepEqual(
      await rows(
        lines(
          'resource "r" "n" {',
          '  dynamic "d" {',
          `    ${forEach}`,
          "  }",
          "}",
        ),
        "acl",
      ),
      [],
    );
    for (const [content, path] of [
      [lines("locals {", `  ${forEach}`, "}"), "main.tf"],
      [lines("x = 1", forEach), "main.tf"],
      [
        lines('resource "r" "n" {', "  other = { for k in v : k => 1 }", "}"),
        "main.tf",
      ],
      [
        lines(
          'resource "r" "n" {',
          "  for_each = merge({ for k in v : k => 1 })",
          "}",
        ),
        "main.tf",
      ],
      [lines('resource "r" "n" {', `  x = { ${forEach} }`, "}"), "main.tf"],
      [lines('resource "r" "n" {', `  ${forEach}`, "}"), "terragrunt.hcl"],
    ])
      assert.deepEqual(await rows(content, "acl", path), [2], content);
  });
});

describe("Terraform property reader: merge", () => {
  for (const [call, want] of [
    ['merge({ acl = "a" }, { b = 1 })', { members: ["a"], rows: [] }],
    ['merge({ acl = "a", b = 1 }, { b = 2 })', { members: ["a"], rows: [] }],
    ['merge({ acl = "a" }, { acl = "b" })', { members: ["a", "b"], rows: [1] }],
    [
      'merge({ acl = "a" }, { acl = "b", c = 1 })',
      { members: ["a", "b"], rows: [1] },
    ],
    ['merge({ acl = "a" }, x)', { members: ["a"], rows: [1] }],
    ['merge({ acl = "a" }, x[0])', { members: ["a"], rows: [1] }],
    ['merge(x, { acl = "a" })', { members: ["a"], rows: [] }],
    ['merge({ s = { acl = "a" } }, { s = {} })', { members: ["a"], rows: [1] }],
    [
      'merge({ s = { acl = "a" }, t = 1 }, { t = 2 })',
      { members: ["a"], rows: [] },
    ],
    [
      'merge({ acl = "a", (k) = 1 }, { b = 1 })',
      { members: ["a"], rows: [1, 1] },
    ],
    ['merge({ acl = "a" }, { (k) = 1 })', { members: ["a"], rows: [1, 1] }],
    ['merge({ "${k}zz" = 1 }, { b = 1 })', { members: [], rows: [] }],
    ['merge({ "${k}cl" = 1 }, { b = 1 })', { members: [], rows: [1, 1] }],
    ["merge(x, y)", { members: [], rows: [] }],
    ["merge()", { members: [], rows: [] }],
    ['merge([{ acl = "a" }]...)', { members: ["a"], rows: [1] }],
    ['merge([{ b = "a" }]...)', { members: [], rows: [] }],
    ['merge([{ acl = "a" }])', { members: ["a"], rows: [] }],
  ])
    it(`reads ${call}`, async () => {
      const result = await read(`x = ${call}\n`, "acl");
      assert.deepEqual(
        { members: result.members, rows: result.rows.map(([line]) => line) },
        want,
      );
    });
});
