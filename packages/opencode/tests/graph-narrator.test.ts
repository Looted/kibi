import { describe, expect, it } from "bun:test";
import {
  generateGraphNarrative,
  type GraphNarrativeResult,
} from "../src/graph-narrator";

type MockEntity = {
  id: string;
  type: string;
  title?: string;
  status?: string;
  source?: string;
  tags?: string[];
  fact_kind?: string;
};

type MockGraph = {
  nodes?: Array<{ id: string; type?: string; title?: string }>;
  edges?: Array<{ from: string; to: string; type: string }>;
};

function createClient(options?: {
  entities?: Record<string, MockEntity | null>;
  graphs?: Record<string, MockGraph>;
  failingQueryIds?: string[];
}) {
  const entities = options?.entities ?? {};
  const graphs = options?.graphs ?? {};
  const failingQueryIds = new Set(options?.failingQueryIds ?? []);

  return {
    session: {
      create: async () => ({ data: { id: "graph-worker-1" } }),
      prompt: async (parameters: {
        parts: Array<{ type: string; text: string }>;
      }) => {
        const request = JSON.parse(parameters.parts[0]?.text ?? "{}");

        if (request.tool === "kb_query") {
          const id = request.args?.id as string;
          if (failingQueryIds.has(id)) {
            throw new Error(`kb_query failed for ${id}`);
          }

          const entity = entities[id];
          return {
            data: {
              parts: [
                {
                  type: "text",
                  text: JSON.stringify(entity ? [entity] : []),
                },
              ],
            },
          };
        }

        if (request.tool === "kb_graph") {
          const id = request.args?.seedIds?.[0] as string;
          return {
            data: {
              parts: [
                {
                  type: "text",
                  text: JSON.stringify(graphs[id] ?? { nodes: [], edges: [] }),
                },
              ],
            },
          };
        }

        return {
          data: {
            parts: [{ type: "text", text: "{}" }],
          },
        };
      },
    },
  };
}

function expectNarrative(result: GraphNarrativeResult | null): GraphNarrativeResult {
  expect(result).not.toBeNull();
  return result as GraphNarrativeResult;
}

