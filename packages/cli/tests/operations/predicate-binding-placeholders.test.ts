// implements REQ-model-predicates-binding-placeholders
import { describe, expect, test } from "bun:test";
import {
  buildBindingHints,
  describeBindingHints,
} from "../../src/operations/modeling/predicate-binding-hints.js";
import {
  classifyBinding,
  nameOrStopWordReason,
} from "../../src/operations/modeling/predicate-bindings.js";
import type { PredicateSuggestion } from "../../src/operations/modeling/predicate-types.js";
import { handleKbSuggestPredicates } from "../../src/operations/modeling/suggest-predicates.js";

const TEMPORAL = {
  argumentNames: ["subject", "before_event", "after_event"],
} as const;

describe("argument bindings that only repeat a name or a stop word stay unbound", () => {
  test("a value equal to its own argument name is a placeholder, after snake-case normalization", () => {
    for (const value of ["before_event", "Before Event", "before-event"])
      expect(
        classifyBinding(
          value,
          "Invoices stay visible after a reload.",
          true,
          false,
          {
            ...TEMPORAL,
            argumentName: "before_event",
          },
        ),
      ).toBe("placeholder");
  });

  test("a value equal to another argument name is a placeholder", () => {
    expect(
      classifyBinding(
        "after_event",
        "Invoices stay visible after a reload.",
        true,
        false,
        {
          ...TEMPORAL,
          argumentName: "before_event",
        },
      ),
    ).toBe("placeholder");
  });

  test("trivial verbs and stop words are placeholders", () => {
    for (const value of ["be", "is", "are", "do", "have", "the", "a", "an"])
      expect(
        classifyBinding(
          value,
          "Reports must be exported nightly.",
          true,
          false,
          {
            argumentName: "action",
            argumentNames: ["subject", "action", "target"],
          },
        ),
      ).toBe("placeholder");
    expect(nameOrStopWordReason("be", { argumentName: "action" })).toContain(
      "stop word",
    );
  });

  test("true, false and declared constants stay valid explicit bindings", () => {
    expect(classifyBinding("true", "Exports are enabled.", true)).toBe(
      "explicit",
    );
    expect(classifyBinding("false", "Exports are disabled.", true)).toBe(
      "explicit",
    );
    // A closed vocabulary may declare a constant that looks like a name or a
    // stop word; the schema's own constant is never rejected.
    expect(
      classifyBinding("none", "Retries use no backoff.", true, false, {
        argumentName: "backoff",
        argumentNames: ["subject", "backoff"],
        constants: ["none", "linear", "exponential"],
      }),
    ).toBe("explicit");
    expect(
      classifyBinding("backoff", "Retries use a backoff.", true, false, {
        argumentName: "mode",
        argumentNames: ["subject", "backoff", "mode"],
        constants: ["backoff", "immediate"],
      }),
    ).toBe("explicit");
  });

  test("a value equal to an argument name is real when the claim itself names it", () => {
    expect(
      classifyBinding(
        "launcher",
        "The launcher must exit with the child code.",
        true,
        false,
        {
          argumentName: "launcher",
          argumentNames: ["launcher", "exit_policy"],
        },
      ),
    ).toBe("explicit");
  });

  test("a schema-named binding no longer completes a predicate plan", async () => {
    const result = await handleKbSuggestPredicates(null, {
      text: "Saved invoices should remain visible after a reload.",
      schemaId: "FACT-SCHEMA-TEMPORAL-ORDER",
      includeExistingSchemas: false,
      argumentBindings: {
        subject: "billing.saved_invoices",
        before_event: "before_event",
        after_event: "after_event",
      },
    });
    const data = result.structuredContent;
    expect(data.recommendedAction).toBe("provide_argument_bindings");
    expect(data.applyPlan).toEqual([]);
    expect(data.candidates[0]?.binding_status).toBe("incomplete");
    expect(data.candidates[0]?.unbound_arguments).toEqual([
      "before_event",
      "after_event",
    ]);
    expect(data.bindingHints).toEqual([
      {
        argument: "before_event",
        position: 1,
        type: "event",
        examples: ["saved"],
        currentValue: "before_event",
        provenance: "placeholder",
        reason: expect.stringContaining(
          "repeats the argument name before_event",
        ),
      },
      {
        argument: "after_event",
        position: 2,
        type: "event",
        examples: ["navigation_completes"],
        currentValue: "after_event",
        provenance: "placeholder",
        reason: expect.stringContaining(
          "repeats the argument name after_event",
        ),
      },
    ]);
    expect(result.content[0]?.text).toContain(
      "before_event (event, e.g. saved)",
    );
  });

  test("reviewed values from the claim text complete the same plan", async () => {
    const result = await handleKbSuggestPredicates(null, {
      text: "Saved invoices should remain visible after a reload.",
      schemaId: "FACT-SCHEMA-TEMPORAL-ORDER",
      includeExistingSchemas: false,
      argumentBindings: {
        subject: "billing.saved_invoices",
        before_event: "reload",
        after_event: "remain_visible",
      },
    });
    const data = result.structuredContent;
    expect(data.recommendedAction).toBe("apply_requires_predicate");
    expect(data.bindingHints).toEqual([]);
    expect(data.applyPlan[0]?.properties).toMatchObject({
      predicate_args: ["billing.saved_invoices", "reload", "remain_visible"],
    });
  });
});

describe("binding hints for unbound arguments", () => {
  const suggestion = {
    predicate_args: ["billing.export", "unknown", "be"],
    unbound_arguments: ["format", "action"],
    binding_provenance_by_argument: {
      subject: "explicit",
      format: "placeholder",
      action: "placeholder",
    },
    schema: {
      argument_names: ["subject", "format", "action"],
      argument_types: ["entity", "file_format", "action"],
      argument_descriptions: [
        "What is exported.",
        "Exported file format.",
        "What happens to the export.",
      ],
      argument_constants: { format: ["csv", "json"] },
      examples: [
        "export_policy(reports, csv, archive)",
        "export_policy(invoices, json, send(email))",
      ],
    },
  } as unknown as PredicateSuggestion;

  test("list type, declared constants, schema examples and the rejection reason", () => {
    const hints = buildBindingHints(suggestion, "Exports must be produced.");
    expect(hints).toEqual([
      {
        argument: "format",
        position: 1,
        type: "file_format",
        description: "Exported file format.",
        allowedValues: ["csv", "json"],
        examples: ["csv", "json"],
        currentValue: "unknown",
        provenance: "placeholder",
        reason: "The claim text names no value for this argument.",
      },
      {
        argument: "action",
        position: 2,
        type: "action",
        description: "What happens to the export.",
        examples: ["archive", "send(email)"],
        currentValue: "be",
        provenance: "placeholder",
        reason: 'The value "be" is not a binding: "be" is a stop word.',
      },
    ]);
    expect(describeBindingHints(hints)).toBe(
      "format (file_format, one of csv, json); action (action, e.g. archive, send(email))",
    );
  });
});
