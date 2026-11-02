import { afterEach, describe, expect, test } from "bun:test";
import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { runCodeEvaluator } from "../../src/operations/proof/code-runner.js";
import { evaluateSourceCode } from "../../src/operations/proof/source-code-readers.js";
import { type SourceSpec, readSource } from "../../src/public/proof-sources.js";

// implements REQ-kibi-multilingual-code-proofs

const roots: string[] = [];
const savedSwipl = process.env.KIBI_SWIPL;
afterEach(() => {
  if (savedSwipl === undefined)
    Reflect.deleteProperty(process.env, "KIBI_SWIPL");
  else process.env.KIBI_SWIPL = savedSwipl;
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

function workspace(files: Record<string, string>): string {
  const root = mkdtempSync(path.join(tmpdir(), "kibi-code-runner-"));
  roots.push(root);
  for (const [relative, content] of Object.entries(files)) {
    mkdirSync(path.dirname(path.join(root, relative)), { recursive: true });
    writeFileSync(path.join(root, relative), content);
  }
  return root;
}

describe("runCodeEvaluator", () => {
  test("refuses a file in a language it has no script for", () => {
    const root = workspace({ "src/model.rb": "x = 1\n" });
    const run = runCodeEvaluator(
      root,
      "src/model.rb",
      { js: "console.log(1)", python: undefined },
      [],
    );
    expect(run.ok).toBe(false);
    if (run.ok) return;
    expect(run.language).toBeNull();
    expect(run.failure).toContain("src/model.rb");
  });

  test("refuses a known language whose script the caller lacks", () => {
    const root = workspace({ "src/model.py": "x = 1\n" });
    const run = runCodeEvaluator(
      root,
      "src/model.py",
      { js: "console.log(1)" },
      [],
    );
    expect(run).toMatchObject({ ok: false, language: "python" });
  });

  test("reports why SWI-Prolog cannot be resolved", () => {
    process.env.KIBI_SWIPL = "relative/swipl";
    const root = workspace({ "src/facts.pl": "fact(a).\n" });
    const run = runCodeEvaluator(
      root,
      "src/facts.pl",
      { prolog: ":- initialization(halt)." },
      [],
    );
    expect(run.ok).toBe(false);
    if (run.ok) return;
    expect(run.language).toBe("prolog");
    expect(run.failure).toContain(
      "KIBI_SWIPL=relative/swipl is not an absolute path",
    );
  });

  test("runs a script with the workspace's tsx", () => {
    const root = workspace({ "src/model.ts": "export const x = 1;\n" });
    const tsx = path.join(root, "node_modules", ".bin", "tsx");
    mkdirSync(path.dirname(tsx), { recursive: true });
    // A stand-in tsx that prints the arguments it was given as JSON.
    writeFileSync(
      tsx,
      `#!/bin/sh\nprintf '{"argv":["%s","%s","%s","%s"]}\\n' "$1" "$2" "$3" "$4"\n`,
    );
    chmodSync(tsx, 0o755);
    const run = runCodeEvaluator(
      root,
      "src/model.ts",
      { js: "SCRIPT" },
      ["arg"],
      () => true,
      {
        runners: ["tsx"],
      },
    );
    expect(run).toEqual({
      ok: true,
      value: { argv: ["--eval", "SCRIPT", "--", "arg"] },
      language: "js",
    });
  });

  test("skips tsx when the workspace has none", () => {
    const root = workspace({ "src/model.ts": "export const x = 1;\n" });
    const run = runCodeEvaluator(
      root,
      "src/model.ts",
      { js: "SCRIPT" },
      [],
      () => true,
      {
        runners: ["tsx"],
      },
    );
    expect(run).toEqual({ ok: false, failure: "", language: "js" });
  });
});

describe("the SWI-Prolog source reader", () => {
  test("says when SWI-Prolog cannot run", async () => {
    process.env.KIBI_SWIPL = "relative/swipl";
    const root = workspace({ "prolog/facts.pl": "fact(a).\n" });
    const result = await readSource(
      root,
      {
        reader: "references",
        files: "prolog/*.pl",
        extract: "imports",
      } as unknown as SourceSpec,
      evaluateSourceCode,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toContain(
      "Kibi could not run SWI-Prolog to read prolog/facts.pl: KIBI_SWIPL=relative/swipl is not an absolute path",
    );
  });
});
