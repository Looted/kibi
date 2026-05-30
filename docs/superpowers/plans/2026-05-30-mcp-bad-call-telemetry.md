# MCP Bad Tool Call Telemetry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Capture diagnostic usage-log rows for malformed MCP requests, invalid tool calls, schema validation failures, and richer tool-handler errors so Kibi can learn what agents get wrong.

**Architecture:** Treat SDK-level `tools/call` rejection as the primary design problem, because invalid enum values, missing required args, and unknown tools can be rejected before `addTool()`'s wrapped handler starts. Keep the existing successful-call path in `packages/mcp/src/server/tools.ts`, introduce a small diagnostic failure recorder in `packages/mcp/src/diagnostics.ts`, and wire it into the narrowest verified SDK/request boundary for parsed tool-call failures. Handler-invoked errors remain `status: "error"` rows with richer diagnostic fields, while pre-handler/protocol failures get normalized `status: "bad_call"` rows with sanitized request context and MCP error classification when available.

**Tech Stack:** Bun test runner, TypeScript, `@modelcontextprotocol/sdk`, Zod validation through `jsonSchemaToZod`, existing `.kb/usage.log` JSONL diagnostic sink.

---

## Current Behavior Summary

- Diagnostic mode is enabled by `--diagnostic-mode`; `initializeDiagnosticMode()` writes usage rows to `.kb/usage.log` via `appendUsageLogLine()` (`packages/mcp/src/diagnostics.ts:23-72`).
- `_diagnostic_telemetry` is extracted from tool args and converted into summary fields by `extractToolCallPayload()` and `deriveDiagnosticFields()` (`packages/mcp/src/diagnostics.ts:119-176`).
- `addTool()` logs successful calls and handler-thrown errors after a wrapped handler starts (`packages/mcp/src/server/tools.ts:321-427`). Success rows include `telemetry_status`, result counts, branch, pid, timings; error rows currently include `status: "error"` and `error_message` but do not derive telemetry fields.
- `addTool()` currently calls `extractToolCallPayload(args)` before the non-object guard in diagnostic mode (`packages/mcp/src/server/tools.ts:321-326` before `330-334`), so direct non-object invocations can fail before useful bad-call telemetry is built.
- Transport parse/schema failures return JSON-RPC errors in `setupTransportHandlers()` (`packages/mcp/src/server/transport.ts:31-76`) but do not append usage-log rows. This layer sees stdin JSON/envelope errors, not reliably parsed `tools/call` params.
- Existing tests prove success/error handler logging and transport error responses in `packages/mcp/tests/server/tools-coverage.test.ts:522-658`, `packages/mcp/tests/server/transport.test.ts:160-258`, and diagnostic helper behavior in `packages/mcp/tests/diagnostics.test.ts:23-238`.

## Desired Event Shape

Bad-call rows should be JSONL entries appended through the same `appendUsageLogLine()` sink:

```ts
{
  timestamp: string,
  request_id: string | null,
  tool: string | null,
  status: "bad_call", // reserved for calls rejected before business handler execution
  bad_call_stage:
    | "transport_parse"
    | "invalid_request"
    | "unknown_tool"
    | "schema_validation"
    | "pre_handler_validation"
    | "handler_error",
  mcp_error_code: number | null,
  error_name: string,
  error_message: string,
  error_summary: string,
  telemetry: Record<string, unknown> | null,
  telemetry_status: "provided" | "missing" | "invalid" | "unavailable",
  business_args: Record<string, unknown> | null,
  raw_args_summary: {
    kind: "object" | "array" | "string" | "number" | "boolean" | "null" | "undefined" | "unknown",
    keys?: string[],
    byte_length?: number,
  },
  started_at?: string,
  finished_at: string,
  duration_ms?: number,
  prolog_pid?: number | null,
  active_branch?: string | null,
}
```

Sanitization rule: never log full malformed stdin, arbitrary raw payload strings, or full bad-call business args. For bad-call objects, prefer key lists, shallow value types, counts, and bounded string lengths. Only include allowlisted safe fields such as tool name, request id, and diagnostic telemetry; avoid logging `query`, `text`, `properties`, requirement prose, links, or user-supplied blobs. Handler errors may keep existing `business_args` behavior for backward compatibility, but new bad-call rows must use summaries by default.

