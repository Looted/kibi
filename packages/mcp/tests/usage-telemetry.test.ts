// implements REQ-kibi-anonymous-usage-telemetry
import { afterEach, describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { recordMcpToolTelemetry } from "../src/usage-telemetry";

const savedEnv = { ...process.env };
const temporaryRoots: string[] = [];

afterEach(() => {
  process.env = { ...savedEnv };
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
