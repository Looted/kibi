import { describe, expect, test } from "bun:test";
import type { OperationContext } from "../../../../src/public/operations/runtime-types.js";
import {
  MODEL_ROUTES,
  SKILL_ROUTES,
  dispatchComposite,
  foreignParameterWarnings,
  modelSpec,
  skillsSpec,
} from "../../../../src/public/operations/specs/composite.js";
import { modelRequirementSpec } from "../../../../src/public/operations/specs/modeling.js";
import { semanticAdvisorSpec } from "../../../../src/public/operations/specs/semantic.js";
import {
  skillsListSpec,
  skillsLoadSpec,
  skillsReadSpec,
} from "../../../../src/public/operations/specs/skills.js";

const context = {} as OperationContext;

type Route = Parameters<typeof dispatchComposite>[1][string];

function route(
  properties: unknown,
  execute: (input: unknown) => unknown = () => ({}),
  extra: Record<string, unknown> = {},
): Route {
  return {
    businessInputSchema: { type: "object", properties, ...extra },
    execute: async (input: never) => execute(input),
  } as unknown as Route;
}

const ROUTES = {
  one: { ...route({ a: {}, shared: {} }), name: "kb_one" },
  two: route({ b: {}, shared: {} }),
  three: route({ b: {}, c: {} }),
};

describe("foreignParameterWarnings", () => {
  test("returns nothing for an unknown choice", () => {
    expect(
      foreignParameterWarnings("action", "nope", ROUTES, { b: 1 }),
    ).toStrictEqual([]);
  });

  test("names every other route owning an ignored parameter", () => {
    expect(
      foreignParameterWarnings("action", "one", ROUTES, {
        a: 1,
        shared: 2,
        b: 3,
        c: undefined,
        unknown: 4,
      }),
    ).toStrictEqual([
      {
        parameter: "b",
        message:
          "b is a action: two / action: three argument; action: one ignored it.",
        nextAction:
          "Drop b, or switch to action: two / action: three if that is what you meant.",
      },
    ]);
  });

  test("points to the equivalent parameter of the chosen model route", () => {
    expect(
      foreignParameterWarnings("mode", "requirement", MODEL_ROUTES, {
        subjectHint: "x",
      }),
    ).toStrictEqual([
      {
        parameter: "subjectHint",
        message:
          "subjectHint is a mode: predicates argument; mode: requirement ignored it.",
        nextAction: "Use subjectKey in mode: requirement.",
      },
    ]);
    expect(
      foreignParameterWarnings("mode", "predicates", MODEL_ROUTES, {
        subjectKey: "x",
      }).map((warning) => warning.nextAction),
    ).toStrictEqual(["Use subjectHint in mode: predicates."]);
  });

  test("ignores equivalents of an unnamed route or another route's name", () => {
    const routes = {
      plain: route({}),
      named: { ...route({}), name: "kb_other" },
      owner: route({ subjectHint: {} }),
    };
    for (const choice of ["plain", "named"])
      expect(
        foreignParameterWarnings("mode", choice, routes, {
          subjectHint: 1,
        }).map((warning) => warning.nextAction),
      ).toStrictEqual([
        "Drop subjectHint, or switch to mode: owner if that is what you meant.",
      ]);
  });

  test("treats schemas without object properties as owning nothing", () => {
    const routes = {
      none: route(undefined),
      text: route("b"),
      nil: route(null),
      owner: route({ b: {} }),
    };
    for (const choice of ["none", "text", "nil"])
      expect(
        foreignParameterWarnings("action", choice, routes, { b: 1 }).map(
          (warning) => warning.message,
        ),
      ).toStrictEqual([
        `b is a action: owner argument; action: ${choice} ignored it.`,
      ]);
  });
});

