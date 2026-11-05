// executable_for TEST-capability-plugin-host-resolution-v1
import { describe, expect, test } from "bun:test";
import type {
  OntologyMatchCandidate,
  OntologyPackV1,
  PluginProviderStamp,
  PredicateSchemaDefinition,
} from "kibi-plugin-sdk";
import {
  composeOntologyCatalog,
  composeOntologyMatches,
} from "../../src/plugins/compose-ontology-packs.js";
import type {
  CapabilityModeResolution,
  CapabilityProviderBinding,
} from "../../src/plugins/registry.js";

type Binding = CapabilityProviderBinding<OntologyPackV1>;

function schema(
  schemaId: string,
  predicateName = "holds",
  argumentNames = ["subject"],
): PredicateSchemaDefinition {
  return {
    schemaId,
    predicateName,
    argumentNames,
    argumentTypes: argumentNames.map(() => "entity"),
  };
}

function candidate(
  schemaId: string,
  args: string[] = ["x"],
  polarity: "assert" | "deny" = "assert",
  predicateName = "holds",
): OntologyMatchCandidate {
  return {
    schemaId,
    predicateName,
    arguments: args,
    polarity,
    confidence: 0.5,
    evidence: "seen",
  };
}

function stamp(pluginId: string): PluginProviderStamp {
  return {
    pluginId,
    pluginVersion: "1",
    capability: "kibi.ontology-pack.v1",
    mode: "augment",
    external: false,
    network: false,
    metered: false,
  } as PluginProviderStamp;
}

function binding(
  pluginId: string,
  pack: Partial<OntologyPackV1> & { schemas: OntologyPackV1["schemas"] },
): Binding {
  return {
    pluginId,
    pluginVersion: "1",
    packageName: null,
    mode: "augment",
    permissions: { network: false, metered: false, secrets: [] },
    external: false,
    capability: {
      id: `${pluginId}-pack`,
      match: () => [],
      ...pack,
    } as OntologyPackV1,
    stamp: stamp(pluginId),
  };
}

function resolution(
  parts: Partial<CapabilityModeResolution<OntologyPackV1>> & {
    builtin: Binding;
  },
): CapabilityModeResolution<OntologyPackV1> {
  return { replace: null, augment: [], shadow: [], ...parts };
}

const CONTEXT = { claimKey: "claim-1", statement: "anything" };

function stamped(
  pack: Binding,
  value: OntologyMatchCandidate,
  claimKey = "claim-1",
) {
  return {
    ...value,
    claimKey,
    packId: pack.capability.id,
    stamp: pack.stamp,
  };
}

