import { afterEach, describe, expect, spyOn, test } from "bun:test";
import * as kibiRuntime from "kibi-runtime";
import type { PrologPort } from "kibi-runtime";

import { createMcpRuntime } from "../../src/runtime/mcp-runtime.js";

const spies: { mockRestore: () => void }[] = [];
afterEach(() => {
  for (const spy of spies.splice(0)) spy.mockRestore();
});

const port: PrologPort = {
  query: async () => ({ success: true, bindings: {} }),
  nextSolution: async () => null,
  save: async () => ({ success: true, bindings: {} }),
};

function runtimeWith(attachment: unknown) {
  spies.push(
    spyOn(kibiRuntime, "resolveBranchAttachment").mockReturnValue(
      attachment as never,
    ),
  );
  const warnings: unknown[][] = [];
  spies.push(
    spyOn(console, "warn").mockImplementation((...args) => {
      warnings.push(args);
    }),
  );
  const prolog = { id: "engine" };
  const runtime = createMcpRuntime({
    workspaceRoot: "/ws",
    attachedBranchKbPath: () => null,
    ensureProlog: async () => prolog,
    adaptProlog: () => port,
    refreshAttachedBranchStamp: async () => {},
    plugins: {} as never,
  });
  return { runtime, warnings, prolog };
}

const legacy = {
  gitBranch: "feature",
  kbBranch: "main",
  storePath: "/ws/.kb/branches/main",
  kind: "legacy_compat",
  migrationRequired: true,
};

const read = {
  name: "kb_status",
  effects: ["kb-read"],
  requiresProlog: false,
} as never;
const write = {
  name: "kb_upsert",
  effects: ["kb-write"],
  requiresProlog: true,
} as never;

describe("legacy branch attachments", () => {
  test("a read warns how to migrate and keeps the attachment", async () => {
    const { runtime, warnings } = runtimeWith(legacy);
    const context = await runtime.open(read);
    expect(warnings).toStrictEqual([
      [
        "[KIBI-MCP] Legacy branch attachment: Git 'feature' is reading KB 'main'. Run 'kibi branch migrate --from main --to feature --apply'; writes are blocked until then.",
      ],
    ]);
    expect(context.branchAttachment).toStrictEqual(legacy as never);
  });

  test("an engine operation is refused until migration", async () => {
    const { runtime } = runtimeWith(legacy);
    await expect(runtime.open(write)).rejects.toThrow(
      new Error(
        "Legacy branch attachment requires explicit migration before 'kb_upsert'; run kibi branch migrate --from main --to feature --apply",
      ),
    );
  });

  test("an attachment error is never treated as a legacy attachment", async () => {
    const failure = {
      error: "no branch",
      code: "NO_BRANCH",
      migrationRequired: true,
      gitBranch: "feature",
      kbBranch: "main",
    };
    const { runtime, warnings, prolog } = runtimeWith(failure);
    const context = await runtime.open(read);
    expect(warnings).toStrictEqual([]);
    expect(context.branchAttachment).toBeUndefined();
    const engineContext = await runtime.open(write);
    expect(runtime.sessionProlog(engineContext)).toBe(prolog);
  });

  test("a lazy engine is recorded against its context", async () => {
    const { runtime, prolog } = runtimeWith({
      ...legacy,
      migrationRequired: false,
    });
    const context = await runtime.open(read);
    expect(runtime.sessionProlog(context)).toBeUndefined();
    expect(await context.ensureProlog?.()).toBe(port);
    expect(runtime.sessionProlog(context)).toBe(prolog);
    expect(await context.ensureProlog?.()).toBe(port);
  });
});
