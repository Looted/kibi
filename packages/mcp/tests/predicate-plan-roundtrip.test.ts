// implements REQ-model-predicates-plan-roundtrip
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { type ChildProcess, spawn, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { StringDecoder } from "node:string_decoder";
import { isolatedMcpSandboxEnv } from "./helpers/isolated-env.js";

// The plans kb_model mode "predicates" returns are applied through the real
// MCP server (stdio JSON-RPC, published inputSchema validation, kb_upsert and
// kb_delete handlers) exactly as returned.

type Json = Record<string, unknown>;

const repoRoot = path.resolve(import.meta.dir, "../../..");
const cliPath = path.join(repoRoot, "packages/cli/dist/cli.js");
const mcpPath = path.join(repoRoot, "packages/mcp/bin/kibi-mcp");

/** Has a complete commit_action predicate candidate. */
const PREDICATE_CLAIM =
  "The editor must save changes automatically when the user navigates away.";
/** Has no fitting predicate schema: an ontology gap. */
const GAP_CLAIM =
  "The editor must render the toolbar in the preferred colour scheme.";

class McpClient {
  private nextId = 1;
  private buffer = "";
  private stderr = "";
  private readonly decoder = new StringDecoder("utf8");
  private readonly waiting = new Map<number, (message: Json) => void>();

  constructor(private readonly child: ChildProcess) {
    child.stdout?.on("data", (chunk: Buffer) => {
      this.buffer += this.decoder.write(chunk);
      for (;;) {
        const newline = this.buffer.indexOf("\n");
        if (newline < 0) return;
        const line = this.buffer.slice(0, newline).trim();
        this.buffer = this.buffer.slice(newline + 1);
        if (!line) continue;
        const message = JSON.parse(line) as Json;
        const resolve = this.waiting.get(Number(message.id));
        if (resolve) {
          this.waiting.delete(Number(message.id));
          resolve(message);
        }
      }
    });
    child.stderr?.on("data", (chunk: Buffer) => {
      this.stderr = `${this.stderr}${chunk.toString()}`.slice(-16_384);
    });
  }

  request(method: string, params: Json): Promise<Json> {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.waiting.delete(id);
        reject(new Error(`MCP ${method} timed out\n${this.stderr}`));
      }, 120_000);
      this.waiting.set(id, (message) => {
        clearTimeout(timeout);
        resolve(message);
      });
      this.child.stdin?.write(
        `${JSON.stringify({ jsonrpc: "2.0", id, method, params })}\n`,
      );
    });
  }

  /** tools/call; returns the result (isError included) as the server sent it. */
  async call(name: string, args: unknown): Promise<Json> {
    const response = await this.request("tools/call", {
      name,
      arguments: args as Json,
    });
    if (response.error)
      throw new Error(`${name} failed: ${JSON.stringify(response.error)}`);
    return response.result as Json;
  }

  async ok(name: string, args: unknown): Promise<Json> {
    const result = await this.call(name, args);
    if (result.isError === true)
      throw new Error(`${name} isError: ${JSON.stringify(result.content)}`);
    const envelope = (result.structuredContent ?? {}) as Json;
    return (envelope.data ?? envelope) as Json;
  }

  async stop(): Promise<void> {
    if (this.child.exitCode !== null || this.child.signalCode !== null) return;
    this.child.kill("SIGTERM");
    await new Promise<void>((resolve) =>
      this.child.once("exit", () => resolve()),
    );
  }
}

function runCli(workspace: string, args: readonly string[]): void {
  const result = spawnSync(process.execPath, [cliPath, ...args], {
    cwd: workspace,
    encoding: "utf8",
    env: isolatedMcpSandboxEnv(),
  });
  if (result.status !== 0)
    throw new Error(result.stderr || `kibi ${args.join(" ")} failed`);
}

const REQUIREMENT_BODY =
  "## Context\n\nThis requirement exists so the predicate plan round trip has a claim that the strict lane already grounds through requires_property. Reason not stated beyond the test fixture.";

/** Ground a claim through the strict lane with kb_model mode requirement. */
async function groundRequirement(
  client: McpClient,
  text: string,
  subjectKey: string,
  propertyKey: string,
): Promise<string> {
  const modeled = await client.ok("kb_model", {
    mode: "requirement",
    text,
    subjectKey,
    propertyKey,
    operator: "eq",
    value: true,
  });
  const plan = modeled.applyPlan as Json[];
  let requirementId = "";
  for (const step of plan) {
    if (step.type === "req") requirementId = String(step.id);
    await client.ok("kb_upsert", {
      ...step,
      document: {
        body:
          step.type === "req"
            ? `${text}\n\n${REQUIREMENT_BODY}`
            : `Strict fact grounding a test requirement. ${REQUIREMENT_BODY}`,
      },
    });
  }
  return requirementId;
}

function violationsFor(check: Json, entityId: string): string[] {
  const violations = (check.violations ?? []) as Json[];
  return violations
    .filter((violation) => violation.entityId === entityId)
    .map((violation) => String(violation.rule));
}

async function entity(client: McpClient, id: string): Promise<Json> {
  const query = await client.ok("kb_query", { id, limit: 5, offset: 0 });
  const [found] = (query.entities ?? []) as Json[];
  if (!found) throw new Error(`${id} not found`);
  return found;
}