## File Structure

- Modify `packages/mcp/src/diagnostics.ts`
  - Add bad-call telemetry types and helper functions.
  - Keep `appendUsageLogLine()` as the only persistence primitive.
- Modify `packages/mcp/src/server/tools.ts`
  - Use helper for wrapper-level pre-handler failures and handler errors.
  - Optionally expose a test-only or dependency-injected failure recorder if needed.
- Modify `packages/mcp/src/server/transport.ts`
  - Record only transport-level parse errors (`-32700`) and invalid JSON-RPC envelope/Zod errors (`-32600`) before sending the JSON-RPC error response.
- Possibly modify `packages/mcp/src/server.ts`
  - Only if transport needs dependency injection for the diagnostic recorder; prefer direct helper imports to minimize churn.
- Modify `packages/mcp/tests/diagnostics.test.ts`
  - Unit-test helper classification, telemetry extraction from malformed-ish objects, and sanitization.
- Modify `packages/mcp/tests/server/tools-coverage.test.ts`
  - Assert pre-handler failures and handler errors produce richer normalized bad-call/error fields.
- Modify `packages/mcp/tests/server/transport.test.ts`
  - Assert transport errors append diagnostic rows while preserving existing JSON-RPC responses.
- Modify `packages/cli/src/commands/usage-metrics.ts` and `packages/cli/tests/commands/usage-metrics.test.ts`
  - Add explicit `bad_call` outcome counting and bad-call stage breakdown so new rows do not disappear from reports.
- Add a changeset under `.changeset/` because `kibi-mcp` behavior changes.

---

### Task 1: Spike and prove the SDK-level `tools/call` interception point

**Files:**
- Modify: `packages/mcp/tests/server.test.ts` or add a focused test beside protocol harnesses if existing patterns fit better.
- Possibly modify: `packages/mcp/src/server/tools.ts`, `packages/mcp/src/server.ts`, or `packages/mcp/src/server/transport.ts` depending on where SDK exposes the failure.

- [ ] **Step 1: Write an integration-style failing test using `tools/call`**

Use the existing MCP protocol harness in `packages/mcp/tests/server.test.ts` / `stdio-protocol.test.ts`. Exercise:
- `tools/call` with `name: "kb_not_real"`.
- `tools/call` with known tool but invalid args, e.g. `kb_search` with invalid enum `type: ""` or missing required `query`.

Assert the currently observed client behavior exactly:
- Unknown/removed tools may return `result.isError === true` with “not found” rather than a top-level JSON-RPC `error`; in that case record `mcp_error_code: null`.
- SDK schema failures may return JSON-RPC `-32602`; if so, preserve that response and record `mcp_error_code: -32602`.
- Diagnostic usage log contains sanitized rows with `bad_call_stage: "unknown_tool"` or `"schema_validation"`.

- [ ] **Step 2: Run focused integration test and verify failure**

Run the specific test file only, for example:

```bash
bun test packages/mcp/tests/server.test.ts --timeout 15000
```

Expected: FAIL because these failures currently happen before the wrapped handler writes usage telemetry.

- [ ] **Step 3: Locate the correct interception point before any broad implementation**

Preferred order:
1. If `@modelcontextprotocol/sdk` exposes request/error hooks or middleware, register a central error hook when creating the server.
2. If parsed `tools/call` failures are observable via an SDK result/error response path, wrap that narrow response boundary and pair it with sanitized request context.
3. If only raw stdio is available, create a bounded request-context tracker that summarizes parsed `tools/call` names/arg keys before SDK validation; do not store raw request bodies.
4. Do **not** rely on `transport.onerror` for parsed `tools/call` validation failures unless the failing test proves the SDK routes that exact class there.
5. Do **not** duplicate the full tool schema validation manually or fork SDK behavior.

Implementation must classify:
- unknown tool name as `bad_call_stage: "unknown_tool"` with `tool` set to the requested name when recoverable.
- Zod/schema/input validation as `bad_call_stage: "schema_validation"` with sanitized arg summaries when recoverable.

- [ ] **Step 4: Run integration test and verify pass**

Run:

