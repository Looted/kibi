import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { OperationError } from "../../src/cli-errors.js";
import {
  manifestRelationships,
  resolveContainedSourcePath,
  writeSourceForUpsert,
} from "../../src/operations/mutation/source-authoring.js";
import { nodeFilesystem } from "../../src/public/operations/node-ports.js";
import type { OperationContext } from "../../src/public/operations/runtime-types.js";

const workspaces: string[] = [];
const spies: Array<{ mockRestore: () => void }> = [];
let previousExitCode: string | number | undefined | null;

afterEach(async () => {
  for (const spy of spies.splice(0)) spy.mockRestore();
  process.exitCode = previousExitCode ?? 0;
  await Promise.all(
    workspaces
      .splice(0)
      .map((workspace) => rm(workspace, { recursive: true, force: true })),
  );
});

async function workspace(): Promise<string> {
  previousExitCode = process.exitCode;
  const root = await mkdtemp(path.join(tmpdir(), "kibi-source-remaining-"));
  workspaces.push(root);
  return root;
}

function context(
  workspaceRoot: string,
  fs: OperationContext["fs"] = nodeFilesystem,
): OperationContext {
  return {
    workspaceRoot,
    signal: new AbortController().signal,
    clock: () => new Date("2026-09-05T00:00:00.000Z"),
    fs,
  };
}

describe("source-authoring remaining path, manifest, and rollback branches", () => {
  test("rejects a resolved path that escapes the workspace", async () => {
    const root = await workspace();
    const originalResolve = path.resolve.bind(path);
    const spy = spyOn(path, "resolve").mockImplementation((...args: string[]) => {
      if (args.length >= 2 && args[1] === "docs/escape.md") {
        return "/tmp/kibi-outside-escape.md";
      }
      return originalResolve(...(args as [string, ...string[]]));
    });
    spies.push(spy);
    expect(() => resolveContainedSourcePath(root, "docs/escape.md")).toThrow(
      /escapes the workspace/,
    );
  });

  test("updates a symbol manifest with non-object relationships and invalid symbols nodes", async () => {
    const root = await workspace();
    await mkdir(path.join(root, ".kb"), { recursive: true });
    await writeFile(
      path.join(root, ".kb", "symbols.yaml"),
      [
        "symbols:",
        "  - id: SYM-MIXED",
        "    title: Mixed",
        "    relationships:",
        "      - just-a-string",
        "      - type: implements",
        "        target: REQ-1",
        "      - type: 12",
        "        to: REQ-2",
        "",
      ].join("\n"),
    );
    const updated = await writeSourceForUpsert(
      {
        type: "symbol",
        id: "SYM-MIXED",
        properties: { title: "Mixed next" },
        relationships: [{ type: "covered_by", from: "SYM-MIXED", to: "TEST-1" }],
      },
      { id: "SYM-MIXED", type: "symbol", title: "Mixed next" },
      { id: "SYM-MIXED", source: ".kb/symbols.yaml" },
      context(root),
    );
    expect(updated?.receipt.created).toBe(false);
    const body = await readFile(path.join(root, ".kb", "symbols.yaml"), "utf8");
    expect(body).toContain("TEST-1");

    await writeFile(path.join(root, ".kb", "symbols.yaml"), "symbols: hello\n");
    await expect(
      writeSourceForUpsert(
        {
          type: "symbol",
          id: "SYM-BAD",
          properties: { title: "Bad" },
        },
        { id: "SYM-BAD", type: "symbol", title: "Bad" },
        { id: "SYM-BAD", source: ".kb/symbols.yaml" },
        context(root),
      ),
    ).rejects.toThrow(OperationError);
  });

  test("rollback treats a throwing readFile as a missing current snapshot", async () => {
    const root = await workspace();
    const fsPort = { ...nodeFilesystem };
    const created = await writeSourceForUpsert(
      {
        type: "req",
        id: "REQ-THROW",
        properties: { title: "Throw" },
        document: { path: "docs/REQ-THROW.md", body: "new\n" },
      },
      { id: "REQ-THROW", type: "req", title: "Throw" },
      undefined,
      context(root, fsPort),
    );
    fsPort.readFile = async () => {
      throw new Error("read failed");
    };
    await created?.rollback();
    await expect(
      readFile(path.join(root, "docs", "REQ-THROW.md"), "utf8"),
    ).rejects.toThrow();
  });

  test("manifestRelationships returns empty for nodes without get()", () => {
    expect(manifestRelationships(null)).toEqual([]);
    expect(manifestRelationships("plain")).toEqual([]);
    expect(manifestRelationships({ get: 12 })).toEqual([]);
  });
});