describe("kb_model predicate plans apply through the MCP server unchanged", () => {
  let workspace = "";
  let client: McpClient;

  beforeAll(async () => {
    workspace = mkdtempSync(path.join(tmpdir(), "kibi-predicate-roundtrip-"));
    const init = spawnSync("git", ["init", "-q", "-b", "main"], {
      cwd: workspace,
      env: isolatedMcpSandboxEnv(),
    });
    if (init.status !== 0) throw new Error("git init failed");
    runCli(workspace, ["init", "--no-hooks"]);
    client = new McpClient(
      spawn("node", [mcpPath], {
        cwd: workspace,
        env: isolatedMcpSandboxEnv({
          KIBI_BRANCH: "main",
          KIBI_WORKSPACE: workspace,
        }),
        stdio: ["pipe", "pipe", "pipe"],
      }),
    );
    await client.request("initialize", {
      protocolVersion: "2025-11-25",
      capabilities: {},
      clientInfo: { name: "predicate-plan-roundtrip", version: "1.0.0" },
    });
  }, 180_000);

  afterAll(async () => {
    await client?.stop();
    if (workspace) {
      spawnSync(process.execPath, [cliPath, "engine", "stop"], {
        cwd: workspace,
        env: isolatedMcpSandboxEnv(),
      });
      rmSync(workspace, { recursive: true, force: true });
    }
  });

  test("record_ontology_gap: the returned observation is written as is", async () => {
    // Given a requirement whose claim is grounded and fits no predicate schema.
    const requirementId = await groundRequirement(
      client,
      GAP_CLAIM,
      "editor.toolbar",
      "uses_preferred_colour_scheme",
    );
    const suggestion = await client.ok("kb_model", {
      mode: "predicates",
      text: GAP_CLAIM,
      requirementId,
    });
    expect(suggestion.recommendedAction).toBe("record_ontology_gap");
    expect((suggestion.existingGrounding as Json[]).length).toBe(1);
    const applyPlan = suggestion.applyPlan as Json[];
    expect(applyPlan).toHaveLength(1);

    // When every applyPlan step goes to kb_upsert unchanged.
    for (const step of applyPlan) {
      const result = await client.call("kb_upsert", step);
      expect(result.isError).not.toBe(true);
    }

    // Then the observation exists, quotes the claim and passes kb_check.
    const gapId = String(applyPlan[0]?.id);
    const stored = await entity(client, gapId);
    expect(stored).toMatchObject({
      fact_kind: "observation",
      claim_text: GAP_CLAIM,
      tags: ["review:ontology-gap", "needs_schema_extension"],
    });
    expect(stored.claim_key).toBeUndefined();
    const check = await client.ok("kb_check", {});
    expect(violationsFor(check, gapId)).toEqual([]);
    expect(violationsFor(check, requirementId)).toEqual([]);
  }, 180_000);

  test("replace_grounding: the replacement steps run in their stated order", async () => {
    // Given a requirement grounded through requires_property whose claim has
    // a complete predicate candidate.
    const requirementId = await groundRequirement(
      client,
      PREDICATE_CLAIM,
      "editor.autosave",
      "save_on_navigation",
    );
    const suggestion = await client.ok("kb_model", {
      mode: "predicates",
      text: PREDICATE_CLAIM,
      requirementId,
    });
    expect(suggestion.recommendedAction).toBe("replace_grounding");
    const [grounding] = suggestion.existingGrounding as Array<{
      relationship: Json;
      factId: string;
    }>;
    const replacement = suggestion.replacementPlan as {
      relationshipTarget: string;
      steps: Array<{ operation: string; input: Json }>;
    };
    expect(replacement.steps.map((step) => step.operation)).toEqual([
      "kb_upsert",
      "kb_delete",
      "kb_upsert",
    ]);
    const factId = replacement.relationshipTarget;
    const before = await entity(client, requirementId);

    // When each step is applied unchanged, in order; the claim is
    // ungrounded only between the retraction and the new link.
    const ruleAfterStep: string[][] = [];
    for (const step of replacement.steps) {
      const result = await client.call(step.operation, step.input);
      expect(result.isError).not.toBe(true);
      ruleAfterStep.push(
        violationsFor(await client.ok("kb_check", {}), requirementId),
      );
    }
    expect(ruleAfterStep).toEqual([[], ["logic-coverage"], []]);

    // Then the requirement grounds its claim through the predicate only and
    // keeps its stored title, status and tags.
    const after = await entity(client, requirementId);
    expect(after).toMatchObject({
      title: before.title,
      status: before.status,
      tags: before.tags,
      logic_claims: before.logic_claims,
    });
    expect(String(after.requires_predicate)).toContain(factId);
    expect(after.requires_property).toBeUndefined();
    expect(grounding?.factId).not.toBe(factId);
    const predicate = await entity(client, factId);
    expect(predicate).toMatchObject({
      fact_kind: "predicate",
      predicate_name: "commit_action",
      claim_key: suggestion.claimKey,
    });
    const check = await client.ok("kb_check", {});
    expect(violationsFor(check, requirementId)).toEqual([]);
    expect(violationsFor(check, factId)).toEqual([]);
  }, 180_000);
});
