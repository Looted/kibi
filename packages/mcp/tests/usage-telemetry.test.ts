// implements REQ-kibi-anonymous-usage-telemetry
import { afterEach, describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { recordMcpToolTelemetry } from "../src/usage-telemetry";
import { restoreProcessEnv } from "./helpers/process-env.js";

const savedEnv = { ...process.env };
const temporaryRoots: string[] = [];

afterEach(() => {
  restoreProcessEnv(savedEnv);
  for (const root of temporaryRoots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

describe("MCP anonymous usage telemetry", () => {
  test("queues one summary event per tool call with the error category", () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-mcp-telem-"));
    temporaryRoots.push(directory);
    process.env.KIBI_TELEMETRY = "1";
    process.env.KIBI_TELEMETRY_DIR = directory;

    recordMcpToolTelemetry({
      operation: "kb_search",
      startedAt: new Date(),
      status: "success",
    });
    recordMcpToolTelemetry({
      operation: "kb_upsert",
      startedAt: new Date(),
      status: "error",
      error: new Error("stale_snapshot: /home/me/private/.kb was rebuilt"),
    });

    const text = fs.readFileSync(
      path.join(directory, "telemetry-queue.jsonl"),
      "utf8",
    );
    const events = text
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line));
    expect(events.map((event) => event.event)).toEqual([
      "kibi_operation",
      "kibi_operation",
    ]);
    expect(events[0].properties).toMatchObject({
      package: "kibi-mcp",
      interface: "mcp",
      operation: "kb_search",
      status: "success",
      error_category: null,
    });
    expect(events[1].properties).toMatchObject({
      operation: "kb_upsert",
      status: "error",
      error_category: "stale_snapshot",
    });
    expect(text).not.toContain("/home/me/private");
  });

  test("names a returned failure by its error code and the host by its client name", () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-mcp-telem-"));
    temporaryRoots.push(directory);
    for (const name of [
      "KIBI_HOST",
      "KIBI_MCP_HOST",
      "CLAUDECODE",
      "CURSOR_AGENT",
      "CODEX_SANDBOX",
      "CODEX_THREAD_ID",
      "GEMINI_CLI",
      "OPENCODE",
      "AI_AGENT",
    ]) {
      Reflect.deleteProperty(process.env, name);
    }
    process.env.KIBI_TELEMETRY = "1";
    process.env.KIBI_TELEMETRY_DIR = directory;

    recordMcpToolTelemetry({
      operation: "kb_validate_upsert",
      startedAt: new Date(),
      status: "error",
      clientName: "claude-code",
      result: {
        status: "error",
        error: { code: "UPSERT_DRY_RUN_INVALID", message: "REQ-secret" },
      },
    });
    recordMcpToolTelemetry({
      operation: "kb_status",
      startedAt: new Date(),
      status: "success",
      result: { status: "success" },
    });

    const text = fs.readFileSync(
      path.join(directory, "telemetry-queue.jsonl"),
      "utf8",
    );
    const [failed, passed] = text
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line).properties);
    expect(failed).toMatchObject({
      host: "claude-code",
      error_category: "upsert_dry_run_invalid",
    });
    expect(passed).toMatchObject({ host: "unknown", error_category: null });
    expect(text).not.toContain("REQ-secret");
  });

  // implements REQ-kibi-telemetry-expected-outcomes
  test("counts refusals as rejected and faults as errors with their class", () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-mcp-telem-"));
    temporaryRoots.push(directory);
    process.env.KIBI_TELEMETRY = "1";
    process.env.KIBI_TELEMETRY_DIR = directory;
    const call = (input: { error?: unknown; result?: unknown }) =>
      recordMcpToolTelemetry({
        operation: "kb_upsert",
        startedAt: new Date(),
        status: "error",
        ...input,
      });

    // A message the diagnostic classifier names keeps that name.
    call({ error: new Error("Entity validation failed: REQ-secret") });
    // A coded rejection the classifier cannot name is known by its code.
    call({
      error: Object.assign(new Error("Upsert of REQ-secret refused"), {
        code: "UNCOMPILED_SOURCE",
      }),
    });
    // A fault with a code and a class stays an error.
    call({
      error: Object.assign(new TypeError("open /home/me/x"), {
        code: "ENOENT",
      }),
    });
    // Nothing more specific than the handler fallback.
    call({ error: new Error("something broke at /home/me/y") });
    call({ error: { code: 42 } });
    call({ result: { status: "error" } });
    call({
      result: { status: "error", error: { code: "UPSERT_DRY_RUN_INVALID" } },
    });

    const text = fs.readFileSync(
      path.join(directory, "telemetry-queue.jsonl"),
      "utf8",
    );
    const outcomes = text
      .trim()
      .split("\n")
      .map((line) => {
        const { status, error_category, error_class } =
          JSON.parse(line).properties;
        return [status, error_category, error_class];
      });
    expect(outcomes).toEqual([
      ["rejected", "entity_validation_failed", null],
      ["rejected", "uncompiled_source", null],
      ["error", "enoent", "TypeError"],
      ["error", "handler_error", null],
      ["error", "handler_error", null],
      ["error", null, null],
      ["rejected", "upsert_dry_run_invalid", null],
    ]);
    expect(text).not.toContain("/home/me");
    expect(text).not.toContain("REQ-secret");
  });

  // implements REQ-kibi-telemetry-agent-signals
  test("derives struggle signals from the tool's arguments and result", () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-mcp-telem-"));
    temporaryRoots.push(directory);
    process.env.KIBI_TELEMETRY = "1";
    process.env.KIBI_TELEMETRY_DIR = directory;
    const args = {
      type: "req",
      id: "REQ-secret",
      relationships: [{ type: "relates_to", from: "REQ-secret", to: "REQ-y" }],
    };
    recordMcpToolTelemetry({
      operation: "kb_validate_upsert",
      startedAt: new Date(),
      status: "error",
      args,
      result: {
        status: "error",
        error: { code: "UPSERT_DRY_RUN_INVALID", message: "REQ-secret" },
        data: {
          valid: false,
          rejection: {
            code: "INCOMPLETE_PROPOSITIONS",
            issues: [
              { rule: "inventory_missing", field: "semantic_inventory" },
            ],
          },
        },
      },
    });
    recordMcpToolTelemetry({
      operation: "kb_search",
      startedAt: new Date(),
      status: "success",
      args: { query: "secret question" },
      result: { status: "success", data: { count: 7 } },
    });

    const text = fs.readFileSync(
      path.join(directory, "telemetry-queue.jsonl"),
      "utf8",
    );
    const [validate, search] = text
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line).properties);
    expect(validate).toMatchObject({
      status: "rejected",
      error_category: "upsert_dry_run_invalid",
      rejection_code: "incomplete_propositions",
      validation_rule: "inventory_missing",
      validation_field: "semantic_inventory",
      dry_run: true,
      relationship_count: "1",
      attempt: "1",
    });
    expect(search).toMatchObject({
      result_count: "6-10",
      abstained: false,
      search_repeat: false,
    });
    expect(text).not.toContain("REQ-secret");
    expect(text).not.toContain("secret question");
  });

  test("queues nothing when telemetry is off", () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-mcp-telem-"));
    temporaryRoots.push(directory);
    process.env.KIBI_TELEMETRY = "0";
    process.env.KIBI_TELEMETRY_DIR = directory;
    recordMcpToolTelemetry({
      operation: "kb_search",
      startedAt: new Date(),
      status: "success",
    });
    expect(fs.readdirSync(directory)).toEqual([]);
  });
});
