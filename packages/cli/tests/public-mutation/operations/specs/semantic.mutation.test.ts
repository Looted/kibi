import { afterEach, describe, expect, spyOn, test } from "bun:test";
import type { OntologyPackV1, SemanticClassifierV1 } from "kibi-plugin-sdk";
import { InputError } from "../../../../src/cli-errors.js";
import * as orchestration from "../../../../src/operations/semantic-advisor/plugin-orchestration.js";
import type { CapabilityRegistry } from "../../../../src/plugins/registry.js";
import { toPrologString } from "../../../../src/prolog/codec.js";
import type {
  OperationContext,
  PrologPort,
  PrologQueryResult,
} from "../../../../src/public/operations/runtime-types.js";
import {
  executeSemanticAdvisor,
  semanticAdvisorSpec,
} from "../../../../src/public/operations/specs/semantic.js";
import { expectGolden } from "../../helpers/golden.js";

const TEXT = "Users must export at most 5 reports per minute.";

const spies: { mockRestore: () => void }[] = [];
afterEach(() => {
  for (const spy of spies.splice(0)) spy.mockRestore();
});

const baseContext = (extra: Partial<OperationContext> = {}): OperationContext =>
  ({
    workspaceRoot: "/tmp/semantic-advisor",
    signal: new AbortController().signal,
    clock: () => new Date(0),
    ...extra,
  }) as OperationContext;

const run = (input: Record<string, unknown>, context = baseContext()) =>
  semanticAdvisorSpec.execute(input, context);

describe("input", () => {
  test("rejects missing or blank text", async () => {
    for (const text of [undefined, 3, "", "   "]) {
      const failure = await run({ text }).then(
        () => null,
        (error: unknown) => error,
      );
      expect(failure).toBeInstanceOf(InputError);
      expect((failure as InputError).code).toBe("VALIDATION_FAILED");
      expect((failure as Error).message).toBe(
        "Semantic advisor failed: text must be a non-empty string",
      );
    }
  });

  test("trims every field and defaults the rest", async () => {
    const defaults = await run({ text: `  ${TEXT}  ` });
    expectGolden("semantic-advisor-defaults", defaults);
    const named = await run({
      text: TEXT,
      type: " req ",
      id: " REQ-export ",
      title: " Export limit ",
      source: " docs/export.md ",
      status: " active ",
    });
    expectGolden("semantic-advisor-named", named);
    const blank = await run({
      text: TEXT,
      type: " ",
      id: "",
      title: 4,
      source: "  ",
      status: "",
    });
    expect(blank).toEqual(defaults);
    const fact = await run({ text: TEXT, type: "fact", id: "FACT-x" });
    expectGolden("semantic-advisor-fact", fact);
    const dot = await run({ text: "." });
    expect(
      dot.structuredContent.receipt.suggestions.map(
        (suggestion) => (suggestion as { title?: unknown }).title,
      ),
    ).toEqual(dot.structuredContent.receipt.suggestions.map(() => undefined));
    expectGolden("semantic-advisor-dot", dot.content);
    const two = await run({
      text: `${TEXT} Checkout requires payment authorization before submission.`,
    });
    expect(two.structuredContent.receipt.suggestions.length).toBeGreaterThan(1);
    expectGolden("semantic-advisor-two", two.content);
  });

  test("keeps only string clauses and object interpretations", async () => {
    const text =
      "Pressing Escape cancels the upload. Opening a report keeps its filters.";
    const clauses = await run({
      text,
      clauses: ["Pressing Escape cancels the upload.", 3, null],
    });
    const only = await run({
      text,
      clauses: ["Pressing Escape cancels the upload."],
    });
    expect(clauses).toEqual(only);
    expect(clauses).not.toEqual(await run({ text }));
    const empty = await run({ text, clauses: "not a list" });
    expect(empty).toEqual(await run({ text }));
    const interpretation = {
      claim_key: "x",
      claim_text: "Pressing Escape cancels the upload",
      ir: { op: "atom" },
    };
    const mixed = await run({
      text,
      interpretations: [interpretation, null, "x", 2],
    });
    const single = await run({ text, interpretations: [interpretation] });
    expect(mixed).toEqual(single);
    expect(single).not.toEqual(await run({ text }));
    expect(await run({ text, interpretations: {} })).toEqual(
      await run({ text }),
    );
  });
});

