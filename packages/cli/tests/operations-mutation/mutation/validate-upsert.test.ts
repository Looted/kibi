import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test";
import { InputError, KbRejection } from "../../../src/cli-errors.js";
import * as contextWarning from "../../../src/operations/mutation/context-warning.js";
import * as contradictions from "../../../src/operations/mutation/contradictions.js";
import * as relationshipsModule from "../../../src/operations/mutation/relationships.js";
import * as sourceAuthoring from "../../../src/operations/mutation/source-authoring.js";
import * as upsertModule from "../../../src/operations/mutation/upsert.js";
import { executeValidateUpsert } from "../../../src/operations/mutation/validate-upsert.js";
import * as warningsModule from "../../../src/operations/mutation/warnings.js";
import type {
  OperationContext,
  PrologQueryResult,
} from "../../../src/public/operations/runtime-types.js";
import * as idStyle from "../../../src/utils/entity-id-style.js";
import { whatIfResult } from "../../helpers/what-if.js";

type Row = Record<string, unknown>;

const spies: { mockRestore: () => void }[] = [];
let goals: string[];
let answers: Record<string, PrologQueryResult>;
let commitCalls: { payload: Row; options: Row }[];
let commitFailures: Record<string, unknown>;
let scopeCalls: unknown[][];
let scope: { existing: Row | undefined } | null;
let renderCalls: unknown[][];
let locateCalls: unknown[][];
let located: () => string;
let contextCalls: unknown[][];
let previewGoalCalls: unknown[];
let whatIfGoalCalls: unknown[];
let coverageCalls: unknown[][];
let styleCalls: unknown[];
let styleWarnings: string[];
let sourceCalls: unknown[][];
let semanticCalls: unknown[];

const relationship = (from: string, to: string) => ({
  type: "relates_to",
  from,
  to,
});
const validatedEntity = (id: string): Row => ({
  id,
  type: id.startsWith("FACT") ? "fact" : "req",
  title: `Validated ${id}`,
  source: `src/${id}.md`,
});
const semantic = { receipt: { advisor: "receipt" }, warnings: ["semantic"] };

beforeEach(() => {
  goals = [];
  answers = {};
  commitCalls = [];
  commitFailures = {};
  scopeCalls = [];
  scope = null;
  renderCalls = [];
  locateCalls = [];
  located = () => "docs/located.md";
  contextCalls = [];
  previewGoalCalls = [];
  whatIfGoalCalls = [];
  coverageCalls = [];
  styleCalls = [];
  styleWarnings = [];
  sourceCalls = [];
  semanticCalls = [];
  spies.push(
    spyOn(upsertModule, "validateUpsertForCommit").mockImplementation(
      async (payload, _context, options) => {
        const staged = options?.staged;
        commitCalls.push({
          payload: payload as unknown as Row,
          options:
            staged === undefined
              ? (options as Row)
              : {
                  staged: {
                    entities: [...staged.entities.keys()],
                    relationships: [...staged.relationships],
                  },
                },
        });
        if (payload.id in commitFailures) throw commitFailures[payload.id];
        return {
          validated: {
            entity: validatedEntity(payload.id),
            relationships: payload.relationships ?? [],
          },
          relationships: [],
          semantic,
        } as never;
      },
    ),
    spyOn(upsertModule, "sourceWriteScope").mockImplementation(
      async (...args) => {
        scopeCalls.push(args);
        return scope as never;
      },
    ),
    spyOn(sourceAuthoring, "renderSourceWrite").mockImplementation(
      async (...args) => {
        renderCalls.push(args);
        return { relative: "docs/rendered.md" } as never;
      },
    ),
    spyOn(sourceAuthoring, "canonicalSourcePath").mockImplementation(
      (...args) => {
        locateCalls.push(args);
        return located();
      },
    ),
    spyOn(contextWarning, "entityContextWarnings").mockImplementation(
      (...args) => {
        contextCalls.push(args);
        return ["context"];
      },
    ),
    spyOn(
      contradictions,
      "buildUpsertContradictionPreviewGoal",
    ).mockImplementation((input) => {
      previewGoalCalls.push(input);
      return "preview-goal";
    }),
    spyOn(contradictions, "buildWhatIfAnalysisGoal").mockImplementation(
      (steps) => {
        whatIfGoalCalls.push(steps);
        return "what-if-goal";
      },
    ),
    spyOn(warningsModule, "symbolCoverageWarnings").mockImplementation(
      async (...args) => {
        coverageCalls.push(args);
        return ["coverage"];
      },
    ),
    spyOn(idStyle, "entityIdStyleWarnings").mockImplementation((input) => {
      styleCalls.push(input);
      return styleWarnings;
    }),
  );
});