describe("dispatchComposite", () => {
  test("rejects a missing or unknown selector", async () => {
    for (const input of [{}, { action: 1 }, { action: "nope" }])
      await expect(
        dispatchComposite("action", ROUTES, input, context),
      ).rejects.toThrow(/^action must be one of: one, two, three$/);
  });

  test("requires the chosen route's required fields", async () => {
    const routes = {
      go: route({ id: {} }, () => ({}), { required: ["id"] }),
      loose: route({}, () => ({}), { required: "id" }),
    };
    await expect(
      dispatchComposite("mode", routes, { mode: "go" }, context),
    ).rejects.toThrow(/^id is required when mode is go$/);
    expect(
      await dispatchComposite("mode", routes, { mode: "go", id: 0 }, context),
    ).toStrictEqual({
      content: [{ type: "text", text: "mode go completed" }],
      structuredContent: { mode: "go" },
    });
    expect(
      (await dispatchComposite("mode", routes, { mode: "loose" }, context))
        .structuredContent,
    ).toStrictEqual({ mode: "loose" });
  });

  test("passes the input without the selector and returns the routed result", async () => {
    let seen: unknown;
    const routes = {
      go: route({ x: {} }, (input) => {
        seen = input;
        return {
          content: [{ type: "text", text: "done" }],
          structuredContent: { value: 1 },
        };
      }),
    };
    expect(
      await dispatchComposite(
        "action",
        routes,
        { action: "go", x: 2 },
        context,
      ),
    ).toStrictEqual({
      content: [{ type: "text", text: "done" }],
      structuredContent: { action: "go", value: 1 },
    });
    expect(seen).toStrictEqual({ x: 2 });
  });

  test.each([
    ["a bare payload", { value: 1 }, "action go completed", { value: 1 }],
    ["an array", [1], "action go completed", {}],
    ["null", null, "action go completed", {}],
    ["a string", "x", "action go completed", {}],
    ["content only", { content: "text" }, "action go completed", {}],
    [
      "a non-record payload",
      { content: [{ type: "text", text: "own" }], structuredContent: [1] },
      "own",
      {},
    ],
    [
      "a wrapped empty payload",
      { structuredContent: { value: 2 } },
      "action go completed",
      { value: 2 },
    ],
  ])("handles %s", async (_label, result, text, payload) => {
    const routes = { go: route({}, () => result) };
    expect(
      await dispatchComposite("action", routes, { action: "go" }, context),
    ).toStrictEqual({
      content: [{ type: "text", text }],
      structuredContent: { action: "go", ...payload },
    });
  });

  test("reports ignored parameters in text and in a string warnings list", async () => {
    const routes = {
      go: route({}, () => ({ structuredContent: { warnings: ["w"] } })),
      bare: route({}, () => ({ value: 1, warnings: "w" })),
      other: route({ p: {}, q: {} }),
    };
    const message =
      "p is a action: other argument; action: go ignored it. Drop p, or switch to action: other if that is what you meant.";
    const QMESSAGE =
      "q is a action: other argument; action: go ignored it. Drop q, or switch to action: other if that is what you meant.";
    expect(
      await dispatchComposite(
        "action",
        routes,
        { action: "go", p: 1, q: 2 },
        context,
      ),
    ).toStrictEqual({
      content: [
        { type: "text", text: "action go completed" },
        {
          type: "text",
          text: `${message}\n${QMESSAGE}`,
        },
      ],
      structuredContent: {
        action: "go",
        warnings: ["w", message, QMESSAGE],
      },
    });
    expect(
      await dispatchComposite(
        "action",
        routes,
        { action: "bare", p: 1 },
        context,
      ),
    ).toStrictEqual({
      content: [
        { type: "text", text: "action bare completed" },
        {
          type: "text",
          text: "p is a action: other argument; action: bare ignored it. Drop p, or switch to action: other if that is what you meant.",
        },
      ],
      structuredContent: { action: "bare", value: 1, warnings: "w" },
    });
  });

  test("adds record warnings for kb_model_requirement only", async () => {
    const make = (name: string) => ({
      go: {
        ...route({}, () => ({ warnings: [] })),
        name,
      },
      other: route({ p: {} }),
    });
    const text = "p is a action: other argument; action: go ignored it.";
    const next =
      "Drop p, or switch to action: other if that is what you meant.";
    expect(
      (
        await dispatchComposite(
          "action",
          make("kb_model_requirement"),
          { action: "go", p: 1 },
          context,
        )
      ).structuredContent?.warnings,
    ).toStrictEqual([
      { kind: "parameter_ignored", message: text, nextAction: next },
    ]);
    expect(
      (
        await dispatchComposite(
          "action",
          make("kb_model"),
          { action: "go", p: 1 },
          context,
        )
      ).structuredContent?.warnings,
    ).toStrictEqual([`${text} ${next}`]);
    expect(
      (
        await dispatchComposite(
          "action",
          { go: route({}, () => ({ warnings: [] })), other: route({ p: {} }) },
          { action: "go", p: 1 },
          context,
        )
      ).structuredContent?.warnings,
    ).toStrictEqual([`${text} ${next}`]);
  });
});

describe("composite specs", () => {
  test("route tables and merged schemas", () => {
    expect(SKILL_ROUTES).toStrictEqual({
      list: skillsListSpec,
      load: skillsLoadSpec,
      read: skillsReadSpec,
    });
    expect(MODEL_ROUTES.analyze).toBe(semanticAdvisorSpec);
    expect(MODEL_ROUTES.requirement).toBe(modelRequirementSpec);
    expect(
      Object.keys(skillsSpec.businessInputSchema.properties),
    ).toStrictEqual([
      "action",
      ...Object.keys(skillsReadSpec.businessInputSchema.properties),
    ]);
    expect(Object.keys(modelSpec.businessInputSchema.properties)[0]).toBe(
      "mode",
    );
  });

  test("execute dispatches by action and mode", async () => {
    await expect(
      skillsSpec.execute({ action: "x" } as never, context),
    ).rejects.toThrow(/^action must be one of: list, load, read$/);
    await expect(
      modelSpec.execute({ mode: "x" } as never, context),
    ).rejects.toThrow(
      /^mode must be one of: analyze, requirement, predicates$/,
    );
  });
});