```bash
bun test packages/mcp/tests/server.test.ts --timeout 15000
```

Expected: PASS.

---

### Task 2: Add failing tests for diagnostic bad-call helper behavior

**Files:**
- Modify: `packages/mcp/tests/diagnostics.test.ts`
- Modify later: `packages/mcp/src/diagnostics.ts`

- [ ] **Step 1: Write failing tests for bad-call event derivation**

Add a new `describe("deriveBadCallDiagnosticEntry", ...)` block. Cover:

```ts
test("summarizes non-object raw args without logging raw values", () => {
  const entry = deriveBadCallDiagnosticEntry({
    toolName: "kb_search",
    args: "not-json-object",
    telemetry: null,
    stage: "pre_handler_validation",
    mcpErrorCode: -32602,
    error: new Error("expected object"),
    startedAt: new Date("2026-05-30T00:00:00.000Z"),
    finishedAt: new Date("2026-05-30T00:00:00.010Z"),
  });

  expect(entry).toEqual(
    expect.objectContaining({
      tool: "kb_search",
      status: "bad_call",
      bad_call_stage: "pre_handler_validation",
      mcp_error_code: -32602,
      telemetry_status: "missing",
      business_args: null,
      raw_args_summary: { kind: "string", byte_length: 15 },
      duration_ms: 10,
    }),
  );
});
```

Also test an object with `_diagnostic_telemetry` produces `telemetry_status: "provided"`, preserves telemetry separately, and emits only a sanitized argument summary by default rather than full business args.

- [ ] **Step 2: Run the focused test and verify it fails**

Run:

```bash
bun test packages/mcp/tests/diagnostics.test.ts --timeout 15000
```

Expected: FAIL because `deriveBadCallDiagnosticEntry` is not exported yet.

- [ ] **Step 3: Implement minimal diagnostic helper**

In `packages/mcp/src/diagnostics.ts`, add exported literal unions and helper functions:

```ts
export type BadCallStage =
  | "transport_parse"
  | "invalid_request"
  | "unknown_tool"
  | "schema_validation"
  | "pre_handler_validation"
  | "handler_error";

export interface BadCallDiagnosticInput {
  toolName?: string | null;
  requestId?: string | null;
  args?: unknown;
  telemetry?: Record<string, unknown> | null;
  stage: BadCallStage;
  mcpErrorCode?: number | null;
  error: unknown;
  startedAt?: Date;
  finishedAt?: Date;
}
```

Implementation notes:
- Use `error instanceof Error ? error : new Error(String(error))`.
- Reuse `extractToolCallPayload()` only when `args` is a non-null object and not an array.
- Return `business_args: null` for non-object args and for default bad-call object handling unless an allowlist is explicitly supplied.
- Return `raw_args_summary` with no raw string content: include kind, keys, shallow value types, counts, and bounded lengths only.
- Set `telemetry_status` to `provided`, `missing`, `invalid`, or `unavailable`.
- Do not throw from the helper.

- [ ] **Step 4: Run the focused test and verify it passes**

Run:

```bash
bun test packages/mcp/tests/diagnostics.test.ts --timeout 15000
```

Expected: PASS.

---

### Task 3: Record pre-handler and handler failures in the tool wrapper

**Files:**
- Modify: `packages/mcp/tests/server/tools-coverage.test.ts`
- Modify: `packages/mcp/src/server/tools.ts`

- [ ] **Step 1: Add failing test for non-object args in diagnostic mode**

Extend `createRuntime()` with a mock `deriveBadCallDiagnosticEntry` or import the real helper depending on the chosen dependency shape. Prefer adding the helper to `ToolsRuntime` for test control.

Add a test near `addTool rejects non-object arguments...`:

```ts
test("addTool logs diagnostic bad-call rows for non-object arguments", async () => {
  const { runtime, spies } = createRuntime();
  const { server, registered } = createCapturingServer();
  const handler = mock(async () => ({ ok: true }));
  spies.diagnosticModeEnabled.mockImplementation(() => true);

  addTool(server, "invalid_args_tool", "invalid args tool", {}, handler, runtime);
  const tool = getRegisteredTool(registered, "invalid_args_tool");

  const error = await getRejectedError(invokeTool(tool, "bad args"));

  expect(error.message).toContain("Invalid arguments for tool invalid_args_tool");
  expect(handler).not.toHaveBeenCalled();
  expect(spies.appendUsageLogLine).toHaveBeenCalledWith(
    expect.objectContaining({
      tool: "invalid_args_tool",
      status: "bad_call",
      bad_call_stage: "pre_handler_validation",
      mcp_error_code: -32602,
      telemetry_status: "unavailable",
      business_args: null,
      raw_args_summary: expect.objectContaining({ kind: "string" }),
    }),
  );
});
```

- [ ] **Step 2: Add failing test for richer handler errors**

Update `addTool logs diagnostic errors...` to keep the canonical backward-compatible shape: `status: "error"`, plus new `bad_call_stage: "handler_error"`, `telemetry_status`, `error_name`, and `error_summary`. Do not switch handler-started failures to `status: "bad_call"`; reserve `bad_call` for calls rejected before business handler execution.

- [ ] **Step 3: Run focused tests and verify failure**

Run:

```bash
bun test packages/mcp/tests/server/tools-coverage.test.ts --timeout 15000
```

Expected: FAIL because the wrapper does not yet call the bad-call helper for pre-handler validation and does not derive richer error fields.

- [ ] **Step 4: Implement wrapper logging**

In `packages/mcp/src/server/tools.ts`:
- Import `deriveBadCallDiagnosticEntry` from `diagnostics.ts`.
- Add it to `ToolsRuntime` and `DEFAULT_TOOLS_RUNTIME` if test injection is preferred.
- Move the `typeof args !== "object" || args === null` validation before `extractToolCallPayload(args)` or guard extraction so non-object args cannot crash before the diagnostic row is built.
- On validation/shutdown failures before `handlerPromise`, append a bad-call row when diagnostic mode is enabled.
- In handler catch, append the existing fields plus bad-call-derived fields (`bad_call_stage: "handler_error"`, `error_name`, `error_summary`, `telemetry_status`). Preserve existing `status: "error"` unless product decides to count handler errors as `bad_call`.

- [ ] **Step 5: Run focused tests and verify pass**

Run:

```bash
bun test packages/mcp/tests/server/tools-coverage.test.ts --timeout 15000
```

Expected: PASS.

---

### Task 4: Record transport-level parse and invalid-request failures

**Files:**
- Modify: `packages/mcp/tests/server/transport.test.ts`
- Modify: `packages/mcp/src/server/transport.ts`

- [ ] **Step 1: Add failing tests for transport bad-call rows**

In `transport.test.ts`, mock diagnostics module similarly to the existing session mock:

```ts
const mockAppendUsageLogLine = mock((_entry: Record<string, unknown>) => {});
const mockDiagnosticModeEnabled = mock(() => true);
```

Then assert that a `SyntaxError` records:

```ts
expect(mockAppendUsageLogLine).toHaveBeenCalledWith(
  expect.objectContaining({
    tool: null,
    status: "bad_call",
    bad_call_stage: "transport_parse",
    mcp_error_code: -32700,
    telemetry_status: "unavailable",
  }),
);
```

And a `ZodError`-named error records `bad_call_stage: "invalid_request"`, `mcp_error_code: -32600`.

- [ ] **Step 2: Run focused transport tests and verify failure**

Run:

```bash
bun test packages/mcp/tests/server/transport.test.ts --timeout 15000
```

Expected: FAIL because transport currently only sends JSON-RPC error responses.

- [ ] **Step 3: Implement transport recording**

In `packages/mcp/src/server/transport.ts`:
- Import `DIAGNOSTIC_MODE_ENABLED`, `appendUsageLogLine`, and `deriveBadCallDiagnosticEntry`.
- Add a tiny internal `recordTransportBadCall(stage, code, error)` helper.
- Call it before `transport.send(...)` in the `SyntaxError` and `ZodError` branches.
- Do not alter existing JSON-RPC response bodies: keep `-32700 Parse error` and `-32600 Invalid Request` exactly as existing tests assert.
- Do not crash if logging fails; `appendUsageLogLine` itself should remain simple, but this helper can catch and debug-log failures to avoid making telemetry fatal.

- [ ] **Step 4: Run focused transport tests and verify pass**