afterEach(() => {
  for (const spy of spies.splice(0)) spy.mockRestore();
});

const prolog = {
  query: async (goal: string): Promise<PrologQueryResult> => {
    goals.push(goal);
    return answers[goal] ?? { success: true, bindings: {} };
  },
};

function storeContext(fields: Row = {}): OperationContext {
  return {
    workspaceRoot: "/workspace",
    clock: () => new Date("2026-09-05T00:00:00Z"),
    prolog,
    ...fields,
  } as unknown as OperationContext;
}

function storelessContext(fields: Row = {}): OperationContext {
  return {
    workspaceRoot: "/workspace",
    clock: () => new Date("2026-09-05T00:00:00Z"),
    ...fields,
  } as unknown as OperationContext;
}

type DryRun = {
  content: unknown;
  structuredContent: Row & {
    valid: boolean;
    warnings: unknown;
    whatIf?: { introduced: unknown[] } & Row;
  };
};
const run = async (input: Row, context: OperationContext) =>
  (await executeValidateUpsert(input as never, context)) as unknown as DryRun;

const requirement = (extra: Row = {}): Row => ({
  type: "req",
  id: "REQ-dry",
  properties: { title: "Dry", status: "open" },
  relationships: [relationship("REQ-dry", "FACT-1")],
  ...extra,
});

const invalid = (message: string, extra: Row = {}) => ({
  content: [
    {
      type: "text",
      text: `kb_validate_upsert: payload is invalid. ${message}`,
    },
  ],
  structuredContent: {
    valid: false,
    errors: [message],
    warnings: [],
    semanticAdvisor: null,
    normalizedPreview: null,
    ...extra,
  },
});

const validText =
  "kb_validate_upsert: payload is valid for kb_upsert preflight checks. No mutation was performed.";

