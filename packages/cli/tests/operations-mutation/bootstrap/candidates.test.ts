import {
  afterEach,
  beforeEach,
  describe,
  expect,
  setSystemTime,
  spyOn,
  test,
} from "bun:test";
import { extractFromManifestString } from "../../../src/extractors/manifest.js";
import { extractFromMarkdownString } from "../../../src/extractors/markdown.js";
import {
  bootstrapProvenance,
  provenanceBody,
  provenanceStubBody,
  upsert,
  withDocumentBody,
} from "../../../src/operations/bootstrap/candidate-helpers.js";
import {
  buildBootstrapCandidates,
  isProvenanceStubCandidate,
  providerClaim,
} from "../../../src/operations/bootstrap/candidates.js";
import * as markdown from "../../../src/operations/bootstrap/markdown-candidates.js";
import type {
  BootstrapEvidence,
  Candidate,
} from "../../../src/operations/bootstrap/types.js";

beforeEach(() => {
  setSystemTime(new Date("2026-01-02T03:04:05.000Z"));
});
afterEach(() => {
  setSystemTime();
});

const NONE = new Set<string>();

function evidence(
  kind: string,
  data: Record<string, unknown> = {},
  extra: Partial<BootstrapEvidence> = {},
): BootstrapEvidence {
  return {
    provider: "prov",
    kind,
    label: "label",
    relativePath: "docs/x.md",
    absolutePath: "/abs/docs/x.md",
    data,
    ...extra,
  } as BootstrapEvidence;
}

const build = (
  items: BootstrapEvidence[],
  options: { existing?: Set<string>; min?: number; generic?: boolean } = {},
) =>
  buildBootstrapCandidates(
    items,
    options.existing ?? NONE,
    options.min ?? 0.5,
    options.generic ?? false,
  );

const REQ =
  "---\nid: REQ-a\ntitle: A\ntype: req\nlinks:\n  - type: relates_to\n    target: REQ-b\n---\nBody.\n";

describe("providerClaim", () => {
  test("returns the trimmed claim or undefined", () => {
    expect(providerClaim(evidence("repo_layout", { claim: " c " }))).toBe("c");
    expect(providerClaim(evidence("repo_layout", { claim: "  " }))).toBe(
      undefined,
    );
    expect(providerClaim(evidence("repo_layout", { claim: 5 }))).toBe(
      undefined,
    );
  });
});

describe("isProvenanceStubCandidate", () => {
  const candidate = (...properties: unknown[]) =>
    ({
      applyPlan: properties.map((value) => ({ properties: value })),
    }) as unknown as Candidate;

  test("finds the stub tag in any step", () => {
    expect(
      isProvenanceStubCandidate(
        candidate(
          null,
          undefined,
          "x",
          { tags: "bootstrap:provenance-stub" },
          {
            tags: ["a", "bootstrap:provenance-stub"],
          },
        ),
      ),
    ).toBe(true);
    expect(
      isProvenanceStubCandidate(candidate(null, { tags: ["a"] }, {})),
    ).toBe(false);
  });
});

