import { describe, expect, test } from "bun:test";
import {
  hasMeaningfulSourceDiff,
  isTrailingCommaBeforeCloser,
} from "../../../src/public/impact/diff-meaning.js";

describe("isTrailingCommaBeforeCloser", () => {
  test.each([
    [",", ")", true],
    [",", "]", true],
    [",", "}", true],
    [",", ">", false],
    [",", undefined, false],
    [";", ")", false],
  ] as const)("%p before %p is %p", (character, next, expected) => {
    expect(isTrailingCommaBeforeCloser(character, next)).toBe(expected);
  });
});

const diff = (...lines: string[]) => lines.join("\n");

describe("hasMeaningfulSourceDiff", () => {
  test.each([
    ["empty diff", ""],
    [
      "whitespace-only change",
      diff("@@ -1 +1 @@", "-const a=1;", "+const  a = 1;"),
    ],
    ["trailing comma before )", diff("@@", "-f(a)", "+f(a,)")],
    ["trailing comma before ]", diff("@@", "-[a]", "+[a,]")],
    ["trailing comma before }", diff("@@", "-{a}", "+{a,}")],
    ["trailing comma across lines", diff("@@", "-f(a", "-)", "+f(a,", "+)")],
    ["file headers only", diff("--- a/x.ts", "+++ b/x.ts", "@@", "-a", "+a")],
    ["added line that looks like a header", diff("@@", "+++counter")],
    ["removed line that looks like a header", diff("@@", "---counter")],
    ["context lines only", diff("@@", " a", " b")],
    ["moved whitespace between lines", diff("@@", "-a b", "+a", "+b")],
    ["CRLF line endings", '@@\r\n-"a\r\n+"a'],
    ["empty string then spacing", diff("@@", '-x = "" + a', '+x = ""+a')],
    [
      "escaped backslash then a trailing comma",
      diff("@@", '-f("a\\\\",)', '+f("a\\\\")'),
    ],
    ["header text inside a line", diff("@@", "-a@@b", "+a@@b")],
    [
      "escaped quote then spacing",
      diff("@@", '-x = "a\\"" + b', '+x = "a\\""+b'),
    ],
  ])("%s is not meaningful", (_name, text) => {
    expect(hasMeaningfulSourceDiff(text)).toBe(false);
  });

  test.each([
    ["changed token", diff("@@", "-a", "+b")],
    ["removed line only", diff("@@", "-a")],
    ["added line only", diff("@@", "+a")],
    ["lines without a hunk header", diff("-a", "+b")],
    ["comma not before a closer", diff("@@", "-[a]", "+[a,b]")],
    ["double-quoted spacing", diff("@@", '-x = "a b"', '+x = "ab"')],
    ["single-quoted spacing", diff("@@", "-x = 'a b'", "+x = 'ab'")],
    ["template spacing", diff("@@", "-x = `a b`", "+x = `ab`")],
    [
      "escaped quote keeps the string open",
      diff("@@", '-x = "a\\" b"', '+x = "a\\"b"'),
    ],
    ["quote moved inside the text", diff("@@", '-"ab"', '+a"b"')],
    ["changed call before a string", diff("@@", '-a("x")', '+b("x")')],
    ["comma inside single quotes", diff("@@", "-x = ',)'", "+x = ')'")],
    ["comma inside a template", diff("@@", "-x = `,)`", "+x = `)`")],
    ["comma inside a string", diff("@@", '-x = ",)"', '+x = ")"')],
    [
      "escaped quote before a string comma",
      diff("@@", '-x = "\\",)"', '+x = "\\")"'),
    ],
    ["a later meaningful hunk", diff("@@", "-a", "+a ", "@@", "-b", "+c")],
    ["an earlier meaningful hunk", diff("@@", "-b", "+c", "@@", "-a", "+a")],
    ["LF line endings", "@@\n-a\n+b"],
  ])("%s is meaningful", (_name, text) => {
    expect(hasMeaningfulSourceDiff(text)).toBe(true);
  });
});