describe("a dry run against a store", () => {
  test("validates for commit, previews the commit goal and reports the warnings", async () => {
    const context = storeContext();
    const input = requirement();
    expect(await run(input, context)).toStrictEqual({
      content: [{ type: "text", text: validText }],
      structuredContent: {
        valid: true,
        errors: [],
        warnings: ["semantic", "coverage", "context"],
        semanticAdvisor: { advisor: "receipt" },
        normalizedPreview: validatedEntity("REQ-dry"),
      },
    });
    expect(commitCalls).toStrictEqual([{ payload: input, options: {} }]);
    expect(scopeCalls).toStrictEqual([[input, context]]);
    expect(renderCalls).toStrictEqual([]);
    expect(previewGoalCalls).toStrictEqual([
      {
        entity: validatedEntity("REQ-dry"),
        relationships: [relationship("REQ-dry", "FACT-1")],
        skipContradictionCheck: false,
      },
    ]);
    expect(goals).toStrictEqual(["preview-goal"]);
    expect(coverageCalls).toStrictEqual([
      [prolog, [relationship("REQ-dry", "FACT-1")], "req", "REQ-dry"],
    ]);
    expect(styleCalls).toStrictEqual([
      { id: "REQ-dry", sourcePath: "src/REQ-dry.md" },
    ]);
    expect(contextCalls).toStrictEqual([
      [
        input,
        validatedEntity("REQ-dry"),
        "/workspace",
        { targetPath: undefined },
      ],
    ]);
    expect(locateCalls).toStrictEqual([]);
  });

  test("passes only a literal true contradiction skip to the commit preview", async () => {
    await run(requirement({ _skipContradictionCheck: true }), storeContext());
    await run(requirement({ _skipContradictionCheck: "yes" }), storeContext());
    expect(
      previewGoalCalls.map((call) => (call as Row).skipContradictionCheck),
    ).toStrictEqual([true, false]);
  });

  test("renders the document the write would update", async () => {
    const context = storeContext({ fs: {} });
    scope = { existing: { id: "REQ-dry", source: "docs/old.md" } };
    const input = requirement();
    const result = await run(input, context);
    expect(result.structuredContent.valid).toBe(true);
    expect(renderCalls).toStrictEqual([
      [input, validatedEntity("REQ-dry"), scope.existing, context],
    ]);
    expect(renderCalls[0]?.[3]).toBe(context);
    expect(contextCalls[0]?.[3]).toStrictEqual({
      targetPath: "docs/rendered.md",
    });
  });

  test("reads the body the subject notes check from the document it would update", async () => {
    const bodyCalls: unknown[][] = [];
    const body = spyOn(contextWarning, "upsertDocumentBody").mockImplementation(
      (...args) => {
        bodyCalls.push(args);
        return "";
      },
    );
    try {
      const context = storeContext({ fs: {} });
      scope = { existing: { id: "REQ-dry", source: "docs/old.md" } };
      await run(requirement(), context);
      expect(bodyCalls.map((call) => call[3])).toStrictEqual([
        { targetPath: "docs/rendered.md" },
      ]);
    } finally {
      body.mockRestore();
    }
  });

  test("refuses what the commit goal would refuse", async () => {
    answers["preview-goal"] = {
      success: false,
      bindings: {},
      error: "store refused",
      errorRecord: { code: "invalid_relationship" },
    } as PrologQueryResult;
    const message = contradictions.upsertFailure("REQ-dry", "store refused", {
      code: "invalid_relationship",
    } as never).message;
    expect(await run(requirement(), storeContext())).toStrictEqual(
      invalid(message, {
        rejection: { code: "INVALID_RELATIONSHIP", issues: [] },
      }),
    );
    expect(coverageCalls).toStrictEqual([]);
  });

  test("warns about an id style only for an entity the store lacks", async () => {
    styleWarnings = ["style"];
    const lookup = "once(kb_entity('REQ-dry', _Type, _Props))";
    answers[lookup] = { success: false, bindings: {} };
    const fresh = await run(requirement(), storeContext());
    expect(fresh.structuredContent.warnings).toStrictEqual([
      "semantic",
      "coverage",
      "style",
      "context",
    ]);
    expect(goals).toStrictEqual(["preview-goal", lookup]);
    answers[lookup] = { success: true, bindings: {} };
    const existing = await run(requirement(), storeContext());
    expect(existing.structuredContent.warnings).toStrictEqual([
      "semantic",
      "coverage",
      "context",
    ]);
  });

  test("names no source path for the id style when the entity has none", async () => {
    commitFailures = {};
    const spy = spyOn(
      upsertModule,
      "validateUpsertForCommit",
    ).mockResolvedValue({
      validated: { entity: { id: "REQ-dry", source: 7 }, relationships: [] },
      relationships: [],
      semantic: { receipt: null, warnings: [] },
    } as never);
    spies.push(spy);
    await run(requirement(), storeContext());
    expect(styleCalls).toStrictEqual([
      { id: "REQ-dry", sourcePath: undefined },
    ]);
  });
});