describe("typed candidates", () => {
  test("plans each typed Markdown entity", () => {
    const item = evidence("typed_markdown", {}, { content: REQ });
    const { entity, relationships } = extractFromMarkdownString(
      REQ,
      "docs/x.md",
    );
    expect(build([item])).toStrictEqual({
      candidates: [
        {
          candidateId: "md:docs/x.md:REQ-a",
          entityType: "req",
          title: "A",
          sourceKind: "typed_markdown",
          sourcePath: "/abs/docs/x.md",
          confidence: 1,
          confidenceBand: "high",
          evidence: [
            "extracted_from_typed_markdown:docs/x.md",
            "entity_id:REQ-a",
          ],
          relationships: [{ type: "relates_to", from: "REQ-a", to: "REQ-b" }],
          applyPlan: [upsert(entity, relationships)],
        },
      ],
      diagnostics: [],
      suppressed: [],
      sourceOnlySignals: [],
    });
    expect(
      build([item], { existing: new Set(["REQ-a"]) }).candidates,
    ).toStrictEqual([]);
  });

  test("plans each symbol of a manifest", () => {
    const manifest =
      "symbols:\n  - id: SYM-a\n    title: a\n  - id: SYM-b\n    title: b\n";
    const item = evidence(
      "symbol_manifest",
      {},
      { content: manifest, relativePath: undefined, absolutePath: undefined },
    );
    const results = extractFromManifestString(manifest, "label");
    const built = build([item], { existing: new Set(["SYM-a"]) });
    expect(built.candidates).toStrictEqual([
      {
        candidateId: "mf:undefined:SYM-b",
        entityType: "symbol",
        title: "b",
        sourceKind: "symbol_manifest",
        sourcePath: "label",
        confidence: 0.98,
        confidenceBand: "high",
        evidence: [
          "extracted_from_symbol_manifest:undefined",
          "entity_id:SYM-b",
        ],
        relationships: [],
        applyPlan: [upsert(results[1]?.entity as never, [])],
      },
    ] as unknown as Candidate[]);
  });

  test("reports an extraction failure", () => {
    let message = "";
    try {
      extractFromMarkdownString("---\ntitle: [\n---\n", "docs/x.md");
    } catch (error) {
      message = (error as Error).message;
    }
    let emptyMessage = "";
    try {
      extractFromMarkdownString("", "label");
    } catch (error) {
      emptyMessage = (error as Error).message;
    }
    const built = build([
      evidence("typed_markdown", {}, { content: "---\ntitle: [\n---\n" }),
      evidence("typed_markdown", {}, { relativePath: undefined, content: "" }),
    ]);
    expect(built.diagnostics).toStrictEqual([
      `Bootstrap extraction failed at docs/x.md: ${message}`,
      `Bootstrap extraction failed at label: ${emptyMessage}`,
    ]);
    expect(built.suppressed).toStrictEqual([
      {
        candidateId: "",
        sourcePath: "docs/x.md",
        entityType: "",
        reason: "extraction_failed",
        message,
      },
      {
        candidateId: "",
        sourcePath: "label",
        entityType: "",
        reason: "extraction_failed",
        message: emptyMessage,
      },
    ]);
  });
});

describe("generic Markdown", () => {
  test("delegates to the Markdown candidate builder when enabled", () => {
    const item = evidence("generic_markdown");
    const subjectKeys = new Map() as never;
    const spy = spyOn(markdown, "markdownCandidates").mockReturnValue({
      candidates: [{ candidateId: "c" } as Candidate],
      sourceOnlySignals: [
        {
          kind: "req",
          title: "t",
          sourcePath: "b",
          confidence: 0.5,
          evidence: [],
        },
        {
          kind: "req",
          title: "t",
          sourcePath: "a",
          confidence: 0.5,
          evidence: [],
        },
        {
          kind: "req",
          title: "t",
          sourcePath: "z",
          confidence: 0.9,
          evidence: [],
        },
      ] as never,
      diagnostics: ["d"],
      suppressed: [{ s: 1 }],
    });
    try {
      expect(build([item]).candidates).toStrictEqual([]);
      expect(spy).not.toHaveBeenCalled();
      build([evidence("other_kind")], { generic: true });
      expect(spy).not.toHaveBeenCalled();
      const existing = new Set(["X"]);
      const built = buildBootstrapCandidates(
        [item],
        existing,
        0.3,
        true,
        subjectKeys,
      );
      expect(spy.mock.calls).toStrictEqual([
        [item, existing, 0.3, subjectKeys],
      ]);
      expect(built).toStrictEqual({
        candidates: [{ candidateId: "c" } as Candidate],
        diagnostics: ["d"],
        suppressed: [{ s: 1 }],
        sourceOnlySignals: [
          {
            kind: "req",
            title: "t",
            sourcePath: "z",
            confidence: 0.9,
            evidence: [],
          },
          {
            kind: "req",
            title: "t",
            sourcePath: "a",
            confidence: 0.5,
            evidence: [],
          },
          {
            kind: "req",
            title: "t",
            sourcePath: "b",
            confidence: 0.5,
            evidence: [],
          },
        ] as never,
      });
    } finally {
      spy.mockRestore();
    }
  });
});

