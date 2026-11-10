// implements REQ-kibi-telemetry-expected-outcomes
import { afterEach, describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  TELEMETRY_EVENT_VERSION,
  flushTelemetry,
  recordOperationTelemetry,
  telemetryErrorClass,
  telemetryOutcome,
} from "../src/usage-telemetry";

const temporaryRoots: string[] = [];

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

function enabledEnv(): NodeJS.ProcessEnv {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-outcomes-"));
  temporaryRoots.push(directory);
  return { KIBI_TELEMETRY_DIR: directory, KIBI_TELEMETRY: "1" };
}

async function sentOperations(
  env: NodeJS.ProcessEnv,
): Promise<Record<string, unknown>[]> {
  const batches: { batch: { properties: Record<string, unknown> }[] }[] = [];
  const fetchImpl = (async (_url: string, init?: RequestInit) => {
    batches.push(JSON.parse(String(init?.body)));
    return new Response("{}", { status: 200 });
  }) as unknown as typeof fetch;
  await flushTelemetry({ force: true, fetchImpl }, env);
  return batches.flatMap((body) => body.batch.map((event) => event.properties));
}

const SOURCE = { packageName: "kibi-cli", packageVersion: "1.0.0" };

describe("expected outcomes are rejections, not errors", () => {
  test("success stays success whatever the category", () => {
    expect(telemetryOutcome("success", undefined)).toBe("success");
    expect(telemetryOutcome("success", "check_violations")).toBe("success");
  });

  test("a failure without a category is an error", () => {
    expect(telemetryOutcome("error", undefined)).toBe("error");
    expect(telemetryOutcome("error", null)).toBe("error");
    expect(telemetryOutcome("error", "")).toBe("error");
  });

  test("answers Kibi gives on purpose are rejections", () => {
    for (const category of [
      "bootstrap_plan_rejected",
      "check_violations",
      "coarse_symbol_linkage",
      "conflicting_input",
      "entity_not_found",
      "entity_validation_failed",
      "firm_decision_locked",
      "generated_artifacts_stale",
      "incomplete_propositions",
      "input_read_failed",
      "integration_failed",
      "invalid_project_config",
      "invalid_relationship",
      "legacy_branch_storage",
      "migration_plan_refused",
      "missing_input",
      "query_limit_exceeded",
      "relationship_source_mismatch",
      "relationship_validation_failed",
      "semantic_contradiction",
      "symbol_granularity_violation",
      "tests_failed",
      "uncompiled_source",
      "unknown_operation",
      "upsert_dry_run_invalid",
      "validation_failed",
      "doctor:git_hooks",
      "doctor:branch_store+capability_plugins",
      "migrate:plan_hash_changed",
      "pending_source_hash_drift",
      "pending_source_missing",
    ]) {
      expect([category, telemetryOutcome("error", category)]).toEqual([
        category,
        "rejected",
      ]);
    }
  });

  test("faults stay errors", () => {
    for (const category of [
      "operation_failed",
      "uncaught_error",
      "handler_error",
      "tool_timeout",
      "prolog_query_failed",
      "syncerror",
      "epipe",
      "stale_snapshot",
      "unclassified",
      "doctor",
      "xdoctor:git_hooks",
      "pending_sources",
    ]) {
      expect([category, telemetryOutcome("error", category)]).toEqual([
        category,
        "error",
      ]);
    }
  });
});

describe("error classes", () => {
  test("named error classes pass; plain errors, objects and odd names do not", () => {
    class SyncError extends Error {}
    expect(telemetryErrorClass(new TypeError("x"))).toBe("TypeError");
    expect(telemetryErrorClass(new SyncError("x"))).toBe("SyncError");
    expect(telemetryErrorClass(new Error("secret /home/alice"))).toBeNull();
    expect(
      telemetryErrorClass(
        new Error("Upsert execution failed: x", { cause: new TypeError("x") }),
      ),
    ).toBe("TypeError");
    expect(telemetryErrorClass({ message: "x" })).toBeNull();
    expect(telemetryErrorClass(Object.create(null))).toBeNull();
    expect(telemetryErrorClass("boom")).toBeNull();
    expect(telemetryErrorClass(null)).toBeNull();
    expect(telemetryErrorClass(undefined)).toBeNull();
    const oddName = { constructor: { name: "not an identifier" } };
    expect(telemetryErrorClass(oddName)).toBeNull();
    const longName = { constructor: { name: `E${"x".repeat(80)}` } };
    expect(telemetryErrorClass(longName)).toBeNull();
    const numberName = { constructor: { name: 42 } };
    expect(telemetryErrorClass(numberName)).toBeNull();
  });
});

describe("sent operation events", () => {
  test("carry the outcome, the event version and a class only for errors", async () => {
    const env = enabledEnv();
    const base = { interface: "cli" as const, durationMs: 5 };
    recordOperationTelemetry(
      SOURCE,
      {
        ...base,
        operation: "check",
        status: "error",
        errorCategory: "check_violations",
        errorClass: "KbRejection",
        exitCode: 1,
      },
      env,
    );
    recordOperationTelemetry(
      SOURCE,
      {
        ...base,
        operation: "sync",
        status: "error",
        errorCategory: "uncaught_error",
        errorClass: "SyncError",
      },
      env,
    );
    recordOperationTelemetry(
      SOURCE,
      {
        ...base,
        operation: "sync",
        status: "error",
        errorClass: "not a class",
      },
      env,
    );
    recordOperationTelemetry(
      SOURCE,
      { ...base, operation: "status", status: "success" },
      env,
    );
    const [check, crash, oddClass, ok] = await sentOperations(env);
    expect(check).toMatchObject({
      status: "rejected",
      error_category: "check_violations",
      error_class: null,
      telemetry_version: TELEMETRY_EVENT_VERSION,
    });
    expect(crash).toMatchObject({
      status: "error",
      error_category: "uncaught_error",
      error_class: "SyncError",
    });
    expect(oddClass).toMatchObject({
      status: "error",
      error_category: null,
      error_class: null,
    });
    expect(ok).toMatchObject({
      status: "success",
      error_category: null,
      error_class: null,
    });
    expect(TELEMETRY_EVENT_VERSION).toBe(2);
  });

  test("a free-text category is unclassified and stays an error", async () => {
    const env = enabledEnv();
    recordOperationTelemetry(
      SOURCE,
      {
        interface: "mcp",
        operation: "kb_upsert",
        status: "error",
        durationMs: 1,
        errorCategory: "Entity validation failed: id 'REQ-x'",
      },
      env,
    );
    const [event] = await sentOperations(env);
    expect(event).toMatchObject({
      status: "error",
      error_category: "unclassified",
    });
  });
});