describe("planned facts", () => {
  const fact = (id: string, extra: Row = {}): Row => ({
    type: "fact",
    id,
    properties: { title: id, status: "active" },
    ...extra,
  });

  test("are refused when the payload is not an array of distinct facts", async () => {
    const refused = async (plannedFacts: unknown, message: string) =>
      expect(
        await run(requirement({ plannedFacts }), storeContext()),
      ).toStrictEqual(
        invalid(message, {
          rejection: { code: "VALIDATION_FAILED", issues: [] },
        }),
      );
    await refused(
      "FACT-1",
      "plannedFacts must be an array of fact upsert payloads",
    );
    await refused(
      [{ type: "req", id: "REQ-x" }],
      "planned fact REQ-x is invalid: plannedFacts stages fact entities only (got type 'req')",
    );
    await refused(
      [fact("FACT-1"), null],
      "planned fact #2 is invalid: plannedFacts stages fact entities only (got type 'undefined')",
    );
    await refused(
      [{ ...fact("REQ-dry") }],
      "planned fact REQ-dry is invalid: it has the same id as the payload",
    );
    commitFailures["FACT-1"] = new Error("no title");
    await refused([fact("FACT-1")], "planned fact FACT-1 is invalid: no title");
    commitFailures["FACT-1"] = "bare refusal";
    await refused(
      [fact("FACT-1")],
      "planned fact FACT-1 is invalid: bare refusal",
    );
  });

  test("are staged in order ahead of the payload", async () => {
    answers["what-if-goal"] = whatIfResult({
      introduced: [
        { requirements: ["REQ-dry"], reason: "noted", status: "resolved" },
      ],
    });
    const linked = relationship("FACT-1", "FACT-0");
    const input = requirement({
      plannedFacts: [
        fact("FACT-1", { relationships: [linked], extra: "dropped" }),
        fact("FACT-2"),
      ],
    });
    const result = await run(input, storeContext());
    expect(commitCalls).toStrictEqual([
      {
        payload: {
          type: "fact",
          id: "FACT-1",
          properties: { title: "FACT-1", status: "active" },
          relationships: [linked],
        },
        options: { staged: { entities: [], relationships: [] } },
      },
      {
        payload: {
          type: "fact",
          id: "FACT-2",
          properties: { title: "FACT-2", status: "active" },
        },
        options: { staged: { entities: ["FACT-1"], relationships: [linked] } },
      },
      {
        payload: input,
        options: {
          staged: { entities: ["FACT-1", "FACT-2"], relationships: [linked] },
        },
      },
    ]);
    expect(whatIfGoalCalls).toStrictEqual([
      [
        {
          entity: validatedEntity("FACT-1"),
          relationships: [linked],
          skipContradictionCheck: true,
        },
        {
          entity: validatedEntity("FACT-2"),
          relationships: [],
          skipContradictionCheck: true,
        },
        {
          entity: validatedEntity("REQ-dry"),
          relationships: [relationship("REQ-dry", "FACT-1")],
          skipContradictionCheck: true,
        },
      ],
    ]);
    expect(previewGoalCalls).toStrictEqual([]);
    const witness = {
      requirements: ["REQ-dry"],
      reason: "noted",
      status: "resolved",
    };
    expect(result).toStrictEqual({
      content: [
        {
          type: "text",
          text: `${validText} 2 planned fact(s) were staged ahead of it (FACT-1, FACT-2); the batch introduces 1 witness(es).`,
        },
      ],
      structuredContent: {
        valid: true,
        errors: [],
        warnings: ["semantic", "coverage", "context"],
        semanticAdvisor: { advisor: "receipt" },
        normalizedPreview: validatedEntity("REQ-dry"),
        stagedFacts: ["FACT-1", "FACT-2"],
        whatIf: { introduced: [witness], removed: [], unchanged: [] },
      },
    });
  });

  test("refuse a batch the store cannot stage or report", async () => {
    answers["what-if-goal"] = {
      success: false,
      bindings: {},
      error: "staging failed",
    };
    const staged = requirement({ plannedFacts: [fact("FACT-1")] });
    expect(await run(staged, storeContext())).toStrictEqual(
      invalid(
        contradictions.upsertFailure("REQ-dry", "staging failed").message,
      ),
    );
    answers["what-if-goal"] = { success: true, bindings: { JsonString: "{" } };
    expect(await run(staged, storeContext())).toStrictEqual(
      invalid(
        "Failed to preview REQ-dry with planned facts: the staged contradiction analysis could not be read",
      ),
    );
  });

  test("refuse a requirement the batch would contradict", async () => {
    answers["what-if-goal"] = whatIfResult({
      introduced: [
        { requirements: ["REQ-dry", "REQ-a", "REQ-b"], reason: "limits" },
        { requirements: ["REQ-dry", "REQ-dry"], reason: "self" },
        { requirements: ["REQ-c"], reason: "infeasible", status: "infeasible" },
        { requirements: ["REQ-d"], reason: "fine", status: "resolved" },
      ],
    });
    expect(
      await run(
        requirement({ plannedFacts: [fact("FACT-1")] }),
        storeContext(),
      ),
    ).toStrictEqual(
      invalid(
        "Contradiction detected for requirement REQ-dry once its planned facts are written:\n  - Conflicts with REQ-a, REQ-b: limits\n  - Conflicts with REQ-dry, REQ-dry: self\n  - Conflicts with REQ-c: infeasible\n\nTo resolve:\n  1. Add a supersedes relationship from the new requirement to the conflicting one, OR\n  2. Deprecate the conflicting requirement before creating the new one. (stage=contradiction_check, plannedFacts staged)",
        { rejection: { code: "SEMANTIC_CONTRADICTION", issues: [] } },
      ),
    );
    const skipped = await run(
      requirement({
        plannedFacts: [fact("FACT-1")],
        _skipContradictionCheck: true,
      }),
      storeContext(),
    );
    expect(skipped.structuredContent.valid).toBe(true);
    const other = await run(
      { ...fact("FACT-9"), plannedFacts: [fact("FACT-1")] },
      storeContext(),
    );
    expect(other.structuredContent.whatIf?.introduced).toHaveLength(4);
  });

  test("need a store", async () => {
    expect(
      await run(
        requirement({ plannedFacts: [fact("FACT-1")] }),
        storelessContext({ fs: {} }),
      ),
    ).toStrictEqual(
      invalid(
        "plannedFacts needs a KB store: the planned facts are staged against the current KB",
      ),
    );
    expect(locateCalls).toStrictEqual([]);
  });
});

