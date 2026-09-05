// implements REQ-skillopt-predicate-first-requirements
// implements REQ-skillopt-logical-evidence-fidelity
// implements REQ-skillopt-codex-optimization
import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Client } from "../../../packages/mcp/node_modules/@modelcontextprotocol/sdk/dist/esm/client/index.js";
import { EvidenceBindingError } from "../contracts/evidence";
import {
  decodeFinalStatePredicateSnapshot,
  runIndependentFinalState,
} from "../runtime/final-state";

const spies: Array<{ mockRestore: () => void }> = [];
const roots: string[] = [];

afterEach(() => {
  for (const spy of spies.splice(0)) spy.mockRestore();
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

const binding = {
  caseId: "case-1",
  roots: {
    publicManifestHash: "a".repeat(64),
    workspaceHash: "b".repeat(64),
    fixtureSeedHash: "c".repeat(64),
  },
  sequence: 1,
} as const;

function hash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function receipt(requests: unknown[], extras: Record<string, unknown> = {}) {
  return JSON.stringify({
    schemaVersion: "1.0.0",
    workspaceRoot: "/tmp/workspace",
    requests,
    ...extras,
  });
}

describe("decodeFinalStatePredicateSnapshot remaining parse and normalize branches", () => {
  test("rejects malformed JSON, schema, counts, and hash drift", () => {
    expect(() => decodeFinalStatePredicateSnapshot("{", binding)).toThrow(
      EvidenceBindingError,
    );
    expect(() =>
      decodeFinalStatePredicateSnapshot(JSON.stringify({ nope: true }), binding),
    ).toThrow(EvidenceBindingError);
    expect(() =>
      decodeFinalStatePredicateSnapshot(
        receipt([
          {
            tool: "kb_status",
            args: {},
            result: {},
            resultHash: hash({}),
          },
        ]),
        binding,
      ),
    ).toThrow(EvidenceBindingError);
    expect(() =>
      decodeFinalStatePredicateSnapshot(
        receipt([
          {
            tool: "kb_query",
            args: {},
            result: { ok: true },
            resultHash: "d".repeat(64),
          },
        ]),
        binding,
      ),
    ).toThrow(EvidenceBindingError);
  });

  test("decodes an already-bound snapshot and normalizes MCP entity graphs", () => {
    const bound = {
      binding,
      facts: [
        {
          id: "FACT-1",
          factKind: "predicate",
          predicateName: "commit_action",
          polarity: "assert",
        },
      ],
      relationships: [],
      logicClaims: [],
    };
    expect(
      decodeFinalStatePredicateSnapshot(
        receipt([
          {
            tool: "kb_query",
            args: { type: "fact" },
            result: bound,
            resultHash: hash(bound),
          },
        ]),
        binding,
      ).facts,
    ).toHaveLength(1);

    const mcpResult = {
      structuredContent: {
        kibiProtocol: 1,
        data: {
          entities: [
            {
              type: "req",
              id: "REQ-1",
              logic_claims: ["CLAIM-1111111111111111", 12],
              requires_predicate: "kb:entity/FACT-PRED",
              constrains: ["FACT-SUB"],
              requires_property: ["FACT-PROP"],
              requires_rule: ["FACT-RULE"],
            },
            {
              type: "fact",
              id: "FACT-PRED",
              fact_kind: "predicate",
              predicate_name: "commit_action",
              predicate_args: ["editor", 1, "save"],
              polarity: "assert",
              canonical_key: "commit_action(editor,save)",
              claim_key: "CLAIM-1111111111111111",
              claim_text: "save",
            },
            {
              type: "fact",
              id: "FACT-SUB",
              fact_kind: "subject",
              subject_key: "editor",
            },
            {
              type: "fact",
              id: "FACT-PROP",
              fact_kind: "property_value",
              property_key: "enabled",
              value_bool: true,
            },
            {
              type: "fact",
              id: "FACT-RULE",
              fact_kind: "rule",
              semantic_key: "SEM-AAAAAAAAAAAAAAAAAAAAAAAA",
              rule_hash: "e".repeat(64),
              rule_schema_id: "FACT-RULE-SCHEMA",
            },
            {
              type: "fact",
              id: "FACT-RULE-NAME",
              fact_kind: "rule",
              rule_name: "retention",
            },
            {
              type: "fact",
              id: "FACT-SCHEMA",
              fact_kind: "rule_schema",
              rule_name: "schema",
            },
            {
              type: "fact",
              id: "FACT-OBS",
              fact_kind: "observation",
              tags: ["review:ontology-gap", 1],
            },
            {
              type: "fact",
              id: "FACT-SKIP",
              fact_kind: "unknown",
            },
            "not-record",
          ],
        },
      },
    };
    const normalized = decodeFinalStatePredicateSnapshot(
      receipt(
        [
          {
            tool: "kb_query",
            args: {},
            result: mcpResult,
            resultHash: hash(mcpResult),
          },
        ],
        { binding },
      ),
      binding,
    );
    expect(normalized.facts.some((fact) => fact.factKind === "predicate")).toBe(
      true,
    );
    expect(normalized.relationships).toEqual(
      expect.arrayContaining([
        { relationship: "requires_predicate", target: "commit_action" },
        { relationship: "constrains", target: "editor" },
        { relationship: "requires_property", target: "enabled=true" },
        { relationship: "relates_to", target: "review:ontology-gap" },
      ]),
    );
    expect(normalized.logicClaims).toEqual(["CLAIM-1111111111111111"]);
  });

  test("requires a receipt binding when the query result is not already a snapshot", () => {
    const mcpResult = { structuredContent: { entities: [] } };
    expect(() =>
      decodeFinalStatePredicateSnapshot(
        receipt([
          {
            tool: "kb_query",
            args: {},
            result: mcpResult,
            resultHash: hash(mcpResult),
          },
        ]),
        binding,
      ),
    ).toThrow(EvidenceBindingError);
  });

  test("rejects MCP payloads whose entities field is not an array", () => {
    const mcpResult = { structured_content: { entities: { id: "x" } } };
    expect(() =>
      decodeFinalStatePredicateSnapshot(
        receipt(
          [
            {
              tool: "kb_query",
              args: {},
              result: mcpResult,
              resultHash: hash(mcpResult),
            },
          ],
          { binding },
        ),
        binding,
      ),
    ).toThrow(EvidenceBindingError);
  });
});

describe("runIndependentFinalState remaining launch and tool branches", () => {
  test("uses process env when launch.env is omitted and writes a durable receipt", async () => {
    const root = mkdtempSync(join(tmpdir(), "kibi-final-state-"));
    roots.push(root);
    const receiptPath = join(root, "receipt.json");
    const connect = spyOn(Client.prototype, "connect").mockResolvedValue(
      undefined as never,
    );
    const listTools = spyOn(Client.prototype, "listTools").mockResolvedValue({
      tools: [{ name: "kb_query" }, { name: "kb_status" }],
    } as never);
    const callTool = spyOn(Client.prototype, "callTool").mockResolvedValue({
      structuredContent: { ok: true },
    } as never);
    const close = spyOn(Client.prototype, "close").mockResolvedValue(
      undefined as never,
    );
    spies.push(connect, listTools, callTool, close);

    const written = await runIndependentFinalState({
      launch: {
        command: "true",
        args: [],
        cwd: root,
      },
      receiptPath,
      requests: [{ tool: "kb_query", args: { type: "req" } }],
      timeoutMs: 50,
    });
    expect(written.requests).toHaveLength(1);
    expect(JSON.parse(readFileSync(receiptPath, "utf8")).schemaVersion).toBe(
      "1.0.0",
    );
  });

  test("throws when an advertised tool is missing", async () => {
    const root = mkdtempSync(join(tmpdir(), "kibi-final-state-missing-"));
    roots.push(root);
    spies.push(
      spyOn(Client.prototype, "connect").mockResolvedValue(undefined as never),
      spyOn(Client.prototype, "listTools").mockResolvedValue({
        tools: [{ name: "kb_status" }],
      } as never),
      spyOn(Client.prototype, "close").mockResolvedValue(undefined as never),
    );
    await expect(
      runIndependentFinalState({
        launch: {
          command: "true",
          args: [],
          cwd: root,
          env: { PATH: process.env.PATH ?? "/usr/bin" },
        },
        receiptPath: join(root, "receipt.json"),
        requests: [{ tool: "kb_query", args: {} }],
        timeoutMs: 50,
        binding,
      }),
    ).rejects.toThrow(/final_state_tool_unavailable:kb_query/);
  });
});
