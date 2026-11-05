import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { evaluateSourceCode } from "../../../src/operations/proof/source-code-readers.js";
import type { SourceSpec } from "../../../src/public/proof-sources.js";

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

// Runs the reader under the real SWI-Prolog: the reader is a Prolog program.
describe("the SWI-Prolog source reader", () => {
  test("lists a fact argument in file order", async () => {
    const root = mkdtempSync(path.join(tmpdir(), "kibi-prolog-reader-"));
    roots.push(root);
    writeFileSync(path.join(root, "facts.pl"), "color(red).\ncolor(green).\nshow :- color(X), writeln(X).\n");
    expect(
      await evaluateSourceCode(root, { reader: "prolog", file: "facts.pl", functor: "color/1", arg: 1 } as unknown as SourceSpec),
    ).toEqual({ ok: true, members: ["green", "red"], sequence: ["red", "green"] });
  });
});
