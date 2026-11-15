import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import * as runtime from "kibi-runtime";
import type { PrologProcess } from "kibi-runtime";

import { analyzeKbCheckImpact } from "../../src/tools/check-impact.js";
import { runAggregatedChecks } from "../../src/tools/check-prolog.js";
import { collectQueryPlanSafetyViolations } from "../../src/tools/query-plan-safety.js";

const roots: string[] = [];
const restores: Array<() => void> = [];
afterEach(() => {
  for (const restore of restores.splice(0)) restore();
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

function tempDir(name = ""): string {
  const base = mkdtempSync(join(tmpdir(), "kibi-check-exact-"));
  roots.push(base);
  if (!name) return base;
  const dir = join(base, name);
  mkdirSync(dir);
  return dir;
}

function setEnv(key: string, value: string | undefined) {
  const previous = process.env[key];
  if (value === undefined) Reflect.deleteProperty(process.env, key);
  else process.env[key] = value;
  restores.push(() => {
    if (previous === undefined) Reflect.deleteProperty(process.env, key);
    else process.env[key] = previous;
  });
}

describe("analyzeKbCheckImpact", () => {
  test("passes only the options the caller set", async () => {
    const spy = spyOn(runtime, "analyzeChangedFileImpact").mockImplementation(
      (async () => ({ impact: 1 })) as never,
    );
    restores.push(() => spy.mockRestore());
    expect(
      await analyzeKbCheckImpact("/ws", {
        includeImpactDiagnostics: true,
      }),
    ).toStrictEqual({ impact: 1 } as never);
    expect(spy.mock.calls[0]?.[0]).toStrictEqual({
      workspaceRoot: "/ws",
      includeImpactDiagnostics: true,
    });
    await analyzeKbCheckImpact("/ws", {
      sourceFiles: ["a.ts"],
      staged: false,
      includeWorkingTreeDiff: false,
      includeImpactDiagnostics: false,
      maxDiagnostics: 0,
    });
    expect(spy.mock.calls[1]?.[0]).toStrictEqual({
      workspaceRoot: "/ws",
      sourceFiles: ["a.ts"],
      staged: false,
      includeWorkingTreeDiff: false,
      includeImpactDiagnostics: false,
      maxDiagnostics: 0,
    });
    await analyzeKbCheckImpact("/ws", { staged: true });
    expect(spy.mock.calls[2]?.[0]).toStrictEqual({
      workspaceRoot: "/ws",
      staged: true,
    });
    await analyzeKbCheckImpact("/ws", { includeWorkingTreeDiff: true });
    expect(spy.mock.calls[3]?.[0]).toStrictEqual({
      workspaceRoot: "/ws",
      includeWorkingTreeDiff: true,
    });
  });
});

describe("collectQueryPlanSafetyViolations", () => {
  test("reports negation before a later generator with the clause's start line", () => {
    const dir = tempDir();
    const file = join(dir, "checks.pl");
    writeFileSync(
      file,
      [
        "",
        "  ",
        "safe(X) :- kb_entity(X, _, _), \\+ done(X).",
        " \t ",
        "unsafe(X) :-",
        "    \\+ done(X),",
        "    kb_entity(X, _, _).",
        ":- dynamic other/1.",
        "  spaced (Y) :-",
        "\t\\+ ok(Y),",
        "  member(Y, [a]).   ",
        "x :- \\+ a,",
        "  findall(Z, b(Z), _).",
        "safe_again(X) :- \\+ a(X).",
        "Upper(X) :- \\+ a(X),",
        "  member(X, [a]).",
        "trailing(X) :- \\+ a(X),",
        "  member(X, [a])",
      ].join("\r\n"),
    );
    expect(collectQueryPlanSafetyViolations(file)).toStrictEqual([
      {
        rule: "query-plan-safety",
        entityId: "unsafe",
        description:
          "Negation appears before later generator calls in the same clause.",
        suggestion:
          "Move kb_entity/kb_relationship/member/findall generators before \\+/1 so variables are bound before negation.",
        source: `${file}:6`,
      },
      {
        rule: "query-plan-safety",
        entityId: "spaced",
        description:
          "Negation appears before later generator calls in the same clause.",
        suggestion:
          "Move kb_entity/kb_relationship/member/findall generators before \\+/1 so variables are bound before negation.",
        source: `${file}:10`,
      },
      {
        rule: "query-plan-safety",
        entityId: "unknown",
        description:
          "Negation appears before later generator calls in the same clause.",
        suggestion:
          "Move kb_entity/kb_relationship/member/findall generators before \\+/1 so variables are bound before negation.",
        source: `${file}:12`,
      },
      {
        rule: "query-plan-safety",
        entityId: "unknown",
        description:
          "Negation appears before later generator calls in the same clause.",
        suggestion:
          "Move kb_entity/kb_relationship/member/findall generators before \\+/1 so variables are bound before negation.",
        source: `${file}:15`,
      },
    ]);
  });

  test("a negation on the clause's first line still counts", () => {
    const dir = tempDir();
    const file = join(dir, "checks.pl");
    writeFileSync(file, "first(X) :- \\+ a(X),\n  member(X, [a]).\n");
    expect(
      collectQueryPlanSafetyViolations(file).map((v) => v.source),
    ).toStrictEqual([`${file}:1`]);
  });

  test("a generator name only counts when spaces at most separate it from its arguments", () => {
    const dir = tempDir();
    const file = join(dir, "checks.pl");
    writeFileSync(
      file,
      [
        "spaced(X) :- \\+ a(X),",
        "  findall (Z, b(Z), _).",
        "longer(X) :- \\+ a(X),",
        "  members(X, [a]).",
        "",
      ].join("\n"),
    );
    expect(
      collectQueryPlanSafetyViolations(file).map((v) => v.entityId),
    ).toStrictEqual(["spaced"]);
  });

  test("a clause with no negation or no later generator is fine", () => {
    const dir = tempDir();
    const file = join(dir, "checks.pl");
    writeFileSync(
      file,
      "a(X) :- member(X, [1]).\nb(X) :- member(X, [1]), \\+ c(X).\n",
    );
    expect(collectQueryPlanSafetyViolations(file)).toStrictEqual([]);
  });
});

describe("runAggregatedChecks", () => {
  function engine(json: unknown) {
    const goals: string[] = [];
    const prolog = {
      query: async (goal: string) => {
        goals.push(goal);
        return {
          success: true,
          bindings: { Transport: "answer", JsonString: json },
        };
      },
    } as unknown as PrologProcess;
    return { prolog, goals };
  }

  test("adds query-plan-safety findings from the checks file when selected", async () => {
    const dir = tempDir("it's");
    const file = join(dir, "checks.pl");
    writeFileSync(file, "bad(X) :-\n  \\+ a(X),\n  member(X, [a]).\n");
    setEnv("KIBI_CHECKS_PL_PATH", file);
    const { prolog, goals } = engine("{}");
    const violations = await runAggregatedChecks(
      prolog,
      new Set(["query-plan-safety"]),
      false,
    );
    expect(violations.map((v) => [v.rule, v.entityId, v.source])).toStrictEqual(
      [["query-plan-safety", "bad", `${file}:2`]],
    );
    expect(goals[0]).toStartWith(
      `(load_files('${file.replaceAll("'", "''")}', [if(changed)]),`,
    );
    const other = await runAggregatedChecks(
      engine("{}").prolog,
      new Set(["required-fields"]),
      false,
    );
    expect(other).toStrictEqual([]);
  });

  test("a backslash in the checks path is sent to the engine as a slash", async () => {
    const dir = tempDir("a\\b");
    const file = join(dir, "checks.pl");
    writeFileSync(file, "");
    setEnv("KIBI_CHECKS_PL_PATH", file);
    const { prolog, goals } = engine("{}");
    await runAggregatedChecks(prolog, new Set(), false);
    expect(goals[0]).toStartWith(
      `(load_files('${file.replaceAll("\\", "/")}', [if(changed)]),`,
    );
  });

  test("an answer without JSON is reported as such", async () => {
    for (const missing of [undefined, "", 7]) {
      await expect(
        runAggregatedChecks(engine(missing).prolog, new Set(), false),
      ).rejects.toThrow(
        new Error("Failed to parse violations JSON: No JSON string in binding"),
      );
    }
  });
});