describe("stored ledger", () => {
  const id = "REQ-export-csv";
  const storedText = "Users must be able to export reports as CSV.";
  const ledger = {
    semantic_text: storedText,
    semantic_inventory_version: "kibi.semantic-inventory.v1",
    semantic_inventory: [
      {
        claim_key: "stored-key",
        claim_text: "stored clause",
        role: "normative",
        status: "modeled",
      },
    ],
  };
  const props = Object.entries(ledger)
    .map(
      ([key, value]) =>
        `${key}=${typeof value === "string" ? toPrologString(value) : toPrologString(JSON.stringify(value))}`,
    )
    .join(",");
  const store = () => {
    const goals: string[] = [];
    const prolog = {
      query: async (goal: string): Promise<PrologQueryResult> => {
        goals.push(goal);
        if (goal.includes(`kb_entity('${id}', 'req', Props)`))
          return {
            success: true,
            bindings: { Results: `[['${id}',req,[${props}]]]` },
          };
        return { success: true, bindings: { Rows: "[]" } };
      },
    } as unknown as PrologPort;
    return { goals, prolog };
  };
  const drift = (result: Awaited<ReturnType<typeof run>>) =>
    result.structuredContent.warnings.filter((warning) =>
      warning.startsWith("Claim-key drift"),
    );

  test("warns through either engine source", async () => {
    const direct = store();
    const viaPort = await run(
      { text: TEXT, id },
      baseContext({ prolog: direct.prolog }),
    );
    expect(drift(viaPort)).toHaveLength(1);
    expect(viaPort.content[0]?.text).toEndWith(` ${drift(viaPort)[0]}`);
    const lazy = store();
    const viaEnsure = await run(
      { text: TEXT, id },
      baseContext({ ensureProlog: async () => lazy.prolog }),
    );
    expect(viaEnsure).toEqual(viaPort);
    expectGolden("semantic-advisor-drift", viaPort);
  });

  test("consults the store only for a named requirement", async () => {
    const quiet = store();
    const context = baseContext({ prolog: quiet.prolog });
    for (const input of [
      { text: TEXT },
      { text: TEXT, id, type: "scenario" },
    ]) {
      expect(drift(await run(input, context))).toEqual([]);
    }
    expect(quiet.goals).toEqual([]);
    expect(
      drift(await run({ text: TEXT, id, type: " req " }, context)),
    ).toHaveLength(1);
  });

  test("reads no store it cannot open", async () => {
    const plain = await executeSemanticAdvisor({ text: TEXT, id });
    expect(drift(plain)).toEqual([]);
    expect(
      await executeSemanticAdvisor({ text: TEXT, id }, baseContext()),
    ).toEqual(plain);
    expect(
      await executeSemanticAdvisor(
        { text: TEXT, id },
        baseContext({ ensureProlog: async () => undefined as never }),
      ),
    ).toEqual(plain);
    expect(
      await executeSemanticAdvisor(
        { text: TEXT, id },
        baseContext({
          ensureProlog: async () => {
            throw new Error("no store");
          },
        }),
      ),
    ).toEqual(plain);
    const silent = {
      query: async () => ({ success: true, bindings: {} }),
    } as unknown as PrologPort;
    expect(
      await executeSemanticAdvisor(
        { text: TEXT, id },
        baseContext({ prolog: silent }),
      ),
    ).toEqual(plain);
  });
});