describe("a dry run without a store", () => {
  const fact = {
    type: "fact",
    id: "FACT-alone",
    properties: { title: "Alone", status: "active" },
    relationships: [relationship("FACT-alone", "FACT-other")],
  };

  beforeEach(() => {
    spies.push(
      spyOn(
        relationshipsModule,
        "validateRelationshipSources",
      ).mockImplementation((...args) => {
        sourceCalls.push(args);
      }),
      spyOn(upsertModule, "analyzeUpsertSemantics").mockImplementation(
        (payload) => {
          semanticCalls.push(payload);
          return { receipt: null, warnings: ["advice"] };
        },
      ),
    );
  });

  test("runs the store-independent checks and locates the document", async () => {
    const context = storelessContext({ fs: {} });
    const result = await run(fact, context);
    const entity = result.structuredContent.normalizedPreview as Row;
    expect(entity.id).toBe("FACT-alone");
    expect(result).toStrictEqual({
      content: [{ type: "text", text: validText }],
      structuredContent: {
        valid: true,
        errors: [],
        warnings: ["advice", "context"],
        semanticAdvisor: null,
        normalizedPreview: entity,
      },
    });
    expect(sourceCalls).toStrictEqual([["FACT-alone", fact.relationships]]);
    expect(semanticCalls).toStrictEqual([
      { ...fact, relationships: fact.relationships },
    ]);
    expect(locateCalls).toStrictEqual([[context, fact, entity]]);
    expect(contextCalls[0]?.[3]).toStrictEqual({
      targetPath: "docs/located.md",
    });
    expect(scopeCalls).toStrictEqual([]);
    expect(commitCalls).toStrictEqual([]);
    expect(coverageCalls).toStrictEqual([]);
  });

  test("locates no document without a source-first filesystem", async () => {
    await run(fact, storelessContext());
    await run(fact, storelessContext({ fs: {}, sourceFirst: false }));
    await run(fact, storelessContext({ fs: {}, sourceFirst: true }));
    located = () => {
      throw new Error("outside the workspace");
    };
    await run(fact, storelessContext({ fs: {} }));
    expect(locateCalls).toHaveLength(2);
    expect(contextCalls.map((call) => call[3])).toStrictEqual([
      { targetPath: undefined },
      { targetPath: undefined },
      { targetPath: "docs/located.md" },
      { targetPath: undefined },
    ]);
  });
});

describe("failures", () => {
  test("a module that fails to load is a tool failure", async () => {
    for (const code of ["MODULE_NOT_FOUND", "ERR_MODULE_NOT_FOUND"]) {
      const broken = Object.assign(new Error(`cannot load (${code})`), {
        code,
      });
      commitFailures["REQ-dry"] = broken;
      await expect(run(requirement(), storeContext())).rejects.toBe(broken);
    }
  });

  test("anything else thrown is an invalid payload", async () => {
    commitFailures["REQ-dry"] = { code: "MODULE_NOT_FOUND" };
    expect(await run(requirement(), storeContext())).toStrictEqual(
      invalid("[object Object]"),
    );
    commitFailures["REQ-dry"] = Object.assign(new Error("other"), {
      code: "EACCES",
    });
    expect(await run(requirement(), storeContext())).toStrictEqual(
      invalid("other"),
    );
    commitFailures["REQ-dry"] = new InputError("BAD_INPUT", "bad input");
    expect(await run(requirement(), storeContext())).toStrictEqual(
      invalid("bad input", { errorCode: "BAD_INPUT" }),
    );
    commitFailures["REQ-dry"] = new KbRejection("VALIDATION_FAILED", "nope", [
      { rule: "r", field: "f" } as never,
    ]);
    expect(await run(requirement(), storeContext())).toStrictEqual(
      invalid("nope", {
        rejection: {
          code: "VALIDATION_FAILED",
          issues: [{ rule: "r", field: "f" }],
        },
      }),
    );
  });
});