Run:

```bash
bun test packages/mcp/tests/server/transport.test.ts --timeout 15000
```

Expected: PASS.

---

### Task 5: Keep usage metrics compatible

**Files:**
- Inspect/possibly modify: `packages/cli/src/commands/usage-metrics.ts`
- Inspect/possibly modify: `packages/cli/tests/commands/usage-metrics.test.ts`

- [ ] **Step 1: Add or update parser tests for bad-call rows**

Add sample usage rows with `status: "bad_call"`, `bad_call_stage`, `mcp_error_code`, and missing `result_summary`.

Expected behavior:
- CLI does not crash.
- Bad calls appear in totals and explicit `bad_call` outcome counts.
- Bad calls are grouped by `bad_call_stage` in a new or existing diagnostic breakdown.
- Existing success/error metrics remain unchanged.

- [ ] **Step 2: Run CLI usage metrics tests and verify failure/pass as appropriate**

Run:

```bash
bun test packages/cli/tests/commands/usage-metrics.test.ts --timeout 15000
```

Expected: FAIL until `usage-metrics` counts `bad_call` explicitly; then update parser logic minimally and rerun to PASS.

---

### Task 6: End-to-end validation and release metadata

**Files:**
- Add: `.changeset/<generated-name>.md`
- Possibly modify: `documentation/symbols.yaml`, `documentation/symbol-coordinates.yaml` if symbol extraction output changes.

- [ ] **Step 1: Add a changeset for `kibi-mcp`**

Follow the repo rule: start with 2-4 human-facing sentences, then a dry technical summary. Use a patch bump unless implementation changes public schema docs in a way maintainers consider minor.

Suggested summary:

```md
---
"kibi-mcp": patch
---

Kibi diagnostic mode now records bad MCP tool calls, not only successful calls and handler failures. This makes usage logs more useful for understanding what agents get wrong, including malformed requests, validation errors, and unknown tool calls.

- Add normalized bad-call diagnostic rows to MCP usage logging.
- Preserve existing MCP error responses while recording sanitized failure context.
```

- [ ] **Step 2: Run type checks**

Run:

```bash
bun run typecheck:mcp
bun run typecheck:mcp:tests
```

Expected: exit code 0.

- [ ] **Step 3: Run focused test suite**

Run:

```bash
bun test packages/mcp/tests/diagnostics.test.ts packages/mcp/tests/server.test.ts packages/mcp/tests/server/tools-coverage.test.ts packages/mcp/tests/server/transport.test.ts --timeout 15000
```

Expected: exit code 0.

- [ ] **Step 4: Run related CLI tests if usage metrics changed**

Run:

```bash
bun test packages/cli/tests/commands/usage-metrics.test.ts --timeout 15000
```

Expected: exit code 0.

- [ ] **Step 5: Run package build**

Run:

```bash
bun run build:mcp
```

Expected: exit code 0.

- [ ] **Step 6: Run lint/format check**

Run:

```bash
bun run check
```

Expected: exit code 0.

---

## Design Notes and Risks

- The main product decision is whether handler-thrown errors should keep `status: "error"` or become `status: "bad_call"`. Recommended: preserve `status: "error"` for backward compatibility and add `bad_call_stage: "handler_error"` for diagnosis.
- Protocol-level errors often do not include a trusted request id or tool name. Use `null` rather than inventing values, unless the SDK exposes parsed `tools/call` params safely.
- Avoid logging arbitrary raw JSON-RPC messages because agents may include sensitive data in malformed calls. Prefer summaries and sanitized object keys.
- Do not make diagnostic logging fatal. If usage-log append fails, continue returning the original MCP error response.
- The implementation should not manually read or edit `.kb/`; tests should use temp workspaces and `initializeDiagnosticMode(true)` as current diagnostics tests do.

## KB Follow-up

After implementation, update Kibi via MCP tools only:

- Add or update a requirement for diagnostic mode capturing invalid/bad MCP calls.
- Add tests linked to that requirement for diagnostics helper, tool-wrapper failures, and transport failures.
- If new exported symbols are added, ensure symbol traceability and update `documentation/symbols.yaml` / `documentation/symbol-coordinates.yaml` if extraction output changes.
