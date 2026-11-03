/// <reference types="bun-types" />
// implements REQ-opencode-comment-routing
import { afterAll, describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  analyzeCodeFile,
  createFingerprint,
  extractJsTsComments,
  extractPythonComments,
} from "../src/comment-analysis";
import { classifyKnowledge } from "../src/knowledge-classifier";

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-oc-ca-mut-"));

afterAll(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

/** Independent reference for the fingerprint: a 31-multiplier string hash. */
function referenceFingerprint(text: string): string {
  const normalized = text
    .slice(0, 200)
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .join(" ");
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    hash = (Math.imul(hash, 31) + normalized.charCodeAt(i)) | 0;
  }
  return hash.toString(16);
}

function block(text: string) {
  return { text, kind: "block-comment" };
}

function docstring(text: string) {
  return { text, kind: "docstring" };
}

let fileCount = 0;
function write(ext: string, content: string): string {
  fileCount += 1;
  const file = path.join(tmpDir, `f${fileCount}.${ext}`);
  fs.writeFileSync(file, content);
  return file;
}

const MEDIUM = "This value is always positive and is checked at the boundary.";
const MEDIUM_2 =
  "The counter is never reset while the worker process is alive.";
const HIGH =
  "Emails must be unique, at most five per user, never shared across tenants.";
const HIGH_2 =
  "Names must be unique, at most ten per group, and always lower case here.";

describe("createFingerprint", () => {
  test("matches the reference hash, including negative values", () => {
    for (const text of ["", "a", HIGH, MEDIUM, "zzzzzzzzzzzzzzzzzzzzzzzz"]) {
      expect(createFingerprint(text)).toBe(referenceFingerprint(text));
    }
    expect(createFingerprint("")).toBe("0");
    expect(createFingerprint("a")).toBe("61");
    expect(createFingerprint("ab")).toBe("c21");
  });

  test("ignores case and runs of whitespace", () => {
    expect(createFingerprint("Ab  C\n\td")).toBe(createFingerprint("ab c d"));
    expect(createFingerprint("Ab  C\n\td")).toBe(
      referenceFingerprint("ab c d"),
    );
  });

  test("hashes only the first 200 characters, trimmed", () => {
    const head = "x".repeat(200);
    expect(createFingerprint(`${head}tail`)).toBe(createFingerprint(head));
    expect(createFingerprint(`${"y".repeat(199)} tail`)).toBe(
      createFingerprint("y".repeat(199)),
    );
    expect(createFingerprint(head)).not.toBe(
      createFingerprint("x".repeat(199)),
    );
  });
});

describe("extractJsTsComments", () => {
  test("block comments lose their markers and leading stars", () => {
    expect(extractJsTsComments("/* a */")).toStrictEqual([block("a")]);
    expect(
      extractJsTsComments("/**\n * a\n *b\n*c\n * d * e\n */\ncode();"),
    ).toStrictEqual([block("a\nb\nc\nd * e")]);
    expect(extractJsTsComments("  /** x\n   *  y\n   */")).toStrictEqual([
      block("x\n y"),
    ]);
    expect(extractJsTsComments("/**  * x */")).toStrictEqual([block("x")]);
    expect(extractJsTsComments("/*\n * a\n *   \n * b\n */")).toStrictEqual([
      block("a\n  \nb"),
    ]);
  });

  test("trailing spaces after the closing marker do not keep it", () => {
    expect(extractJsTsComments("/* a */   ")).toStrictEqual([block("a")]);
  });

  test("the closing marker is removed only at the very end", () => {
    expect(extractJsTsComments("/* a */ code();")).toStrictEqual([
      block("a */ code();"),
    ]);
  });

  test("an unterminated block runs to the end of the file", () => {
    expect(
      extractJsTsComments("x();\n/* a\ncode();\n// not separate"),
    ).toStrictEqual([block("a\ncode();\n// not separate")]);
  });

  test("empty blocks are dropped; following comments are still read", () => {
    expect(
      extractJsTsComments("/*\n */\n/* a */\n// b\r\n// c\r\nx();\n/**/"),
    ).toStrictEqual([block("a"), block("b\nc"), block("/")]);
  });

  test("line comments group while lines start with //", () => {
    expect(
      extractJsTsComments("// a\n//b\n  //  c\nx();\n// d\ncode(); // e"),
    ).toStrictEqual([block("a\nb\n c"), block("d")]);
    expect(extractJsTsComments("//\n//   \nx();")).toStrictEqual([]);
  });
});