describe("test topology signals", () => {
  test("asks for test coverage above the confidence floor", () => {
    const signals = build(
      [
        evidence("test_topology", { evidence: ["e", 5], confidence: 0.6 }),
        evidence(
          "test_topology",
          { confidence: 0.5 },
          { absolutePath: undefined, label: "L" },
        ),
        evidence("test_topology", { confidence: 0.4 }),
        evidence(
          "test_topology",
          {},
          { absolutePath: undefined, relativePath: undefined, label: "M" },
        ),
      ],
      { min: 0.5 },
    ).sourceOnlySignals;
    expect(signals).toStrictEqual([
      {
        kind: "test",
        title: "Author TEST coverage for M",
        sourcePath: "M",
        confidence: 0.8,
        evidence: ["test_topology:M"],
      },
      {
        kind: "test",
        title: "Author TEST coverage for label",
        sourcePath: "/abs/docs/x.md",
        confidence: 0.6,
        evidence: ["e"],
      },
      {
        kind: "test",
        title: "Author TEST coverage for L",
        sourcePath: "docs/x.md",
        confidence: 0.5,
        evidence: ["test_topology:docs/x.md"],
      },
    ]);
  });
});

describe("provider candidates", () => {
  const provider = (
    item: BootstrapEvidence,
    options: { existing?: Set<string>; min?: number } = {},
  ) => build([item], options).candidates;

  test("writes a provenance stub when the provider states no claim", () => {
    const item = evidence("repo_layout", {}, { relativePath: "src/Lib.ts" });
    const title = "Bootstrap evidence from src/Lib.ts";
    const provenance = `${bootstrapProvenance("prov", "src/Lib.ts", 0.8)} Evidence: provider:prov; prov:src/Lib.ts.`;
    expect(provider(item)).toStrictEqual([
      {
        candidateId: "prov:repo_layout:src-lib-ts",
        entityType: "fact",
        title,
        sourceKind: "repo_layout",
        sourcePath: "/abs/docs/x.md",
        confidence: 0.8,
        confidenceBand: "medium",
        evidence: ["provider:prov", "prov:src/Lib.ts"],
        relationships: [],
        applyPlan: [
          withDocumentBody(
            upsert({
              type: "fact",
              id: "FACT-GEN-REPO-LAYOUT-SRC-LIB-TS",
              title,
              status: "active",
              fact_kind: "meta",
              source: "bootstrap:prov:src/Lib.ts",
              text_ref: "src/Lib.ts",
              tags: ["bootstrap:provenance-stub"],
            }),
            provenanceStubBody(title, provenance),
          ),
        ],
      },
    ]);
  });

  test("writes an observation for a claim", () => {
    const item = evidence(
      "test_topology",
      {
        claim: "Tests run.",
        confidence: 0.95,
        evidence: ["e1", 2],
        title: " T ",
      },
      { absolutePath: undefined },
    );
    const provenance = `${bootstrapProvenance("prov", "docs/x.md", 0.95)} Evidence: e1.`;
    const [candidate] = provider(item);
    expect(candidate).toStrictEqual({
      candidateId: "prov:test_topology:docs-x-md",
      entityType: "fact",
      title: " T ",
      sourceKind: "test_topology",
      sourcePath: "docs/x.md",
      confidence: 0.95,
      confidenceBand: "high",
      evidence: ["e1"],
      relationships: [],
      applyPlan: [
        withDocumentBody(
          upsert({
            type: "fact",
            id: "FACT-GEN-TEST-TOPOLOGY-DOCS-X-MD",
            title: " T ",
            status: "active",
            fact_kind: "observation",
            source: "bootstrap:prov:docs/x.md",
            text_ref: "docs/x.md",
          }),
          provenanceBody("T\n\nTests run.", provenance),
        ),
      ],
    });
  });

  test("chooses the fact kind", () => {
    const kind = (item: BootstrapEvidence) =>
      (provider(item)[0]?.applyPlan[0]?.properties as { fact_kind: string })
        .fact_kind;
    expect(kind(evidence("repo_metadata", { claim: "c" }))).toBe("meta");
    expect(kind(evidence("repo_layout", { claim: "c" }))).toBe("observation");
    expect(
      kind(evidence("repo_metadata", { claim: "c", factKind: "domain" })),
    ).toBe("domain");
    expect(kind(evidence("repo_layout", { claim: "c", factKind: 3 }))).toBe(
      "observation",
    );
  });

  test("names source symbols after their module", () => {
    const title = (relativePath: string) =>
      provider(evidence("source_symbols", {}, { relativePath }))[0]?.title;
    expect(title("src/a/Widget.tsx")).toBe("Source symbols: Widget");
    expect(title("src/a/w.MJS")).toBe("Source symbols: w");
    expect(title("src/a/w.cts")).toBe("Source symbols: w");
    expect(title("src/a/w.js")).toBe("Source symbols: w");
    expect(title("src/a/w.py")).toBe("Bootstrap evidence from src/a/w.py");
    expect(title("src/a/w.tsx.bak")).toBe(
      "Bootstrap evidence from src/a/w.tsx.bak",
    );
    expect(
      provider(evidence("repo_layout", {}, { relativePath: "src/w.ts" }))[0]
        ?.title,
    ).toBe("Bootstrap evidence from src/w.ts");
    expect(
      provider(
        evidence(
          "source_symbols",
          { title: "Given" },
          { relativePath: "w.ts" },
        ),
      )[0]?.title,
    ).toBe("Given");
    expect(
      provider(
        evidence("source_symbols", { title: 5 }, { relativePath: "w.ts" }),
      )[0]?.title,
    ).toBe("Source symbols: w");
  });

  test("falls back to generic ids and omits empty evidence", () => {
    const [candidate] = provider(
      evidence(
        "repo_metadata",
        { evidence: [] },
        { relativePath: undefined, label: "%%", absolutePath: undefined },
      ),
    );
    expect(candidate?.candidateId).toBe("prov:repo_metadata:evidence");
    expect(candidate?.sourcePath).toBe("%%");
    expect(candidate?.evidence).toStrictEqual([]);
    expect(candidate?.applyPlan[0]?.id).toBe("FACT-GEN-REPO-METADATA");
    expect((candidate?.applyPlan[0]?.document as { body: string }).body).toBe(
      provenanceStubBody(
        "Bootstrap evidence from %%",
        bootstrapProvenance("prov", "%%", 0.8),
      ),
    );
    const long = "a".repeat(120);
    const [longCandidate] = provider(
      evidence("repo_layout", {}, { relativePath: long }),
    );
    expect(longCandidate?.candidateId).toBe(
      `prov:repo_layout:${"a".repeat(96)}`,
    );
    expect(longCandidate?.applyPlan[0]?.id).toBe(
      `FACT-GEN-REPO-LAYOUT-${"A".repeat(52)}`,
    );
    const [empty] = provider(
      evidence("repo_layout", {}, { relativePath: "%%" }),
    );
    expect(empty?.candidateId).toBe("prov:repo_layout:evidence");
    expect(empty?.applyPlan[0]?.id).toBe("FACT-GEN-REPO-LAYOUT");
  });

  test("skips other kinds, low confidence and existing ids", () => {
    expect(
      provider(evidence("typed_markdown", {}, { content: REQ })),
    ).toHaveLength(1);
    expect(provider(evidence("other_kind"))).toStrictEqual([]);
    expect(
      provider(evidence("repo_layout", { confidence: 0.49 })),
    ).toStrictEqual([]);
    expect(provider(evidence("repo_layout", { confidence: 0.5 }))).toHaveLength(
      1,
    );
    expect(
      provider(evidence("repo_layout"), {
        existing: new Set(["FACT-GEN-REPO-LAYOUT-DOCS-X-MD"]),
      }),
    ).toStrictEqual([]);
  });
});