describe("composeOntologyCatalog", () => {
  test("merges builtin and augment schemas and stamps shadow packs only", () => {
    const builtin = binding("builtin", { schemas: () => [schema("b.one")] });
    const augment = binding("aug", {
      schemas: () => [schema("a.one"), schema("a.two", "other")],
    });
    const shadow = binding("shadow", { schemas: () => [schema("s.one")] });
    const catalog = composeOntologyCatalog(
      resolution({ builtin, augment: [augment], shadow: [shadow] }),
    );
    expect(catalog).toStrictEqual({
      schemas: [schema("b.one"), schema("a.one"), schema("a.two", "other")],
      stamps: [builtin.stamp, augment.stamp, shadow.stamp],
      ownership: new Map([
        ["builtin-pack", new Set(["b.one"])],
        ["aug-pack", new Set(["a.one", "a.two"])],
      ]),
      replaced: false,
      diagnostics: [],
    });
  });

  test("keeps the first definition of a schema id shared with the same predicate", () => {
    const builtin = binding("builtin", {
      schemas: () => [schema("shared", "holds", ["a"])],
    });
    const augment = binding("aug", {
      schemas: () => [schema("shared", "holds", ["b"])],
    });
    const catalog = composeOntologyCatalog(
      resolution({ builtin, augment: [augment] }),
    );
    expect(catalog.schemas).toStrictEqual([schema("shared", "holds", ["a"])]);
    expect(catalog.ownership).toStrictEqual(
      new Map([
        ["builtin-pack", new Set(["shared"])],
        ["aug-pack", new Set(["shared"])],
      ]),
    );
  });

  test("rejects a schema id that collides across packs", () => {
    const builtin = binding("builtin", { schemas: () => [schema("shared")] });
    const augment = binding("aug", {
      schemas: () => [schema("shared", "other")],
    });
    let error: unknown;
    try {
      composeOntologyCatalog(resolution({ builtin, augment: [augment] }));
    } catch (caught) {
      error = caught;
    }
    expect(error).toMatchObject({
      name: "PluginResolutionError",
      code: "ONTOLOGY_SCHEMA_COLLISION",
      message: "Ontology schema id 'shared' collides across packs",
    });
  });

  test("a successful replace pack supplies the whole catalog", () => {
    const builtin = binding("builtin", { schemas: () => [schema("b.one")] });
    const replace = binding("rep", { schemas: () => [schema("r.one")] });
    const augment = binding("aug", { schemas: () => [schema("a.one")] });
    expect(
      composeOntologyCatalog(
        resolution({ builtin, replace, augment: [augment] }),
      ),
    ).toStrictEqual({
      schemas: [schema("r.one")],
      stamps: [replace.stamp],
      ownership: new Map([["rep-pack", new Set(["r.one"])]]),
      replaced: true,
      diagnostics: [],
    });
  });

  test("falls back to builtin when the replace catalog cannot be built", () => {
    const builtin = binding("builtin", { schemas: () => [schema("b.one")] });
    const failing = (thrown: unknown) =>
      binding("rep", {
        schemas: () => {
          throw thrown;
        },
      });
    expect(
      composeOntologyCatalog(
        resolution({ builtin, replace: failing(new Error("boom")) }),
      ),
    ).toStrictEqual({
      schemas: [schema("b.one")],
      stamps: [builtin.stamp],
      ownership: new Map([["builtin-pack", new Set(["b.one"])]]),
      replaced: false,
      diagnostics: [
        "replace ontology pack 'rep' failed catalog construction (boom); falling back to builtin",
      ],
    });
    expect(
      composeOntologyCatalog(resolution({ builtin, replace: failing("raw") }))
        .diagnostics,
    ).toStrictEqual([
      "replace ontology pack 'rep' failed catalog construction (raw); falling back to builtin",
    ]);
  });
});