describe("extractPythonComments", () => {
  test("# comments group by indent", () => {
    expect(
      extractPythonComments("# a  \n#  b\n    # c\n# d\nx = 1\n#\n#"),
    ).toStrictEqual([block("a\nb"), block("c"), block("d")]);
  });

  test("CRLF files are read line by line", () => {
    expect(
      extractPythonComments('# a\r\n# b\r\n"""Doc."""\r\nx = 1\r\n'),
    ).toStrictEqual([block("a\nb"), docstring("Doc.")]);
  });

  test("a module docstring must be the first statement", () => {
    expect(
      extractPythonComments('\n# c\n"""Mod doc."""\nx = 1\n"""Not doc."""'),
    ).toStrictEqual([block("c"), docstring("Mod doc.")]);
    expect(extractPythonComments('x = 1\n"""Not doc."""')).toStrictEqual([]);
    expect(extractPythonComments('"""  Spaced.  """')).toStrictEqual([
      docstring("Spaced."),
    ]);
  });

  test("docstring lines indented less than the opening are left out", () => {
    expect(
      extractPythonComments(
        '    """First\n  dropped\n    kept\n  \n\n        deeper\n    last"""\n# after',
      ),
    ).toStrictEqual([
      docstring("First\nkept\n\n\ndeeper\nlast"),
      block("after"),
    ]);
  });

  test("single quotes, closing text and unclosed docstrings", () => {
    expect(extractPythonComments("'''a\nb'''")).toStrictEqual([
      docstring("a\nb"),
    ]);
    expect(extractPythonComments('"""\na\n  b  """ trailing')).toStrictEqual([
      docstring("a\nb"),
    ]);
    expect(extractPythonComments('"""a\n# b')).toStrictEqual([
      docstring("a\n# b"),
    ]);
  });

  test("an empty docstring still uses up the docstring slot", () => {
    expect(extractPythonComments('""""""\n"""Later."""')).toStrictEqual([]);
    expect(
      extractPythonComments('"""\n\n"""\n"""Later."""\n# c'),
    ).toStrictEqual([block("c")]);
  });

  test("class and def bodies may open with a docstring", () => {
    expect(
      extractPythonComments(
        [
          "x = 1",
          "class A:",
          '    """Class doc."""',
          "    y = 2",
          '    """Not doc."""',
          "def   f():",
          "    # comment",
          "",
          '    """Fn doc."""',
          "    def g():",
          "        z = 3",
          '        """Not doc either."""',
          '"""After."""',
        ].join("\n"),
      ),
    ).toStrictEqual([
      docstring("Class doc."),
      block("comment"),
      docstring("Fn doc."),
    ]);
  });

  test("a body string not indented past its header is no docstring", () => {
    expect(
      extractPythonComments('x = 1\ndef f():\n"""Same indent."""'),
    ).toStrictEqual([]);
    expect(
      extractPythonComments('x = 1\nclass A:\n    pass\n    """Late."""'),
    ).toStrictEqual([]);
  });

  test("only real class/def headers open a docstring slot", () => {
    expect(
      extractPythonComments('x = 1\nprint("def f")\n    """No."""'),
    ).toStrictEqual([]);
    expect(
      extractPythonComments('x = 1\nclassy = 2\n    """No."""'),
    ).toStrictEqual([]);
  });

  test("other triple-quoted strings are skipped whole", () => {
    expect(
      extractPythonComments('x = 1\n"""\n# inside\n"""\n# real'),
    ).toStrictEqual([block("real")]);
    expect(
      extractPythonComments("x = 1\n'''skip'''\n# real\n'''\n# inside"),
    ).toStrictEqual([block("real")]);
  });
});

describe("analyzeCodeFile", () => {
  function expected(file: string, text: string, kind: string) {
    const suggestion = classifyKnowledge(text);
    return {
      filePath: file,
      suggestionType: suggestion?.type,
      confidence: suggestion?.confidence,
      reasoning: suggestion?.reasoning,
      fingerprint: referenceFingerprint(text),
      sourceKind: kind,
    };
  }

  test.each(["js", "jsx", "ts", "tsx", "JS", "Tsx"])(
    "reads .%s files as JavaScript/TypeScript",
    (ext) => {
      const file = write(ext, `// ${HIGH}\nx();`);
      expect(analyzeCodeFile(file, { minLines: 1 })).toStrictEqual(
        expected(file, HIGH, "block-comment"),
      );
    },
  );

  test("reads .py and .PY files as Python", () => {
    for (const ext of ["py", "PY"]) {
      const file = write(ext, `"""${HIGH}"""\n# ${MEDIUM}`);
      expect(analyzeCodeFile(file, { minLines: 1 })).toStrictEqual(
        expected(file, HIGH, "docstring"),
      );
    }
    const file = write("py", `// ${HIGH}`);
    expect(analyzeCodeFile(file, { minLines: 1 })).toBeNull();
  });

  test("other or missing extensions and unreadable files give null", () => {
    expect(
      analyzeCodeFile(write("md", `// ${HIGH}`), { minLines: 1 }),
    ).toBeNull();
    expect(
      analyzeCodeFile(path.join(tmpDir, "noext"), { minLines: 1 }),
    ).toBeNull();
    expect(
      analyzeCodeFile(path.join(tmpDir, "missing.ts"), { minLines: 1 }),
    ).toBeNull();
  });

  test("comments need at least minLines non-blank lines", () => {
    const file = write("ts", `/*\n * ${HIGH}\n *   \n * second\n */`);
    expect(analyzeCodeFile(file, { minLines: 2 })).toStrictEqual(
      expected(file, `${HIGH}\n  \nsecond`, "block-comment"),
    );
    expect(analyzeCodeFile(file, { minLines: 3 })).toBeNull();
  });

  test("unclassified comments are passed over", () => {
    const file = write("ts", `// short note\nx();\n// ${MEDIUM}`);
    expect(analyzeCodeFile(file, { minLines: 1 })).toStrictEqual(
      expected(file, MEDIUM, "block-comment"),
    );
  });

  test("the first high suggestion wins, else the first medium one", () => {
    const mediums = write("ts", `// ${MEDIUM}\nx();\n// ${MEDIUM_2}`);
    expect(analyzeCodeFile(mediums, { minLines: 1 })).toStrictEqual(
      expected(mediums, MEDIUM, "block-comment"),
    );
    const mixed = write(
      "ts",
      `// ${MEDIUM}\nx();\n// ${HIGH}\ny();\n// ${HIGH_2}\nz();\n// ${MEDIUM_2}`,
    );
    expect(analyzeCodeFile(mixed, { minLines: 1 })).toStrictEqual(
      expected(mixed, HIGH, "block-comment"),
    );
  });
});