describe("graph-narrator", () => {
  it("returns null for empty input", async () => {
    const result = await generateGraphNarrative(
      createClient(),
      { workspaceRoot: "/workspace", branch: "main" },
      [],
      [],
      { count: 0, violations: [] },
    );

    expect(result).toBeNull();
  });

  it("renders the superseded requirement pattern", async () => {
    const result = expectNarrative(
      await generateGraphNarrative(
        createClient({
          entities: {
            "REQ-100": {
              id: "REQ-100",
              type: "req",
              title: "Legacy login flow",
              status: "superseded",
              source: "packages/opencode/src/login.ts",
              tags: ["opencode"],
            },
            "REQ-101": {
              id: "REQ-101",
              type: "req",
              title: "OAuth login flow",
              status: "open",
              source: "packages/opencode/src/login.ts",
              tags: ["opencode"],
            },
          },
          graphs: {
            "REQ-100": {
              edges: [{ from: "REQ-101", to: "REQ-100", type: "supersedes" }],
            },
            "REQ-101": {
              edges: [{ from: "REQ-101", to: "REQ-100", type: "supersedes" }],
            },
          },
        }),
        { workspaceRoot: "/workspace", branch: "main" },
        ["REQ-100", "REQ-101"],
        [{ from: "REQ-101", to: "REQ-100", type: "supersedes" }],
        { count: 0, violations: [] },
      ),
    );

    expect(result.relationshipChanges).toContain(
      "Legacy login flow (REQ-100) was superseded by OAuth login flow (REQ-101)",
    );
    expect(result.domains[0]?.changes).toContain(
      "Legacy login flow (REQ-100) was marked superseded",
    );
    expect(result.validationStatus).toBe("All checks pass");
  });

  it("renders the symbol coverage gain pattern", async () => {
    const result = expectNarrative(
      await generateGraphNarrative(
        createClient({
          entities: {
            "SYM-001": {
              id: "SYM-001",
              type: "symbol",
              title: "generateIdleBrief",
              status: "active",
              source: "packages/opencode/src/idle-brief-runtime.ts",
              tags: ["opencode"],
            },
            "TEST-001": {
              id: "TEST-001",
              type: "test",
              title: "idle brief runtime regression",
              status: "passing",
              source: "packages/opencode/tests/idle-brief-runtime.test.ts",
              tags: ["opencode"],
            },
          },
          graphs: {
            "SYM-001": {
              edges: [{ from: "SYM-001", to: "TEST-001", type: "covered_by" }],
            },
            "TEST-001": {
              edges: [{ from: "SYM-001", to: "TEST-001", type: "covered_by" }],
            },
          },
        }),
        { workspaceRoot: "/workspace", branch: "main" },
        ["SYM-001", "TEST-001"],
        [{ from: "SYM-001", to: "TEST-001", type: "covered_by" }],
        { count: 0, violations: [] },
      ),
    );

    expect(result.relationshipChanges).toContain(
      "generateIdleBrief (SYM-001) gained test coverage via idle brief runtime regression (TEST-001)",
    );
    expect(result.headline).toContain("1 symbol and 1 test changed");
  });

  it("renders scenario and test linkage patterns", async () => {
    const result = expectNarrative(
      await generateGraphNarrative(
        createClient({
          entities: {
            "REQ-200": {
              id: "REQ-200",
              type: "req",
              title: "Idle brief graph narration",
              status: "open",
              source: "packages/opencode/src/graph-narrator.ts",
              tags: ["opencode"],
            },
            "SCEN-200": {
              id: "SCEN-200",
              type: "scenario",
              title: "Narrate KB graph changes",
              status: "open",
              source: "packages/opencode/tests/graph-narrator.test.ts",
              tags: ["opencode"],
            },
            "TEST-200": {
              id: "TEST-200",
              type: "test",
              title: "graph narrator regression",
              status: "passing",
              source: "packages/opencode/tests/graph-narrator.test.ts",
              tags: ["opencode"],
            },
          },
          graphs: {
            "REQ-200": {
              edges: [
                { from: "REQ-200", to: "SCEN-200", type: "specified_by" },
                { from: "REQ-200", to: "TEST-200", type: "verified_by" },
              ],
            },
            "SCEN-200": {
              edges: [{ from: "REQ-200", to: "SCEN-200", type: "specified_by" }],
            },
            "TEST-200": {
              edges: [{ from: "REQ-200", to: "TEST-200", type: "verified_by" }],
            },
          },
        }),
        { workspaceRoot: "/workspace", branch: "main" },
        ["REQ-200", "SCEN-200", "TEST-200"],
        [
          { from: "REQ-200", to: "SCEN-200", type: "specified_by" },
          { from: "REQ-200", to: "TEST-200", type: "verified_by" },
        ],
        { count: 1, violations: [{ rule: "symbol-coverage", entityId: "REQ-200", description: "Missing symbol" }] },
      ),
    );

    expect(result.relationshipChanges).toContain(
      "Idle brief graph narration (REQ-200) is specified by Narrate KB graph changes (SCEN-200)",
    );
    expect(result.relationshipChanges).toContain(
      "Idle brief graph narration (REQ-200) is verified by graph narrator regression (TEST-200)",
    );
    expect(result.validationStatus).toBe("1 validation issue");
  });

  it("groups created entities across multiple domains", async () => {
    const result = expectNarrative(
      await generateGraphNarrative(
        createClient({
          entities: {
            "REQ-300": {
              id: "REQ-300",
              type: "req",
              title: "OpenCode idle brief narrative",
              status: "open",
              source: "packages/opencode/src/graph-narrator.ts",
              tags: ["opencode"],
            },
            "ADR-300": {
              id: "ADR-300",
              type: "adr",
              title: "MCP graph traversal defaults",
              status: "accepted",
              source: "packages/mcp/src/utils/brief-marker.ts",
              tags: ["mcp"],
            },
          },
          graphs: {
            "REQ-300": { nodes: [], edges: [] },
            "ADR-300": { nodes: [], edges: [] },
          },
        }),
        { workspaceRoot: "/workspace", branch: "main" },
        ["REQ-300", "ADR-300"],
        [],
        { count: 0, violations: [] },
      ),
    );

    expect(result.headline).toContain("across MCP and OpenCode domains");
    expect(result.domains.map((domain: { name: string }) => domain.name)).toEqual(["MCP", "OpenCode"]);
    expect(result.domains[0]?.changes).toContain(
      "MCP graph traversal defaults (ADR-300) was created",
    );
    expect(result.domains[1]?.changes).toContain(
      "OpenCode idle brief narrative (REQ-300) was created",
    );
  });

  it("skips failed queries and narrates the rest", async () => {
    const result = expectNarrative(
      await generateGraphNarrative(
        createClient({
          entities: {
            "SYM-900": {
              id: "SYM-900",
              type: "symbol",
              title: "briefNarrationWorker",
              status: "active",
              source: "packages/opencode/src/graph-narrator.ts",
              tags: ["opencode"],
            },
          },
          graphs: {
            "SYM-900": { nodes: [], edges: [] },
          },
          failingQueryIds: ["REQ-900"],
        }),
        { workspaceRoot: "/workspace", branch: "main" },
        ["REQ-900", "SYM-900"],
        [],
        { count: 0, violations: [] },
      ),
    );

    expect(result.headline).toContain("1 symbol changed");
    expect(result.headline).not.toContain("REQ-900");
    expect(result.domains).toHaveLength(1);
    expect(result.domains[0]?.changes).toEqual([
      "briefNarrationWorker (SYM-900) was created",
    ]);
  });
});
