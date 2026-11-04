import { afterEach, describe, expect, mock, test } from "bun:test";
import { execFileSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  type PrologPort,
  type RuntimeOperationSpec,
  ensureBranchStoreCompiled,
  resolveBranchAttachment,
} from "kibi-runtime";
import {
  type McpSession,
  createMcpRuntime,
} from "../../src/runtime/mcp-runtime.js";

const readSpec: RuntimeOperationSpec<Record<string, never>, void> = {
  name: "kb_query",
  effects: ["kb-read"],
  requiresProlog: true,
  execute: async () => undefined,
};

const writeSpec: RuntimeOperationSpec<Record<string, never>, void> = {
  ...readSpec,
  name: "kb_delete",
  effects: ["kb-write"],
};

function createSession(workspaceRoot = "/workspace"): {
  readonly session: McpSession;
  readonly prolog: PrologPort;
  readonly ensureProlog: ReturnType<typeof mock>;
  readonly refreshAttachedBranchStamp: ReturnType<typeof mock>;
  readonly requestCleanup: ReturnType<typeof mock>;
} {
  const prolog: PrologPort = {
    query: async () => ({ success: true, bindings: {} }),
    nextSolution: async () => null,
    save: async () => ({ success: true, bindings: {} }),
  };
  const ensureProlog = mock(async () => prolog);
  const refreshAttachedBranchStamp = mock(async () => undefined);
  const requestCleanup = mock(async () => undefined);
  const session: McpSession = {
    workspaceRoot,
    activeBranchName: () => "feature/runtime",
    attachedBranchKbPath: () => "/workspace/.kb/branches/feature/runtime",
    ensureProlog,
    adaptProlog: (value) => value,
    refreshAttachedBranchStamp,
    requestCleanup,
  };
  return {
    session,
    prolog,
    ensureProlog,
    refreshAttachedBranchStamp,
    requestCleanup,
  };
}

describe("MCP operation runtime", () => {
  test("reuses the session-owned Prolog process across requests", async () => {
    // Given
    const fixture = createSession();
    const runtime = createMcpRuntime(fixture.session);

    // When
    const first = await runtime.open(readSpec);
    const second = await runtime.open(readSpec);

    // Then
    expect(first.prolog).toBe(fixture.prolog);
    expect(second.prolog).toBe(fixture.prolog);
    expect(fixture.ensureProlog).toHaveBeenCalledTimes(2);
  });

  test("refreshes the attached branch stamp after every kb-write", async () => {
    // Given
    const fixture = createSession();
    const runtime = createMcpRuntime(fixture.session);
    const context = await runtime.open(writeSpec);

    // When
    await runtime.afterSuccess(writeSpec, context);

    // Then
    expect(fixture.refreshAttachedBranchStamp).toHaveBeenCalledTimes(1);
  });

  test("does not refresh the attached branch stamp after a read", async () => {
    // Given
    const fixture = createSession();
    const runtime = createMcpRuntime(fixture.session);
    const context = await runtime.open(readSpec);

    // When
    await runtime.afterSuccess(readSpec, context);

    // Then
    expect(fixture.refreshAttachedBranchStamp).not.toHaveBeenCalled();
  });

  test("performs request cleanup without terminating the session Prolog", async () => {
    // Given
    const fixture = createSession();
    const runtime = createMcpRuntime(fixture.session);
    const context = await runtime.open(readSpec);

    // When
    await runtime.close(context, {
      status: "error",
      error: new TypeError("request failed"),
    });

    // Then
    expect(fixture.requestCleanup).toHaveBeenCalledTimes(1);
    expect(fixture.ensureProlog).toHaveBeenCalledTimes(1);
  });
});

const KIBI_CLI = path.resolve(import.meta.dir, "../../../cli/bin/kibi");
const workspaces: string[] = [];
afterEach(() => {
  for (const dir of workspaces.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

/** A committed main branch with one requirement, then a hook-less branch. */
function freshBranchWorkspace(): string {
  const dir = realpathSync(
    mkdtempSync(path.join(os.tmpdir(), "kibi-mcp-runtime-fresh-")),
  );
  workspaces.push(dir);
  const run = (command: string, args: string[]) =>
    execFileSync(command, args, { cwd: dir, stdio: "pipe", timeout: 120_000 });
  const git = (...args: string[]) =>
    run("git", [
      "-c",
      "user.email=runtime@example.com",
      "-c",
      "user.name=Runtime",
      "-c",
      "commit.gpgsign=false",
      "-c",
      "core.hooksPath=/dev/null",
      ...args,
    ]);
  git("init", "-q", "-b", "main");
  run("node", [KIBI_CLI, "init", "--no-prepare-hooks"]);
  mkdirSync(path.join(dir, ".kb", "requirements"), { recursive: true });
  writeFileSync(
    path.join(dir, ".kb", "requirements", "REQ-demo.md"),
    "---\nid: REQ-demo\ntitle: Demo\nstatus: open\n---\n## Context\n\nA demo requirement.\n",
  );
  run("node", [KIBI_CLI, "sync"]);
  git("add", "-A");
  git("commit", "-qm", "kb");
  git("checkout", "-q", "-b", "feature/fresh");
  return dir;
}

/** Whether this branch's store still needs compiling, without compiling it. */
async function storeState(root: string): Promise<string> {
  const attachment = resolveBranchAttachment(root);
  if ("error" in attachment) throw new Error(attachment.error);
  return ensureBranchStoreCompiled(
    root,
    attachment,
    { name: "kb_query" },
    {
      KIBI_AUTO_SYNC: "0",
    },
  );
}

describe("MCP operation runtime on a never-compiled branch store", () => {
  // implements REQ-kibi-fresh-clone-setup
  test("compiles the store before a Prolog-backed operation", async () => {
    const root = freshBranchWorkspace();
    expect(await storeState(root)).toBe("disabled");

    const fixture = createSession(root);
    await createMcpRuntime(fixture.session).open(readSpec);

    expect(await storeState(root)).toBe("not-needed");
  }, 240_000);
});