describe("capability plugins", () => {
  const stamp = (pluginId: string, mode: string) => ({
    pluginId,
    pluginVersion: "1",
    capability: `cap-${pluginId}`,
    mode,
    external: mode !== "builtin",
    network: false,
    metered: false,
  });
  function binding<T>(pluginId: string, mode: string, capability: T) {
    return {
      pluginId,
      pluginVersion: "1",
      packageName: mode === "builtin" ? null : `${pluginId}-pkg`,
      mode,
      permissions: { network: false, metered: false, secrets: [] },
      external: mode !== "builtin",
      capability,
      stamp: stamp(pluginId, mode === "builtin" ? "augment" : mode),
    };
  }
  const pack = (
    id: string,
    match: OntologyPackV1["match"] = () => [],
  ): OntologyPackV1 => ({
    id,
    schemas: () => [
      {
        schemaId: `${id}.holds`,
        predicateName: "holds",
        argumentNames: ["subject"],
        argumentTypes: ["entity"],
      },
    ],
    match,
  });
  const quiet: SemanticClassifierV1 = {
    id: "quiet",
    classify: () => ({ decisions: [] }),
  };
  const deciding = {
    id: "deciding",
    classify: (input: {
      readonly propositions: readonly { readonly claimKey: string }[];
    }) => ({
      decisions: input.propositions.map((proposition) => ({
        claimKey: proposition.claimKey,
        lane: "predicate",
        confidence: 0.75,
      })),
    }),
  } as unknown as SemanticClassifierV1;
  const registry = (
    options: {
      plugins?: number;
      shadowClassifier?: SemanticClassifierV1;
      shadowPack?: OntologyPackV1;
      replacePack?: OntologyPackV1;
    } = {},
  ) =>
    ({
      getProjectConfig: async () => ({
        plugins: Array.from({ length: options.plugins ?? 1 }, () => ({
          package: "p",
        })),
      }),
      resolveSemanticClassifiers: async () => ({
        builtin: binding("builtin", "builtin", quiet),
        replace: null,
        augment: [],
        shadow: options.shadowClassifier
          ? [binding("shadowc", "shadow", options.shadowClassifier)]
          : [],
      }),
      resolveOntologyPacks: async () => ({
        builtin: binding("builtin", "builtin", pack("builtin")),
        replace: options.replacePack
          ? binding("replacer", "replace", options.replacePack)
          : null,
        augment: [],
        shadow: options.shadowPack
          ? [binding("shadowp", "shadow", options.shadowPack)]
          : [],
      }),
    }) as unknown as CapabilityRegistry;
  const withPlugins = (
    options: Parameters<typeof registry>[0],
    text = "Checkout requires payment authorization before submission.",
  ) =>
    run(
      { text },
      baseContext({ ensurePlugins: async () => registry(options) }),
    );
  const plugins = (result: Awaited<ReturnType<typeof run>>) =>
    (result.structuredContent as { capabilityPlugins?: unknown })
      .capabilityPlugins;

  test("reports nothing without a configured plugin", async () => {
    const none = await withPlugins({ plugins: 0 });
    expect(plugins(none)).toBeUndefined();
    expect(
      none.structuredContent.warnings.some((warning) =>
        warning.startsWith("Capability plugins consulted"),
      ),
    ).toBe(false);
    expect(Object.keys(none.structuredContent)).toEqual([
      "receipt",
      "warnings",
    ]);
  });

  test("names the consulted plugins and their findings", async () => {
    expectGolden("semantic-advisor-plugins", {
      builtin: (await withPlugins({})).structuredContent,
      shadowClassifier: plugins(
        await withPlugins({ shadowClassifier: deciding }),
      ),
      shadowPack: plugins(
        await withPlugins({
          shadowPack: pack("shadowp", () => [
            {
              schemaId: "shadowp.holds",
              predicateName: "holds",
              polarity: "assert",
              arguments: ["checkout"],
              confidence: 0.5,
              evidence: "Checkout",
            },
          ]),
        }),
      ),
      replaced: plugins(await withPlugins({ replacePack: pack("replacer") })),
    });
  });

  test("reports shadow findings even without stamps", async () => {
    const real = orchestration.analyzeSemanticAdvisorInputWithPlugins;
    const shadowStamp = stamp("shadowc", "shadow");
    const outcome = (
      classification: unknown,
      ontologyShadowMatches: readonly unknown[],
    ) => {
      const spy = spyOn(
        orchestration,
        "analyzeSemanticAdvisorInputWithPlugins",
      ).mockImplementation(async (...args: Parameters<typeof real>) => {
        const result = await real(...args);
        return {
          ...result,
          classification,
          ontologyShadowMatches,
        } as unknown as Awaited<ReturnType<typeof real>>;
      });
      spies.push(spy);
      return run({ text: TEXT }).then((result) => {
        spy.mockRestore();
        return plugins(result);
      });
    };
    const comparisons = {
      fallbackUsed: false,
      decisions: [],
      shadowComparisons: [{ stamp: shadowStamp, decisions: [] }],
    };
    const match = {
      packId: "p",
      schemaId: "p.holds",
      predicateName: "holds",
      confidence: 0.5,
    };
    expectGolden("semantic-advisor-shadow-only", {
      comparisons: await outcome(comparisons, []),
      matches: await outcome(null, [match]),
      none: await outcome(
        { fallbackUsed: false, decisions: [], shadowComparisons: [] },
        [],
      ),
    });
  });
});
