import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import path from "node:path";

type EntityKind = "fact" | "req" | "scenario" | "symbol" | "test";

type GraphNode = {
  readonly id: string;
  readonly kind: EntityKind;
  readonly factKind?:
    | "observation"
    | "predicate"
    | "property_value"
    | "subject";
  readonly role?: "behavioral" | "test";
};

type GraphEdge = {
  readonly from: string;
  readonly to: string;
  readonly type: string;
};

type GraphFixture = {
  readonly nodes: readonly GraphNode[];
  readonly edges: readonly GraphEdge[];
};

type GraphDiagnostic = {
  readonly code: string;
  readonly edge?: GraphEdge;
};

type MarkdownEntity = {
  readonly id: string;
  readonly links: readonly GraphEdge[];
};

const ROOT = path.resolve(import.meta.dir, "../../../..");
const REQ_ID = "REQ-skillopt-predicate-first-requirements";
const SCEN_ID = "SCEN-skillopt-predicate-first-requirements";
const TEST_ID = "TEST-skillopt-predicate-first-requirements";
const TEST_SYMBOL_ID = "SYM-test-predicate-first-graph";
const REQUIRED_FACT_KINDS: readonly NonNullable<GraphNode["factKind"]>[] = [
  "predicate",
  "subject",
  "property_value",
  "observation",
];

const ALLOWED_EDGE_SHAPES = new Set([
  "req:specified_by:scenario",
  "req:verified_by:test",
  "scenario:verified_by:test",
  "test:validates:req",
  "symbol:implements:req",
  "symbol:covered_by:test",
  "symbol:executable_for:test",
  "req:constrains:fact",
  "req:requires_predicate:fact",
  "req:requires_property:fact",
]);

function parseMarkdown(relativePath: string): MarkdownEntity {
  const content = readFileSync(path.join(ROOT, relativePath), "utf8");
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match?.[1] || match[2] === undefined) {
    throw new TypeError(`${relativePath} must contain valid frontmatter`);
  }

  const id = match[1].match(/^id:\s*(.+)$/m)?.[1]?.trim();
  if (!id) throw new TypeError(`${relativePath} must declare an id`);
  const links = [
    ...match[1].matchAll(/- type:\s*(\S+)\n\s+target:\s*(\S+)/g),
  ].map((link) => ({ from: id, to: link[2] ?? "", type: link[1] ?? "" }));
  return { id, links };
}

function loadPredicateFirstGraph(): GraphFixture {
  const requirement = parseMarkdown(
    "documentation/requirements/REQ-skillopt-predicate-first-requirements.md",
  );
  const scenario = parseMarkdown(
    "documentation/scenarios/SCEN-skillopt-predicate-first-requirements.md",
  );
  const testIdentity = parseMarkdown(
    "documentation/tests/TEST-skillopt-predicate-first-requirements.md",
  );
  const symbols = readFileSync(
    path.join(ROOT, "documentation/symbols.yaml"),
    "utf8",
  );
  const symbolBlock = symbols.match(
    new RegExp(
      `^([ \\t]*)- id: ${TEST_SYMBOL_ID}\\n([\\s\\S]*?)(?=^\\1- id: |$(?![\\s\\S]))`,
      "m",
    ),
  )?.[0];
  if (!symbolBlock) throw new TypeError(`${TEST_SYMBOL_ID} must be manifested`);
  const symbolEdges = [
    ...symbolBlock.matchAll(/- type:\s*(\S+)\n\s+target:\s*(\S+)/g),
  ].map((link) => ({
    from: TEST_SYMBOL_ID,
    to: link[2] ?? "",
    type: link[1] ?? "",
  }));

  return {
    nodes: [
      { id: requirement.id, kind: "req" },
      { id: scenario.id, kind: "scenario" },
      { id: testIdentity.id, kind: "test" },
      { id: TEST_SYMBOL_ID, kind: "symbol", role: "test" },
    ],
    edges: [
      ...requirement.links,
      ...scenario.links,
      ...testIdentity.links,
      ...symbolEdges,
    ],
  };
}

function validateTypedEdges(graph: GraphFixture): readonly GraphDiagnostic[] {
  const nodes = new Map(graph.nodes.map((node) => [node.id, node]));
  const diagnostics: GraphDiagnostic[] = [];

  for (const edge of graph.edges) {
    const from = nodes.get(edge.from);
    const to = nodes.get(edge.to);
    if (!from || !to) {
      diagnostics.push({ code: "dangling_edge", edge });
      continue;
    }

    if (!ALLOWED_EDGE_SHAPES.has(`${from.kind}:${edge.type}:${to.kind}`)) {
      diagnostics.push({ code: "invalid_typed_edge", edge });
    }

    if (
      from.kind === "symbol" &&
      from.role === "test" &&
      edge.type !== "executable_for"
    ) {
      diagnostics.push({ code: "invalid_executable_symbol_relation", edge });
    }
  }

  return diagnostics;
}

