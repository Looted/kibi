import { afterEach, describe, expect, mock, test } from "bun:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { PrologProcess } from "kibi-cli/prolog";
import { handleKbCheck } from "../../src/tools/check.js";

const tempDirs: string[] = [];
const originalWorkspace = process.env.KIBI_WORKSPACE;

async function createWorkspace(): Promise<string> {
  const workspaceRoot = await fs.mkdtemp(
    path.join(os.tmpdir(), "kibi-mcp-check-error-"),
  );
  tempDirs.push(workspaceRoot);
  return workspaceRoot;
}

afterEach(async () => {
  if (originalWorkspace === undefined) {
    Reflect.deleteProperty(process.env, "KIBI_WORKSPACE");
  } else {
    process.env.KIBI_WORKSPACE = originalWorkspace;
  }

  await Promise.all(
    tempDirs
      .splice(0)
      .map((dir) => fs.rm(dir, { recursive: true, force: true })),
  );

  mock.restore();
});

describe("kb_check error and edge branches", () => {
  test("falls back to default checks config when .kb/config.json is invalid", async () => {
    const workspaceRoot = await createWorkspace();
    process.env.KIBI_WORKSPACE = workspaceRoot;

    await fs.mkdir(path.join(workspaceRoot, ".kb"), { recursive: true });
    await fs.writeFile(path.join(workspaceRoot, ".kb", "config.json"), "{oops");

    const query = mock(async () => ({
      success: true,
      bindings: {
        JsonString: JSON.stringify({}),
      },
    }));

    const result = await handleKbCheck(
      { query } as unknown as PrologProcess,
      {},
    );

    expect(result.structuredContent?.count).toBe(0);
    expect(query).toHaveBeenCalledTimes(1);
  });

  test("returns early when all requested rules are invalid", async () => {
    const query = mock(async () => ({
      success: true,
      bindings: {
        JsonString: JSON.stringify({}),
      },
    }));

    const result = await handleKbCheck({ query } as unknown as PrologProcess, {
      rules: ["not-a-rule"],
    });

    expect(result.content[0]?.text).toBe("No violations found");
    expect(result.structuredContent).toEqual({
      violations: [],
      count: 0,
      diagnostics: [],
    });
    expect(query).not.toHaveBeenCalled();
  });

  test("wraps aggregated query failures", async () => {
    const query = mock(async () => ({
      success: false,
      bindings: {},
      error: "aggregated boom",
    }));

    await expect(
      handleKbCheck({ query } as unknown as PrologProcess, {
        rules: ["required-fields"],
      }),
    ).rejects.toThrow(
      "Check execution failed: Aggregated checks query failed: aggregated boom",
    );
  });

  test("wraps missing JsonString bindings as parse failures", async () => {
    const query = mock(async () => ({
      success: true,
      bindings: {},
    }));

    await expect(
      handleKbCheck({ query } as unknown as PrologProcess, {
        rules: ["required-fields"],
      }),
    ).rejects.toThrow(
      "Check execution failed: Failed to parse violations JSON: No JSON string in binding",
    );
  });
});
