// implements REQ-kibi-operation-interface-parity
import { afterEach, describe, expect, test } from "bun:test";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  renameSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { executeUpsert } from "../../src/operations/mutation/upsert.js";
import type {
  OperationContext,
  PrologQueryResult,
} from "../../src/public/operations/runtime-types.js";

const workspaces: string[] = [];

afterEach(() => {
  for (const workspace of workspaces.splice(0))
    rmSync(workspace, { recursive: true, force: true });
});

/**
 * A source-first runtime over an empty store: every read finds nothing, the
 * rolled-back commit preview passes, and the commit goal is never reached
 * (each payload here is refused while its authored document is resolved).
 */
function sourceFirstContext(): {
  root: string;
  goals: string[];
  context: OperationContext;
} {
  const root = mkdtempSync(path.join(tmpdir(), "kibi-dryrun-parity-"));
  workspaces.push(root);
  const goals: string[] = [];
  return {
    root,
    goals,
    context: {
      workspaceRoot: root,
      signal: new AbortController().signal,
      clock: () => new Date("2026-10-21T00:00:00.000Z"),
      sourceFirst: true,
      fs: {
        readFile: async (file) => readFileSync(file, "utf8"),
        writeFile: async (file, data) => writeFileSync(file, data),
        mkdir: async (dir) => {
          mkdirSync(dir, { recursive: true });
        },
        rename: async (from, to) => renameSync(from, to),
        unlink: async (file) => unlinkSync(file),
        stat: async () => ({ isFile: () => true, isDirectory: () => false }),
      },
      prolog: {
        query: async (goal): Promise<PrologQueryResult> => {
          const text = Array.isArray(goal) ? goal.join(", ") : goal;
          goals.push(text);
          if (text.startsWith("kb_preview_upsert_contradiction("))
            return { success: true, bindings: {} };
          if (text.startsWith("kb_commit_upsert("))
            throw new Error("the source refusal must precede the commit");
          if (
            /^(?:findall|kb_query_entities|kb_query_proof_contracts)\(/.test(
              text,
            )
          )
            return { success: true, bindings: { Results: "[]", Count: "0" } };
          return { success: false, bindings: {} };
        },
        nextSolution: async () => null,
        save: async () => ({ success: true, bindings: {} }),
      },
      branchAttachment: {
        gitBranch: "develop",
        kbBranch: "develop",
        storePath: path.join(root, ".kb", "branches", "develop"),
        kind: "exact",
        migrationRequired: false,
      },
    },
  };
}

const FACT = {
  type: "fact",
  id: "FACT-parity-note",
  properties: {
    title: "Parity note",
    status: "active",
    fact_kind: "observation",
  },
} as const;

type DryRun = {
  valid: boolean;
  errors: string[];
  errorCode?: string;
  dryRun: boolean;
};

async function expectSameSourceRefusal(
  payload: Parameters<typeof executeUpsert>[0],
  code: string,
  expected: string,
): Promise<void> {
  const { root, context } = sourceFirstContext();
  const preview = await executeUpsert({ ...payload, dryRun: true }, context);
  const dry = preview.structuredContent as unknown as DryRun;
  expect(dry.dryRun).toBe(true);
  expect(dry.valid).toBe(false);
  expect(dry.errorCode).toBe(code);
  expect(dry.errors).toHaveLength(1);
  expect(dry.errors[0]).toContain(expected);
  // The dry run published nothing.
  expect(existsSync(path.join(root, "docs"))).toBe(false);

  const refused = await executeUpsert(payload, context).then(
    () => null,
    (error: unknown) => error,
  );
  expect(refused).toMatchObject({ name: "OperationError", code });
  expect((refused as Error).message).toBe(dry.errors[0] as string);
}

describe("kb_upsert dryRun refuses what the source write refuses", () => {
  test("a document path that escapes the workspace", async () => {
    await expectSameSourceRefusal(
      { ...FACT, document: { path: "../outside.md" } },
      "SOURCE_PATH_INVALID",
      "document.path must be a workspace-relative path without traversal",
    );
  });

  test("a document format the writer cannot author", async () => {
    await expectSameSourceRefusal(
      { ...FACT, document: { path: "docs/facts/parity.txt" } },
      "SOURCE_FORMAT_UNSUPPORTED",
      "Unsupported authored source format: .txt",
    );
  });

  test("a writable document path stays valid and is not written", async () => {
    const { root, goals, context } = sourceFirstContext();
    const preview = await executeUpsert(
      { ...FACT, document: { path: "docs/facts/parity.md" }, dryRun: true },
      context,
    );
    expect(preview.structuredContent).toMatchObject({
      valid: true,
      errors: [],
      dryRun: true,
    });
    expect(existsSync(path.join(root, "docs", "facts", "parity.md"))).toBe(
      false,
    );
    expect(
      goals.filter((goal) =>
        goal.startsWith("kb_preview_upsert_contradiction(fact,"),
      ),
    ).toHaveLength(1);
  });
});
