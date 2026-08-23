import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { coordinateIdentityHash } from "kibi-cli/extractors/symbol-coordinates";
import { setSymbolRefreshForTests } from "kibi-cli/operations/mutation/symbol-refresh";
// The MCP server registers kibi-cli's production executeUpsert for kb_upsert.
// This suite exercises that exact function with filesystem ports enabled so
// generated coordinate persistence holds on the MCP transport too.
import { executeUpsert } from "kibi-cli/operations/mutation/upsert";
import { nodeFilesystem } from "kibi-cli/operations/node-ports";
import type {
  OperationContext,
  PrologPort,
  PrologQueryResult,
} from "kibi-cli/operations/runtime-types";

const workspaces: string[] = [];
const previousKibiBranch = process.env.KIBI_BRANCH;

beforeEach(() => {
  // Temp fixture roots are not git repositories; pin the branch identity the
  // same way production MCP sessions do.
  process.env.KIBI_BRANCH = "main";
});

afterEach(() => {
  if (previousKibiBranch === undefined) {
    Reflect.deleteProperty(process.env, "KIBI_BRANCH");
  } else {
    process.env.KIBI_BRANCH = previousKibiBranch;
  }
});

afterEach(() => {
  setSymbolRefreshForTests(undefined);
  for (const root of workspaces.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

function workspace(): string {
  const root = mkdtempSync(path.join(tmpdir(), "kibi-mcp-coordinates-"));
  workspaces.push(root);
  mkdirSync(path.join(root, ".kb"), { recursive: true });
  mkdirSync(path.join(root, "src"), { recursive: true });
  return root;
}

const identity = {
  id: "SYM-MCP-COORD",
  title: "mcpCoordTarget",
};

function seedFixture(root: string): void {
  writeFileSync(
    path.join(root, "src", "coord.ts"),
    "export function mcpCoordTarget() {\n  return 42;\n}\n",
  );
  writeFileSync(
    path.join(root, ".kb", "symbols.yaml"),
    "symbols:\n" +
      `  - id: ${identity.id}\n` +
      `    title: ${identity.title}\n` +
      "    sourceFile: src/coord.ts\n" +
      "    status: active\n",
  );
  // Simulate the warm state after an approved refresh + sync: artifact and
  // compiled RDF both carry coordinates while cache hashes match.
  writeFileSync(
    path.join(root, ".kb", "symbol-coordinates.yaml"),
    `version: 2\ncoordinates:\n  ${identity.id}:\n` +
      `    identityHash: ${coordinateIdentityHash({ ...identity, sourceFile: "src/coord.ts" })}\n` +
      "    sourceColumn: 16\n    sourceEndColumn: 1\n    sourceEndLine: 3\n    sourceFile: src/coord.ts\n    sourceLine: 1\n",
  );
}

function createContext(
  root: string,
  query: ReturnType<typeof mock>,
): OperationContext {
  const prolog: PrologPort = {
    query,
    nextSolution: async () => null,
    save: async () => ({ success: true, bindings: {} }),
  };
  return {
    workspaceRoot: root,
    signal: new AbortController().signal,
    clock: () => new Date("2026-08-24T00:00:00.000Z"),
    prolog,
    fs: nodeFilesystem,
  };
}

describe("registered kb_upsert keeps generated coordinates (MCP runtime)", () => {
  test("same-value symbol upsert commits coordinates and leaves authored manifest clean", async () => {
    const root = workspace();
    seedFixture(root);
    const committedGoals: string[] = [];
    const query = mock(async (goal: string): Promise<PrologQueryResult> => {
      if (goal.startsWith("kb_commit_upsert(")) {
        committedGoals.push(goal);
        return { success: true, bindings: { ChangeKind: "'updated'" } };
      }
      if (goal.includes("kb_entity('SYM-MCP-COORD'")) {
        return { success: true, bindings: {} };
      }
      if (goal.startsWith("findall(")) {
        return {
          success: true,
          bindings: goal.includes("findall(From,")
            ? { Sources: "[]" }
            : { Targets: "[]" },
        };
      }
      if (goal.startsWith("once(kb_entity('SYM-MCP-COORD', _, _))")) {
        return { success: true, bindings: {} };
      }
      return { success: true, bindings: {} };
    });

    const result = await executeUpsert(
      {
        type: "symbol",
        id: identity.id,
        properties: {
          title: identity.title,
          status: "active",
          sourceFile: "src/coord.ts",
        },
      },
      createContext(root, query),
    );

    expect(result.structuredContent).toMatchObject({
      created: 0,
      updated: 1,
    });
    expect(committedGoals).toHaveLength(1);
    const commitGoal = committedGoals[0] ?? "";
    for (const field of [
      "sourceLine=1",
      "sourceColumn=16",
      "sourceEndLine=3",
      "sourceEndColumn=1",
    ]) {
      expect(commitGoal).toContain(field);
    }

    const manifest = readFileSync(
      path.join(root, ".kb", "symbols.yaml"),
      "utf8",
    );
    expect(manifest).not.toContain("sourceLine");
    expect(manifest).not.toContain("coordinatesGeneratedAt");
    expect(existsSync(path.join(root, ".kb", "symbol-coordinates.yaml"))).toBe(
      true,
    );
  });

  test("coordinate refresh failure aborts before the RDF commit", async () => {
    const root = workspace();
    seedFixture(root);
    const committedGoals: string[] = [];
    const query = mock(async (goal: string): Promise<PrologQueryResult> => {
      if (goal.startsWith("kb_commit_upsert(")) {
        committedGoals.push(goal);
        return { success: true, bindings: { ChangeKind: "'updated'" } };
      }
      if (goal.includes("kb_entity('SYM-MCP-COORD'")) {
        return { success: true, bindings: {} };
      }
      if (goal.startsWith("findall(")) {
        return {
          success: true,
          bindings: goal.includes("findall(From,")
            ? { Sources: "[]" }
            : { Targets: "[]" },
        };
      }
      return { success: true, bindings: {} };
    });
    // Targeted refresh cannot locate extraction output: fail closed instead
    // of committing stale or missing coordinates.
    setSymbolRefreshForTests(async () => ({
      refreshed: false,
      found: false,
      outcome: "not_found",
    }));

    await expect(
      executeUpsert(
        {
          type: "symbol",
          id: identity.id,
          properties: {
            title: identity.title,
            status: "active",
            sourceFile: "src/coord.ts",
          },
        },
        createContext(root, query),
      ),
    ).rejects.toThrow(/could not find|no longer contains/i);

    expect(committedGoals).toHaveLength(0);
    // Authored manifest rolled back to its pre-mutation bytes.
    const manifest = readFileSync(
      path.join(root, ".kb", "symbols.yaml"),
      "utf8",
    );
    expect(manifest).not.toContain("coordinatesGeneratedAt");
  });
});