function validateModelingLanes(
  nodes: readonly GraphNode[],
): readonly GraphDiagnostic[] {
  const factKinds = new Set(
    nodes.filter((node) => node.kind === "fact").map((node) => node.factKind),
  );
  return REQUIRED_FACT_KINDS.filter((factKind) => !factKinds.has(factKind)).map(
    () => ({ code: "missing_modeling_lane" }),
  );
}

describe("predicate-first graph", () => {
  test("baseline typed-edge validation accepts the existing canonical relationship taxonomy", () => {
    // Given
    const graph: GraphFixture = {
      nodes: [
        { id: "REQ-baseline", kind: "req" },
        { id: "SCEN-baseline", kind: "scenario" },
        { id: "TEST-baseline", kind: "test" },
        { id: "SYM-production", kind: "symbol", role: "behavioral" },
        { id: "SYM-test", kind: "symbol", role: "test" },
      ],
      edges: [
        { from: "REQ-baseline", to: "SCEN-baseline", type: "specified_by" },
        { from: "REQ-baseline", to: "TEST-baseline", type: "verified_by" },
        { from: "SCEN-baseline", to: "TEST-baseline", type: "verified_by" },
        { from: "TEST-baseline", to: "REQ-baseline", type: "validates" },
        { from: "SYM-production", to: "REQ-baseline", type: "implements" },
        { from: "SYM-production", to: "TEST-baseline", type: "covered_by" },
        { from: "SYM-test", to: "TEST-baseline", type: "executable_for" },
      ],
    };

    // When
    const diagnostics = validateTypedEdges(graph);

    // Then
    expect(diagnostics).toEqual([]);
  });

  test("predicate-first graph accepts exact typed chain", () => {
    // Given
    const graph = loadPredicateFirstGraph();

    // When
    const diagnostics = validateTypedEdges(graph);

    // Then
    expect(diagnostics).toEqual([]);
    expect(graph.edges).toEqual([
      { from: REQ_ID, to: SCEN_ID, type: "specified_by" },
      { from: REQ_ID, to: TEST_ID, type: "verified_by" },
      { from: SCEN_ID, to: TEST_ID, type: "verified_by" },
      { from: TEST_ID, to: REQ_ID, type: "validates" },
      { from: TEST_SYMBOL_ID, to: TEST_ID, type: "executable_for" },
    ]);
  });

  test("predicate-first graph rejects reversed generic or executable-symbol edges", () => {
    // Given
    const nodes: readonly GraphNode[] = [
      { id: REQ_ID, kind: "req" },
      { id: SCEN_ID, kind: "scenario" },
      { id: TEST_ID, kind: "test" },
      { id: TEST_SYMBOL_ID, kind: "symbol", role: "test" },
    ];
    const cases: readonly GraphEdge[] = [
      { from: SCEN_ID, to: REQ_ID, type: "specified_by" },
      { from: REQ_ID, to: TEST_ID, type: "relates_to" },
      { from: TEST_SYMBOL_ID, to: REQ_ID, type: "implements" },
    ];

    for (const edge of cases) {
      // When
      const diagnostics = validateTypedEdges({ nodes, edges: [edge] });

      // Then
      expect(diagnostics.map(({ code }) => code)).toContain(
        edge.from === TEST_SYMBOL_ID
          ? "invalid_executable_symbol_relation"
          : "invalid_typed_edge",
      );
    }
  });

  test("predicate-first graph requires predicate strict and gap modeling lanes", () => {
    // Given
    const complete: readonly GraphNode[] = [
      { id: "FACT-predicate", kind: "fact", factKind: "predicate" },
      { id: "FACT-subject", kind: "fact", factKind: "subject" },
      { id: "FACT-property", kind: "fact", factKind: "property_value" },
      { id: "FACT-gap", kind: "fact", factKind: "observation" },
    ];

    for (const omitted of complete) {
      // When
      const diagnostics = validateModelingLanes(
        complete.filter(({ id }) => id !== omitted.id),
      );

      // Then
      expect(diagnostics.map(({ code }) => code)).toContain(
        "missing_modeling_lane",
      );
    }
    expect(validateModelingLanes(complete)).toEqual([]);
  });
});
