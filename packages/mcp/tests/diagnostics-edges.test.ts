import { afterEach, describe, expect, spyOn, test } from "bun:test";
import fs, { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { classifyDiagnosticError } from "../src/diagnostics-helpers.js";
import {
  appendUsageLogLine,
  deriveDiagnosticFields as derive,
  initializeDiagnosticMode,
  readMcpPackageVersion,
  routedBusinessArgs,
  routedOperationName,
} from "../src/diagnostics.js";

const restorers: (() => void)[] = [];
afterEach(() => {
  while (restorers.length > 0) restorers.pop()?.();
});

function setEnv(key: string, value: string | undefined): void {
  const previous = process.env[key];
  restorers.push(() => {
    if (previous === undefined) Reflect.deleteProperty(process.env, key);
    else process.env[key] = previous;
  });
  if (value === undefined) Reflect.deleteProperty(process.env, key);
  else process.env[key] = value;
}

describe("routed names never read inherited members", () => {
  test("unknown selectors keep the composite name and arguments", () => {
    for (const [tool, args] of [
      ["kb_model", { mode: "constructor" }],
      ["kb_model", { mode: "toString" }],
      ["kb_model", { mode: 1 }],
      ["kb_skills", { action: "hasOwnProperty" }],
      ["kb_skills", { action: ["list"] }],
    ] as const) {
      expect(routedOperationName(tool, args)).toBe(tool);
      expect(routedBusinessArgs(tool, args)).toBe(args);
    }
    expect(routedOperationName("kb_skills", { action: "read" })).toBe(
      "kb_skills_read",
    );
  });
});

describe("derived fields edges", () => {
  test("coverage rows that are not records are skipped", () => {
    const fields = derive("kb_coverage", {}, null, {
      structuredContent: {
        kibiProtocol: 1,
        data: {
          rows: [
            null,
            "x",
            { id: "REQ-1", proofGaps: ["stale_proof_receipt"] },
          ],
        },
      },
    });
    expect(fields.coverage_requirement_count).toBe(1);
    expect(fields.coverage_receipt_gaps).toStrictEqual([
      { requirementId: "REQ-1", testIds: [], codes: ["stale_proof_receipt"] },
    ]);
  });

  test("only the semantic advisor reads an advisor receipt", () => {
    const result = {
      structuredContent: {
        kibiProtocol: 1,
        data: {
          receipt: { logic_readiness: "ready", candidate_lane: "facts" },
        },
      },
    };
    const query = derive("kb_graph", {}, null, result);
    expect(query).not.toHaveProperty("semantic_logic_readiness");
    expect(query.result_summary).toBe("kb_graph completed");
    expect(derive("kb_semantic_advisor", {}, null, result).result_summary).toBe(
      "semantic advisor ready via facts",
    );
  });
});

describe("contradiction ids", () => {
  test("any run of spaces may separate the ids", () => {
    expect(
      classifyDiagnosticError(
        new Error(
          "Contradiction detected for requirement \t REQ-1: Conflicts with   REQ-2",
        ),
      ),
    ).toMatchObject({
      semantic_checked_req_id: "REQ-1",
      semantic_conflicting_req_ids: ["REQ-2"],
    });
  });
});

describe("usage log rows", () => {
  test("rows name the trimmed host and are appended as JSON lines", () => {
    const root = mkdtempSync(path.join(tmpdir(), "kibi-mcp-edges-"));
    restorers.push(() => rmSync(root, { recursive: true, force: true }));
    const log = path.join(root, "nested", "usage.log");
    setEnv("KIBI_WORKSPACE", root);
    setEnv("KIBI_MCP_DIAGNOSTIC_USAGE_LOG_PATH", log);
    setEnv("KIBI_MCP_HOST", "  cursor  ");
    restorers.push(() => initializeDiagnosticMode(false));
    initializeDiagnosticMode(true);
    appendUsageLogLine({ tool: "kb_query", note: "é" });
    appendUsageLogLine({ tool: "kb_search" });
    const rows = readFileSync(log, "utf8")
      .trimEnd()
      .split("\n")
      .map((line) => JSON.parse(line));
    expect(rows).toStrictEqual([
      {
        interface: "mcp",
        host: "cursor",
        package_version: readMcpPackageVersion(),
        workspace_root: root,
        tool: "kb_query",
        note: "é",
      },
      {
        interface: "mcp",
        host: "cursor",
        package_version: readMcpPackageVersion(),
        workspace_root: root,
        tool: "kb_search",
      },
    ]);
    setEnv("KIBI_MCP_HOST", "   ");
    initializeDiagnosticMode(true);
    appendUsageLogLine({ tool: "kb_status" });
    expect(
      JSON.parse(readFileSync(log, "utf8").trimEnd().split("\n")[2] ?? "").host,
    ).toBe("unknown");
  });
});

describe("readMcpPackageVersion stops at the first package.json", () => {
  test("an unreadable nearest package.json is not skipped", () => {
    const original = fs.readFileSync;
    let reads = 0;
    const read = spyOn(fs, "readFileSync").mockImplementation(((
      ...args: Parameters<typeof fs.readFileSync>
    ) => {
      reads += 1;
      return reads === 1 ? "not json" : original(...args);
    }) as typeof fs.readFileSync);
    restorers.push(() => read.mockRestore());
    expect(readMcpPackageVersion()).toBeNull();
    expect(reads).toBe(1);
  });
});
