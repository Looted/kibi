import { describe, expect, test } from "bun:test";
import {
  type ChildProcess,
  execSync,
  spawn,
  spawnSync,
} from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  branchStorePath,
  ensureBranchStoreManifest,
} from "kibi-cli/public/branch-resolver";

// Read expected version from package.json to prevent drift
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageJsonPath = path.resolve(__dirname, "../package.json");
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8")) as {
  version?: string;
};
const EXPECTED_VERSION = packageJson.version ?? "0.1.0";
const HEAVY_TOOL_TIMEOUT_MS = 30000;

function syncRebuild(kibiBin: string, cwd: string): void {
  const result = spawnSync("node", [kibiBin, "sync", "--rebuild"], {
    cwd,
    encoding: "utf8",
  });
  if (result.error !== undefined) throw result.error;
  if (result.status === 0) return;
  throw new Error(
    [
      `sync --rebuild exited ${result.status ?? "without a status"}${result.signal ? ` (${result.signal})` : ""}`,
      result.stdout.trim() ? `stdout:\n${result.stdout.trim()}` : "",
      result.stderr.trim() ? `stderr:\n${result.stderr.trim()}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
  );
}

async function sendRequest(
  proc: ChildProcess,
  request: Record<string, unknown>,
  timeoutMs = 15000,
): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    let responseData = "";

    const parseJson = (value: string): Record<string, unknown> | null => {
      try {
        return JSON.parse(value) as Record<string, unknown>;
      } catch {
        return null;
      }
    };

    const onData = (chunk: Buffer) => {
      responseData += chunk.toString();
      const lines = responseData.split("\n");

      for (let i = 0; i < lines.length - 1; i++) {
        const line = lines[i]?.trim();
        if (!line) {
          continue;
        }

        const response = parseJson(line);
        if (response) {
          responseData = lines.slice(i + 1).join("\n");
          proc.stdout?.off("data", onData);
          resolve(response);
          return;
        }
      }

      const fallback = parseJson(responseData.trim());
      if (fallback) {
        responseData = "";
        proc.stdout?.off("data", onData);
        resolve(fallback);
      }
    };

    proc.stdout?.on("data", onData);

    // Write request
    proc.stdin?.write(`${JSON.stringify(request)}\n`);

    setTimeout(() => {
      proc.stdout?.off("data", onData);
      reject(new Error("Request timeout"));
    }, timeoutMs);
  });
}

function startServer(options?: {
  cwd?: string;
  env?: Record<string, string>;
  args?: string[];
}): ChildProcess {
  const serverPath = path.resolve(import.meta.dir, "../bin/kibi-mcp");
  const proc = spawn("bun", ["run", serverPath, ...(options?.args ?? [])], {
    stdio: ["pipe", "pipe", "pipe"],
    cwd: options?.cwd,
    env: options?.env ? { ...process.env, ...options.env } : process.env,
  });

  // Log errors from the server process
  proc.on("error", (err) => {
    console.error("Server process error:", err);
  });

  // Ensure the server process is killed when the parent process exits
  const cleanup = () => {
    if (!proc.killed) {
      proc.kill("SIGKILL");
    }
  };
  process.on("exit", cleanup);
  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);

  return proc;
}

function writeEmptyKbSnapshot(branchKbPath: string): void {
  fs.mkdirSync(path.join(branchKbPath, "journal"), { recursive: true });
  fs.writeFileSync(
    path.join(branchKbPath, "kb.rdf"),
    `<?xml version="1.0" encoding="UTF-8"?>
<rdf:RDF
  xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
  xmlns:kb="urn-kibi:"
  xmlns:xsd="http://www.w3.org/2001/XMLSchema#">
</rdf:RDF>
`,
  );
  fs.writeFileSync(path.join(branchKbPath, "kb.rdf.lock"), "");
}

async function killServer(proc: ChildProcess): Promise<void> {
  return new Promise((resolve) => {
    if (proc.killed || !proc.pid) {
      resolve();
      return;
    }

    // Register exit/error handlers before sending SIGTERM to avoid a race
    // where the process exits before the handler is attached.
    const forceKillTimeout = setTimeout(() => {
      if (!proc.killed) {
        proc.kill("SIGKILL");
      }
    }, 1000);

    proc.on("exit", () => {
      clearTimeout(forceKillTimeout);
      resolve();
    });

    proc.on("error", () => {
      clearTimeout(forceKillTimeout);
      resolve();
    });

    // Try graceful termination after handlers are registered
    proc.kill("SIGTERM");
  });
}

// Freshness detection is best-effort and can briefly race the filesystem, so
// poll for the expected status state instead of asserting on a single call.
// A persistent mismatch still fails via the returned last observed state.
async function waitForStatusState(
  proc: ChildProcess,
  expected: { dirty: boolean; syncState: string },
  timeoutMs = 10_000,
  intervalMs = 300,
): Promise<Record<string, unknown> | undefined> {
  const deadline = Date.now() + timeoutMs;
  let last: Record<string, unknown> | undefined;
  do {
    const response = await sendRequest(proc, {
      jsonrpc: "2.0",
      id: 2_000,
      method: "tools/call",
      params: {
        name: "kb_status",
        arguments: {},
      },
    });
    const result = response.result as Record<string, unknown> | undefined;
    const envelope = result?.structuredContent as
      | Record<string, unknown>
      | undefined;
    const structured = (
      envelope?.kibiProtocol === 1 ? envelope.data : envelope
    ) as Record<string, unknown> | undefined;
    last = structured;
    if (
      structured?.dirty === expected.dirty &&
      structured?.syncState === expected.syncState
    ) {
      return structured;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  } while (Date.now() < deadline);
  return last;
}

describe("MCP Server", () => {
  test("should parse valid JSON-RPC request", async () => {
    const proc = startServer();

    const response = await sendRequest(proc, {
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "test", version: "1.0" },
      },
    });

    expect(response.jsonrpc).toBe("2.0");
    expect(response.id).toBe(1);
    expect(response.result).toBeDefined();

    await killServer(proc);
  });

  test("should handle initialize request", async () => {
    const proc = startServer();

    const response = await sendRequest(proc, {
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "test", version: "1.0" },
      },
    });

    const result = response.result as Record<string, unknown>;
    expect(result.protocolVersion).toBe("2024-11-05");
    expect(result.serverInfo).toBeDefined();
    expect((result.serverInfo as Record<string, unknown>).name).toBe(
      "kibi-mcp",
    );
    expect((result.serverInfo as Record<string, unknown>).version).toBe(
      EXPECTED_VERSION,
    );
    expect(result.capabilities).toBeDefined();

    await killServer(proc);
  });

  test("should handle notifications/initialized", async () => {
    const proc = startServer();

    await sendRequest(proc, {
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "test", version: "1.0" },
      },
    });

    proc.stdin?.write(
      `${JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" })}\n`,
    );

    await new Promise((resolve) => setTimeout(resolve, 1000));

    await killServer(proc);
  });

  test("should handle tools/list request", async () => {
    const proc = startServer();

    // Initialize first
    await sendRequest(proc, {
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "test", version: "1.0" },
      },
    });

    // Request tools list
    const response = await sendRequest(proc, {
      jsonrpc: "2.0",
      id: 2,
      method: "tools/list",
    });

    const result = response.result as Record<string, unknown>;
    expect(result.tools).toBeDefined();
    const tools = result.tools as Array<Record<string, unknown>>;
    expect(tools.length).toBe(21);
    expect(tools.map((tool) => tool.name)).toEqual([
      "kb_query",
      "kb_search",
      "kb_status",
      "kb_skills_list",
      "kb_skills_load",
      "kb_skills_read",
      "kb_find_gaps",
      "kb_coverage",
      "kb_graph",
      "kb_sparql_remote",
      "kb_semantic_advisor",
      "kb_upsert",
      "kb_validate_upsert",
      "kb_delete",
      "kb_check",
      "kb_model_requirement",
      "kb_suggest_predicates",
      "kb_autopilot_generate",
      "kb_compile_intent",
      "kb_apply_plan",
      "kb_ingest_verification",
    ]);
    expect(tools.map((tool) => tool.name)).not.toContain(
      "kb_briefing_generate",
    );

    const kbUpsert = tools.find((tool) => tool.name === "kb_upsert");
    const statusSchema = (
      (kbUpsert?.inputSchema as Record<string, unknown>)?.properties as Record<
        string,
        unknown
      >
    )?.properties as Record<string, unknown> | undefined;
    const nestedStatus = (statusSchema?.properties as Record<string, unknown>)
      ?.status as Record<string, unknown> | undefined;
    expect(nestedStatus?.type).toBe("string");
    expect(nestedStatus?.anyOf).toBeUndefined();

    await killServer(proc);
  });

  test("should handle prompts/list request", async () => {
    const proc = startServer();

    // Initialize first
    await sendRequest(proc, {
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "test", version: "1.0" },
      },
    });

    // Request prompts list
    const response = await sendRequest(proc, {
      jsonrpc: "2.0",
      id: 2,
      method: "prompts/list",
    });

    const result = response.result as Record<string, unknown>;
    expect(result.prompts).toBeDefined();
    const prompts = result.prompts as Array<Record<string, unknown>>;
    expect(prompts.length).toBeGreaterThanOrEqual(1);

    // Check that public prompts are included
    const initKibiPrompt = prompts.find((p) => p.name === "init-kibi");
    expect(initKibiPrompt).toBeDefined();
    expect(initKibiPrompt?.description).toBeDefined();
    expect(typeof initKibiPrompt?.description).toBe("string");
    expect(initKibiPrompt?.description).toMatch(
      /interactive activation|new or empty/i,
    );
    expect(prompts.map((prompt) => prompt.name)).not.toContain("brief-kibi");

    await killServer(proc);
  });

  test("should handle prompts/get for init-kibi", async () => {
    const proc = startServer();

    // Initialize first
    await sendRequest(proc, {
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "test", version: "1.0" },
      },
    });

    // Get init-kibi prompt
    const response = await sendRequest(proc, {
      jsonrpc: "2.0",
      id: 2,
      method: "prompts/get",
      params: {
        name: "init-kibi",
      },
    });

    const result = response.result as Record<string, unknown>;
    expect(result).toBeDefined();

    // Check that response contains expected content
    const messages = result.messages as Array<Record<string, unknown>>;
    expect(messages).toBeDefined();
    expect(messages.length).toBeGreaterThan(0);

    // Extract content from messages
    const contentText = messages
      .map((msg) => {
        const content = msg.content as
          | { type: string; text: string }
          | undefined;
        return content?.text || "";
      })
      .join(" ");

    // Assert that content mentions expected public tools
    expect(contentText).toMatch(/kb_autopilot_generate/);
    expect(contentText).toMatch(/kb_upsert/);
    expect(contentText).toMatch(/kb_check/);
    expect(contentText).toMatch(/Project Summary/);
    expect(contentText).toMatch(/Source of Truth/);
    expect(contentText).toMatch(/post-hoc/i);
    expect(contentText).toMatch(/read-only/);

    // Assert that content mentions activation workflow concepts
    expect(contentText).toMatch(/(activationState|activation|approval)/i);

    // Assert that content does NOT mention non-public tools
    expect(contentText).not.toMatch(/kb_query_relationships/);
    expect(contentText).not.toMatch(/kb_branch_gc/);
    expect(contentText).not.toMatch(/kb_list_entity_types/);

    await killServer(proc);
  });

  test("should reject prompts/get for removed brief-kibi prompt", async () => {
    const proc = startServer();

    await sendRequest(proc, {
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "test", version: "1.0" },
      },
    });

    const response = await sendRequest(proc, {
      jsonrpc: "2.0",
      id: 2,
      method: "prompts/get",
      params: {
        name: "brief-kibi",
      },
    });

    const error = response.error as Record<string, unknown> | undefined;
    expect(error).toBeDefined();
    expect(String(error?.message ?? "")).toMatch(/not found|unknown prompt/i);

    await killServer(proc);
  });

  test(
    "should handle tools/call for kb_autopilot_generate",
    async () => {
      const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-mcp-auto-"));
      const kibiBin = path.resolve(import.meta.dir, "../../cli/bin/kibi");

      execSync("git init -b main", { cwd: tempRoot, stdio: "ignore" });
      execSync('git config user.email "test@example.com"', {
        cwd: tempRoot,
        stdio: "ignore",
      });
      execSync('git config user.name "Kibi Test"', {
        cwd: tempRoot,
        stdio: "ignore",
      });
      execSync(`bun ${kibiBin} init --no-hooks`, {
        cwd: tempRoot,
        stdio: "ignore",
      });

      const proc = startServer({
        cwd: tempRoot,
        env: { KIBI_WORKSPACE: tempRoot },
      });

      try {
        await sendRequest(proc, {
          jsonrpc: "2.0",
          id: 1,
          method: "initialize",
          params: {
            protocolVersion: "2024-11-05",
            capabilities: {},
            clientInfo: { name: "test", version: "1.0" },
          },
        });

        const response = await sendRequest(
          proc,
          {
            jsonrpc: "2.0",
            id: 2,
            method: "tools/call",
            params: {
              name: "kb_autopilot_generate",
              arguments: {},
            },
          },
          HEAVY_TOOL_TIMEOUT_MS,
        );

        const result = response.result as Record<string, unknown>;
        expect(result).toBeDefined();
        expect(result.isError).toBeFalsy();

        const content = result.content as Array<{ type: string; text: string }>;
        expect(content).toBeDefined();
        expect(content.length).toBeGreaterThan(0);
        expect(content[0].type).toBe("text");

        const envelope = result.structuredContent as Record<string, unknown>;
        const structured = (
          envelope.kibiProtocol === 1 ? envelope.data : envelope
        ) as Record<string, unknown>;
        expect(structured).toBeDefined();
        expect([
          "root_uninitialized",
          "root_partial",
          "vendored_only",
          "root_active_thin",
          "root_active_seeded",
        ]).toContain(structured.activationState as string);
        expect(typeof structured.activationReason).toBe("string");
        expect(typeof structured.applyBlocked).toBe("boolean");
        expect([
          "cold_start_bootstrap",
          "repair_bootstrap",
          "attached_thin_handoff",
          "attached_seeded_handoff",
          "vendored_blocked",
        ]).toContain(structured.bootstrapMode as string);
        expect(typeof structured.tldr).toBe("string");
        expect(typeof structured.promptBlock).toBe("string");
        expect(typeof structured.confidence).toBe("object");
        expect(typeof structured.declaredContext).toBe("object");
        expect(Array.isArray(structured.recommendedActions)).toBe(true);
        expect(Array.isArray(structured.candidates)).toBe(true);
        expect(Array.isArray(structured.suppressedCandidates)).toBe(true);
        expect(typeof structured.discoverySummary).toBe("object");
        expect(typeof structured.payoffSummary).toBe("object");

        expect(result.candidates).toEqual(structured.candidates);
        expect(result.suppressedCandidates).toEqual(
          structured.suppressedCandidates,
        );
        expect(result.payoffSummary).toEqual(structured.payoffSummary);
      } finally {
        await killServer(proc);
        spawnSync(process.execPath, [kibiBin, "engine", "stop"], {
          cwd: tempRoot,
          encoding: "utf8",
        });
        fs.rmSync(tempRoot, { recursive: true, force: true });
      }
    },
    HEAVY_TOOL_TIMEOUT_MS,
  );

  // executable_for TEST-test-journaled-engine-harness
  test(
    "should handle tools/call for kb_model_requirement",
    async () => {
      const tempRoot = fs.mkdtempSync(
        path.join(os.tmpdir(), "kibi-mcp-model-"),
      );
      const kibiBin = path.resolve(import.meta.dir, "../../cli/bin/kibi");
      execSync("git init -b main", { cwd: tempRoot, stdio: "ignore" });
      execSync(`bun ${kibiBin} init --no-hooks`, {
        cwd: tempRoot,
        stdio: "ignore",
      });
      const proc = startServer({
        cwd: tempRoot,
        env: { KIBI_WORKSPACE: tempRoot },
      });

      try {
        await sendRequest(proc, {
          jsonrpc: "2.0",
          id: 1,
          method: "initialize",
          params: {
            protocolVersion: "2024-11-05",
            capabilities: {},
            clientInfo: { name: "test", version: "1.0" },
          },
        });

        const response = await sendRequest(
          proc,
          {
            jsonrpc: "2.0",
            id: 2,
            method: "tools/call",
            params: {
              name: "kb_model_requirement",
              arguments: {
                text: "Customer data must be retained for 7 years.",
                source: ".kb/requirements/customer-retention.md",
                confidence: 0.92,
                subjectKey: "Customer.Data",
                propertyKey: "Retention Years",
                operator: "eq",
                value: 7,
                provenance:
                  ".kb/requirements/customer-retention.md#L1",
              },
            },
          },
          HEAVY_TOOL_TIMEOUT_MS,
        );

        const result = response.result as Record<string, unknown>;
        expect(result).toBeDefined();
        expect(result.isError).toBeFalsy();

        const content = result.content as Array<{ type: string; text: string }>;
        expect(content).toBeDefined();
        expect(content.length).toBeGreaterThan(0);
        expect(content[0]?.type).toBe("text");

        const envelope = result.structuredContent as Record<string, unknown>;
        const structured = (
          envelope.kibiProtocol === 1 ? envelope.data : envelope
        ) as Record<string, unknown>;
        expect(structured).toBeDefined();
        expect(structured.isStrict).toBe(true);
        expect(Array.isArray(structured.applyPlan)).toBe(true);
        expect((structured.applyPlan as unknown[]).length).toBe(3);
        expect(typeof structured.writeSet).toBe("object");
        expect(typeof structured.claim).toBe("object");
        expect(
          [null, expect.any(String)].some((matcher) =>
            matcher === null
              ? structured.migrationWarning === null
              : typeof structured.migrationWarning === "string",
          ),
        ).toBe(true);
      } finally {
        await killServer(proc);
        spawnSync(process.execPath, [kibiBin, "engine", "stop"], {
          cwd: tempRoot,
          encoding: "utf8",
        });
        fs.rmSync(tempRoot, { recursive: true, force: true });
      }
    },
    HEAVY_TOOL_TIMEOUT_MS,
  );

  test(
    "should reject tools/call for removed kb_briefing_generate",
    async () => {
      const proc = startServer();

      await sendRequest(proc, {
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2024-11-05",
          capabilities: {},
          clientInfo: { name: "test", version: "1.0" },
        },
      });

      const response = await sendRequest(
        proc,
        {
          jsonrpc: "2.0",
          id: 2,
          method: "tools/call",
          params: {
            name: "kb_briefing_generate",
            arguments: {
              taskText:
                "Generate a task-aware citation-backed briefing for MCP registration work.",
            },
          },
        },
        HEAVY_TOOL_TIMEOUT_MS,
      );

      const result = response.result as Record<string, unknown> | undefined;
      expect(result?.isError).toBe(true);
      const content = result?.content as
        | Array<{ type: string; text: string }>
        | undefined;
      expect(content?.[0]?.text).toMatch(/not found/i);

      await killServer(proc);
    },
    HEAVY_TOOL_TIMEOUT_MS,
  );

  test("should reject removed MCP tools", async () => {
    const proc = startServer();

    await sendRequest(proc, {
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "test", version: "1.0" },
      },
    });

    const response = await sendRequest(proc, {
      jsonrpc: "2.0",
      id: 2,
      method: "tools/call",
      params: {
        name: "kb_branch_gc",
        arguments: { dry_run: true },
      },
    });

    // MCP SDK returns tool errors in result with isError flag, not as top-level error
    const result = response.result as Record<string, unknown> | undefined;
    expect(result?.isError).toBe(true);
    const content = result?.content as
      | Array<{ type: string; text: string }>
      | undefined;
    expect(content?.[0]?.text).toMatch(/not found/i);

    await killServer(proc);
  });

  test("should initialize from non-repo cwd with workspace override", async () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-mcp-"));
    const workspaceRoot = path.resolve(import.meta.dir, "../../..");
    const proc = startServer({
      cwd: tempRoot,
      env: { KIBI_WORKSPACE: workspaceRoot },
    });

    const response = await sendRequest(proc, {
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "test", version: "1.0" },
      },
    });

    expect(response.jsonrpc).toBe("2.0");
    expect(response.id).toBe(1);
    expect(response.result).toBeDefined();

    await killServer(proc);
    fs.rmSync(tempRoot, { recursive: true, force: true });
  });

  test("should auto-create branch KB for active branch before first tool call", async () => {
    const tempRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), "kibi-mcp-branch-init-"),
    );

    execSync("git init -b main", { cwd: tempRoot, stdio: "ignore" });
    execSync('git config user.email "test@example.com"', {
      cwd: tempRoot,
      stdio: "ignore",
    });
    execSync('git config user.name "Kibi Test"', {
      cwd: tempRoot,
      stdio: "ignore",
    });
    fs.writeFileSync(path.join(tempRoot, "README.md"), "test\n");
    execSync("git add README.md", { cwd: tempRoot, stdio: "ignore" });
    execSync('git commit -m "init"', { cwd: tempRoot, stdio: "ignore" });
    execSync("git checkout -b develop", { cwd: tempRoot, stdio: "ignore" });
    execSync("git checkout -b feature-auto-ensure", {
      cwd: tempRoot,
      stdio: "ignore",
    });

    const developKb = branchStorePath(tempRoot, "develop");
    ensureBranchStoreManifest(tempRoot, "develop");
    writeEmptyKbSnapshot(developKb);

    const proc = startServer({
      cwd: tempRoot,
      env: { KIBI_WORKSPACE: tempRoot },
    });

    try {
      await sendRequest(proc, {
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2024-11-05",
          capabilities: {},
          clientInfo: { name: "test", version: "1.0" },
        },
      });

      const response = await sendRequest(proc, {
        jsonrpc: "2.0",
        id: 2,
        method: "tools/call",
        params: {
          name: "kb_query",
          arguments: { type: "req" },
        },
      });

      expect(response.error).toBeUndefined();
      expect(
        fs.existsSync(branchStorePath(tempRoot, "feature-auto-ensure")),
      ).toBe(true);
    } finally {
      await killServer(proc);
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  test("should return error for invalid method", async () => {
    const proc = startServer();

    await sendRequest(proc, {
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "test", version: "1.0" },
      },
    });

    const response = await sendRequest(proc, {
      jsonrpc: "2.0",
      id: 2,
      method: "invalid_method",
    });

    expect(response.error).toBeDefined();
    const error = response.error as Record<string, unknown>;
    expect(error.code).toBe(-32601); // METHOD_NOT_FOUND
    expect(error.message).toContain("Method not found");

    await killServer(proc);
  });

  test("should handle mixed kb_query/kb_check/kb_upsert/kb_delete burst without timeouts", async () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-mcp-burst-"));

    execSync("git init -b main", { cwd: tempRoot, stdio: "ignore" });
    execSync('git config user.email "test@example.com"', {
      cwd: tempRoot,
      stdio: "ignore",
    });
    execSync('git config user.name "Kibi Test"', {
      cwd: tempRoot,
      stdio: "ignore",
    });
    fs.writeFileSync(path.join(tempRoot, "README.md"), "test\n");
    execSync("git add README.md", { cwd: tempRoot, stdio: "ignore" });
    execSync('git commit -m "init"', { cwd: tempRoot, stdio: "ignore" });
    execSync("git checkout -b develop", { cwd: tempRoot, stdio: "ignore" });

    const developKb = branchStorePath(tempRoot, "develop");
    ensureBranchStoreManifest(tempRoot, "develop");
    writeEmptyKbSnapshot(developKb);

    const proc = startServer({ cwd: tempRoot });

    try {
      await sendRequest(
        proc,
        {
          jsonrpc: "2.0",
          id: 1,
          method: "initialize",
          params: {
            protocolVersion: "2024-11-05",
            capabilities: {},
            clientInfo: { name: "test", version: "1.0" },
          },
        },
        30000,
      );

      for (let i = 0; i < 12; i++) {
        const upsertId = `REQ-BURST-${i}`;
        const upsert = await sendRequest(
          proc,
          {
            jsonrpc: "2.0",
            id: 10_000 + i,
            method: "tools/call",
            params: {
              name: "kb_upsert",
              arguments: {
                type: "req",
                id: upsertId,
                properties: {
                  title: `Burst ${i}`,
                  status: "open",
                },
                document: {
                  path: `.kb/requirements/${upsertId}.md`,
                },
              },
            },
          },
          30000,
        );
        expect(upsert.error).toBeUndefined();
        const upsertResult = upsert.result as
          | Record<string, unknown>
          | undefined;
        expect(upsertResult?.isError).not.toBe(true);

        const queryById = await sendRequest(
          proc,
          {
            jsonrpc: "2.0",
            id: 20_000 + i,
            method: "tools/call",
            params: {
              name: "kb_query",
              arguments: { id: upsertId },
            },
          },
          30000,
        );
        expect(queryById.error).toBeUndefined();

        const queryByType = await sendRequest(
          proc,
          {
            jsonrpc: "2.0",
            id: 30_000 + i,
            method: "tools/call",
            params: {
              name: "kb_query",
              arguments: { type: "req", limit: 2 },
            },
          },
          30000,
        );
        expect(queryByType.error).toBeUndefined();

        const check = await sendRequest(
          proc,
          {
            jsonrpc: "2.0",
            id: 40_000 + i,
            method: "tools/call",
            params: {
              name: "kb_check",
              arguments: {},
            },
          },
          30000,
        );
        expect(check.error).toBeUndefined();

        const del = await sendRequest(
          proc,
          {
            jsonrpc: "2.0",
            id: 50_000 + i,
            method: "tools/call",
            params: {
              name: "kb_delete",
              arguments: { ids: [upsertId] },
            },
          },
          30000,
        );
        expect(del.error).toBeUndefined();
      }
    } finally {
      await killServer(proc);
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  }, 180000);

  test("should let kb_status observe MCP writes in the same server session", async () => {
    const tempRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), "kibi-mcp-status-live-"),
    );
    const kibiBin = path.resolve(import.meta.dir, "../../cli/bin/kibi");

    execSync("git init -b main", { cwd: tempRoot, stdio: "ignore" });
    execSync('git config user.email "test@example.com"', {
      cwd: tempRoot,
      stdio: "ignore",
    });
    execSync('git config user.name "Kibi Test"', {
      cwd: tempRoot,
      stdio: "ignore",
    });
    execSync(`bun ${kibiBin} init --no-hooks`, {
      cwd: tempRoot,
      stdio: "ignore",
    });
    fs.mkdirSync(path.join(tempRoot, "documentation", "requirements"), {
      recursive: true,
    });
    fs.writeFileSync(
      path.join(tempRoot, "documentation", "requirements", "REQ-LIVE-BASE.md"),
      "---\nid: REQ-LIVE-BASE\ntitle: Live session baseline\nstatus: open\n---\n",
    );
    execSync(`bun ${kibiBin} sync`, {
      cwd: tempRoot,
      stdio: "ignore",
    });

    const proc = startServer({ cwd: tempRoot });

    try {
      await sendRequest(proc, {
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2024-11-05",
          capabilities: {},
          clientInfo: { name: "test", version: "1.0" },
        },
      });
      proc.stdin?.write(
        `${JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" })}\n`,
      );

      // Let the session settle to a clean baseline. Freshness detection can
      // briefly race the filesystem after sync, so poll rather than assert on a
      // single call. The authoritative assertion below verifies the write is
      // observed by the same session.
      await waitForStatusState(proc, {
        dirty: false,
        syncState: "fresh",
      });

      fs.writeFileSync(
        path.join(tempRoot, "documentation", "requirements", "REQ-LIVE-001.md"),
        "---\nid: REQ-LIVE-001\ntitle: Live session status\nstatus: open\n---\n",
      );

      const afterStructured = await waitForStatusState(proc, {
        dirty: true,
        syncState: "stale",
      });
      expect(afterStructured?.dirty).toBe(true);
      expect(afterStructured?.syncState).toBe("stale");
    } finally {
      await killServer(proc);
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  }, 30000);

  test("should create usage.log when --diagnostic-mode is enabled", async () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-mcp-diag-"));
    const repoDir = path.join(tempRoot, "repo");
    fs.mkdirSync(repoDir, { recursive: true });

    // Initialize git repo and kibi
    execSync("git init -b main", { cwd: repoDir, stdio: "pipe" });
    execSync("git config user.email test@test.com", {
      cwd: repoDir,
      stdio: "pipe",
    });
    execSync("git config user.name Test", { cwd: repoDir, stdio: "pipe" });

    const serverPath = path.resolve(import.meta.dir, "../bin/kibi-mcp");
    const proc = spawn("bun", ["run", serverPath, "--diagnostic-mode"], {
      stdio: ["pipe", "pipe", "pipe"],
      cwd: repoDir,
      env: process.env,
    });

    try {
      // Initialize server
      await sendRequest(
        proc,
        {
          jsonrpc: "2.0",
          id: 1,
          method: "initialize",
          params: {
            protocolVersion: "2024-11-05",
            capabilities: {},
            clientInfo: { name: "test", version: "1.0" },
          },
        },
        30000,
      );

      // Send initialized notification
      proc.stdin?.write(
        `${JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" })}\n`,
      );

      // Initialize kibi via CLI
      execSync(
        `node ${path.resolve(import.meta.dir, "../../cli/bin/kibi")} init`,
        {
          cwd: repoDir,
          env: process.env,
        },
      );

      // Call kb_query with diagnostic telemetry
      await sendRequest(
        proc,
        {
          jsonrpc: "2.0",
          id: 2,
          method: "tools/call",
          params: {
            name: "kb_query",
            arguments: {
              type: "req",
              _diagnostic_telemetry: {
                is_autonomous: true,
                reasoning: "Testing diagnostic mode",
                confidence_score: 0.95,
              },
            },
          },
        },
        30000,
      );

      // Give filesystem time to flush
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Verify usage.log was created
      const usageLogPath = path.join(repoDir, ".kb", "usage.log");
      expect(fs.existsSync(usageLogPath)).toBe(true);

      // Verify usage.log contains our tool call
      const logContent = fs.readFileSync(usageLogPath, "utf8");
      expect(logContent).toContain("kb_query");
      expect(logContent).toContain("success");

      // Verify telemetry was logged
      const lines = logContent.trim().split("\n");
      const lastLine = JSON.parse(lines[lines.length - 1]);
      expect(lastLine.tool).toBe("kb_query");
      expect(lastLine.telemetry).toBeDefined();
      expect(lastLine.telemetry.is_autonomous).toBe(true);
      expect(lastLine.telemetry_status).toBe("provided");
      expect(lastLine.result_count).toBe(0);
      expect(lastLine.zero_results).toBe(true);
      expect(typeof lastLine.result_summary).toBe("string");
    } finally {
      await killServer(proc);
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  }, 60000);

  test("should see fresh data after external sync rebuild without restart (refreshes after external sync rebuild)", async () => {
    const tempRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), "kibi-mcp-refresh-"),
    );

    // Initialize git repo
    execSync("git init -b main", { cwd: tempRoot, stdio: "ignore" });
    execSync('git config user.email "test@example.com"', {
      cwd: tempRoot,
      stdio: "ignore",
    });
    execSync('git config user.name "Kibi Test"', {
      cwd: tempRoot,
      stdio: "ignore",
    });
    fs.writeFileSync(path.join(tempRoot, "README.md"), "test\n");
    execSync("git add README.md", { cwd: tempRoot, stdio: "ignore" });
    execSync('git commit -m "init"', { cwd: tempRoot, stdio: "ignore" });
    execSync("git checkout -b develop", { cwd: tempRoot, stdio: "ignore" });

    const kibiBin = path.resolve(import.meta.dir, "../../cli/bin/kibi");
    execSync(`node ${kibiBin} init --no-hooks`, {
      cwd: tempRoot,
      stdio: "ignore",
    });
    const requirementsDir = path.join(
      tempRoot,
      "documentation",
      "requirements",
    );
    fs.mkdirSync(requirementsDir, { recursive: true });
    const staleRequirement = path.join(
      requirementsDir,
      "REQ-stale-before-rebuild.md",
    );
    fs.writeFileSync(
      staleRequirement,
      "---\nid: REQ-stale-before-rebuild\ntitle: Stale requirement\nstatus: open\n---\n",
    );
    execSync("git add documentation", { cwd: tempRoot, stdio: "ignore" });
    syncRebuild(kibiBin, tempRoot);

    const proc = startServer({ cwd: tempRoot });
    const pidBefore = proc.pid;

    try {
      // Initialize MCP session
      await sendRequest(proc, {
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2024-11-05",
          capabilities: {},
          clientInfo: { name: "test", version: "1.0" },
        },
      });
      proc.stdin?.write(
        `${JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" })}\n`,
      );

      // Query: confirm stale entity is visible
      const before = await sendRequest(
        proc,
        {
          jsonrpc: "2.0",
          id: 2,
          method: "tools/call",
          params: {
            name: "kb_query",
            arguments: { id: "REQ-stale-before-rebuild" },
          },
        },
        HEAVY_TOOL_TIMEOUT_MS,
      );

      expect(before.error).toBeUndefined();
      const beforeResult = before.result as Record<string, unknown>;
      expect(beforeResult.isError).toBeFalsy();
      const beforeContent = beforeResult.content as Array<{
        type: string;
        text: string;
      }>;
      expect(beforeContent[0]?.text).toContain("REQ-stale-before-rebuild");

      // Publish a replacement generation through the CLI. The rebuild stops
      // the old writer and atomically switches CURRENT; the MCP process stays
      // alive and reconnects to the new engine on its next request.
      fs.rmSync(staleRequirement);
      fs.writeFileSync(
        path.join(requirementsDir, "REQ-fresh-after-rebuild.md"),
        "---\nid: REQ-fresh-after-rebuild\ntitle: Fresh requirement\nstatus: open\n---\n",
      );
      execSync("git add documentation", { cwd: tempRoot, stdio: "ignore" });
      syncRebuild(kibiBin, tempRoot);

      // Query SAME process again — must see fresh data
      const after = await sendRequest(
        proc,
        {
          jsonrpc: "2.0",
          id: 3,
          method: "tools/call",
          params: {
            name: "kb_query",
            arguments: { type: "req" },
          },
        },
        HEAVY_TOOL_TIMEOUT_MS,
      );

      expect(after.error).toBeUndefined();
      const afterResult = after.result as Record<string, unknown>;
      expect(afterResult.isError).toBeFalsy();
      const afterContent = afterResult.content as Array<{
        type: string;
        text: string;
      }>;

      // Fresh entity is visible
      expect(afterContent[0]?.text).toContain("REQ-fresh-after-rebuild");

      // Stale entity is no longer returned by the fresh KB
      expect(afterContent[0]?.text).not.toContain("REQ-stale-before-rebuild");

      // Same process (no restart)
      expect(proc.pid).toBe(pidBefore);
      expect(proc.killed).toBe(false);

      // No Prolog crash string in any response
      const allResponses = [before, after];
      for (const resp of allResponses) {
        const text = JSON.stringify(resp);
        expect(text).not.toContain("Unknown option");
      }
    } finally {
      await killServer(proc);
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  }, 60000);
});