describe("composeOntologyMatches without a replace pack", () => {
  test("stamps, deduplicates and sorts builtin and augment candidates", () => {
    const builtin = binding("z-builtin", {
      schemas: () => [schema("s.b", "holds", ["a", "b"]), schema("s.a")],
      match: () => [
        candidate("s.b", ["ab", "c"]),
        candidate("s.b", ["a", "bc"]),
        candidate("s.b", ["ab", "c"]),
        candidate("s.a", ["y"], "deny"),
        candidate("s.a", ["y"], "assert"),
        candidate("s.a", ["x"], "deny"),
      ],
    });
    const augment = binding("a-aug", {
      schemas: () => [schema("t.a")],
      match: () => [candidate("t.a")],
    });
    const matched = composeOntologyMatches(
      resolution({ builtin, augment: [augment] }),
      CONTEXT,
    );
    expect(matched).toStrictEqual({
      canonical: [
        stamped(augment, candidate("t.a")),
        stamped(builtin, candidate("s.a", ["y"], "assert")),
        stamped(builtin, candidate("s.a", ["x"], "deny")),
        stamped(builtin, candidate("s.a", ["y"], "deny")),
        stamped(builtin, candidate("s.b", ["a", "bc"])),
        stamped(builtin, candidate("s.b", ["ab", "c"])),
      ],
      shadow: [],
      stamps: [builtin.stamp, augment.stamp],
      replaced: false,
      diagnostics: [],
    });
  });

  test("dedupes the same candidate across packs sharing a schema", () => {
    const builtin = binding("builtin", {
      schemas: () => [schema("shared")],
      match: () => [candidate("shared")],
    });
    const augment = binding("aug", {
      schemas: () => [schema("shared")],
      match: () => [candidate("shared")],
    });
    const matched = composeOntologyMatches(
      resolution({ builtin, augment: [augment] }),
      CONTEXT,
    );
    expect(matched.canonical).toStrictEqual([
      stamped(builtin, candidate("shared")),
    ]);
    expect(matched.diagnostics).toStrictEqual([
      "ontology pack 'aug-pack' returned only invalid candidates",
    ]);
  });

  test("reports each kind of provider failure", () => {
    const pack = (id: string, match: OntologyPackV1["match"]) =>
      binding(id, { schemas: () => [schema(`${id}.s`)], match });
    const builtin = pack("builtin", () => {
      throw new Error("kaput");
    });
    const augment = [
      pack("raw", () => {
        throw "raw failure";
      }),
      pack("nonarray", () => ({}) as never),
      pack("empty", () => []),
      pack(
        "bad",
        () =>
          [
            null,
            "text",
            { schemaId: 7 },
            candidate("other.s"),
            candidate("bad.s", ["x", "y"]),
          ] as never,
      ),
    ];
    const matched = composeOntologyMatches(
      resolution({ builtin, augment }),
      CONTEXT,
    );
    expect(matched.canonical).toStrictEqual([]);
    expect(matched.diagnostics).toStrictEqual([
      "ontology pack 'builtin-pack' match() threw: kaput",
      "ontology pack 'raw-pack' match() threw: raw failure",
      "ontology pack 'nonarray-pack' match() returned a non-array; treating as provider failure",
      "ontology pack 'empty-pack' abstained (valid empty match)",
      "ontology pack 'bad-pack' produced an invalid candidate: ontology match candidate must be an object",
      "ontology pack 'bad-pack' produced an invalid candidate: ontology match candidate must be an object",
      "ontology pack 'bad-pack' produced an invalid candidate: schemaId must be a non-empty string",
      "ontology pack 'bad-pack' returned schema 'other.s' it does not own; rejected",
      "ontology pack 'bad-pack' produced an invalid candidate: Candidate arity 2 does not match schema arity 1",
      "ontology pack 'bad-pack' returned only invalid candidates",
    ]);
  });

  test("keeps the valid candidates of a pack that also returns invalid ones", () => {
    const builtin = binding("builtin", {
      schemas: () => [schema("b.s")],
      match: () => [null, candidate("b.s")] as never,
    });
    const matched = composeOntologyMatches(resolution({ builtin }), CONTEXT);
    expect(matched.canonical).toStrictEqual([
      stamped(builtin, candidate("b.s")),
    ]);
    expect(matched.diagnostics).toStrictEqual([
      "ontology pack 'builtin-pack' produced an invalid candidate: ontology match candidate must be an object",
    ]);
  });
});

describe("composeOntologyMatches with a replace pack", () => {
  const builtinMatches = () =>
    binding("builtin", {
      schemas: () => [schema("b.s")],
      match: () => [candidate("b.s")],
    });

  test("uses only the replace pack's candidates", () => {
    const builtin = builtinMatches();
    const replace = binding("rep", {
      schemas: () => [schema("r.s")],
      match: (context) => [candidate("r.s", [context.claimKey])],
    });
    const matched = composeOntologyMatches(
      resolution({ builtin, replace }),
      CONTEXT,
    );
    expect(matched).toStrictEqual({
      canonical: [stamped(replace, candidate("r.s", ["claim-1"]))],
      shadow: [],
      stamps: [replace.stamp],
      replaced: true,
      diagnostics: [],
    });
  });

  test("does not consult builtin when the replace pack abstains", () => {
    const replace = binding("rep", { schemas: () => [schema("r.s")] });
    const matched = composeOntologyMatches(
      resolution({ builtin: builtinMatches(), replace }),
      CONTEXT,
    );
    expect(matched.canonical).toStrictEqual([]);
    expect(matched.diagnostics).toStrictEqual([
      "ontology pack 'rep-pack' abstained (valid empty match)",
      "replace ontology pack 'rep' abstained; builtin match not consulted",
    ]);
  });

  test("falls back to builtin, loading its schemas, when the replace match fails", () => {
    const builtin = builtinMatches();
    const replace = binding("rep", {
      schemas: () => [schema("r.s")],
      match: () => {
        throw new Error("down");
      },
    });
    const matched = composeOntologyMatches(
      resolution({ builtin, replace }),
      CONTEXT,
    );
    expect(matched.canonical).toStrictEqual([
      stamped(builtin, candidate("b.s")),
    ]);
    expect(matched.replaced).toBe(true);
    expect(matched.diagnostics).toStrictEqual([
      "ontology pack 'rep-pack' match() threw: down",
      "replace ontology pack 'rep' match failed; falling back to builtin",
    ]);
  });

  test("falls back to builtin when the replace match is not an array", () => {
    const builtin = builtinMatches();
    const replace = binding("rep", {
      schemas: () => [schema("r.s")],
      match: () => "nope" as never,
    });
    const matched = composeOntologyMatches(
      resolution({ builtin, replace }),
      CONTEXT,
    );
    expect(matched.canonical).toStrictEqual([
      stamped(builtin, candidate("b.s")),
    ]);
  });

  test("skips builtin when its schemas fail after a replace match failure", () => {
    const builtin = binding("builtin", {
      schemas: () => {
        throw new Error("no schemas");
      },
      match: () => [candidate("b.s")],
    });
    const replace = binding("rep", {
      schemas: () => [schema("r.s")],
      match: () => [null] as never,
    });
    const matched = composeOntologyMatches(
      resolution({ builtin, replace }),
      CONTEXT,
    );
    expect(matched.canonical).toStrictEqual([]);
    expect(matched.diagnostics).toStrictEqual([
      "ontology pack 'rep-pack' produced an invalid candidate: ontology match candidate must be an object",
      "ontology pack 'rep-pack' returned only invalid candidates",
      "replace ontology pack 'rep' match failed; falling back to builtin",
      "ontology pack 'builtin-pack' schemas() failed: no schemas",
    ]);
  });

  test("matches with the catalog's builtin when the replace catalog failed", () => {
    let calls = 0;
    const builtin = binding("builtin", {
      schemas: () => {
        calls += 1;
        return [schema("b.s")];
      },
      match: () => [candidate("b.s")],
    });
    const replace = binding("rep", {
      schemas: () => {
        throw new Error("bad catalog");
      },
      match: () => [candidate("r.s")],
    });
    const matched = composeOntologyMatches(
      resolution({ builtin, replace }),
      CONTEXT,
    );
    expect(calls).toBe(1);
    expect(matched.canonical).toStrictEqual([
      stamped(builtin, candidate("b.s")),
    ]);
    expect(matched.diagnostics).toStrictEqual([
      "replace ontology pack 'rep' failed catalog construction (bad catalog); falling back to builtin",
      "replace ontology pack 'rep' schemas unavailable for match; falling back to builtin",
    ]);
  });
});

describe("composeOntologyMatches shadow packs", () => {
  test("match against their own schemas with a separate dedupe set", () => {
    const builtin = binding("builtin", {
      schemas: () => [schema("b.s")],
      match: () => [candidate("b.s")],
    });
    const shadow = binding("shadow", {
      schemas: () => [schema("b.s")],
      match: () => [candidate("b.s"), candidate("b.s")],
    });
    const failing = binding("broken", {
      schemas: () => {
        throw "unreadable";
      },
      match: () => [candidate("b.s")],
    });
    const matched = composeOntologyMatches(
      resolution({ builtin, shadow: [failing, shadow] }),
      CONTEXT,
    );
    expect(matched.canonical).toStrictEqual([
      stamped(builtin, candidate("b.s")),
    ]);
    expect(matched.shadow).toStrictEqual([stamped(shadow, candidate("b.s"))]);
    expect(matched.stamps).toStrictEqual([
      builtin.stamp,
      failing.stamp,
      shadow.stamp,
    ]);
    expect(matched.diagnostics).toStrictEqual([
      "ontology pack 'broken-pack' schemas() failed: unreadable",
    ]);
  });
});
