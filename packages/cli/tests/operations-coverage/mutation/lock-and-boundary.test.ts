import { afterEach, describe, expect, test } from "bun:test";
import fs from "node:fs";
import { assertStoredRequirementBoundary } from "../../../src/operations/mutation/requirement-semantics.js";
import type { StoredEntityLookup } from "../../../src/operations/mutation/stored-entity.js";
import {
  type WorkspaceMutationLockFileSystem,
  acquireWorkspaceMutationLock,
  releaseWorkspaceMutationLock,
} from "../../../src/operations/mutation/workspace-mutation-lock.js";
import { scratch } from "../helpers.js";

const cleanups: (() => void)[] = [];
afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup();
});

describe("workspace mutation lock owner record", () => {
  const busy = () => Object.assign(new Error("busy"), { code: "EBUSY" });
  const fileSystem = (
    writeOwner: (target: string, data: string) => void,
  ): WorkspaceMutationLockFileSystem => ({
    mkdirSync: (target, options) => fs.mkdirSync(target, options),
    readFileSync: (target) => fs.readFileSync(target, "utf8"),
    writeFileSync: (target, data, options) =>
      target.endsWith("owner.json")
        ? writeOwner(target, data)
        : fs.writeFileSync(target, data, options),
    unlinkSync: (target) => fs.unlinkSync(target),
    rmdirSync: (target) => fs.rmdirSync(target),
  });

  test("retries a transient failure that left no owner file", async () => {
    const workspace = scratch();
    cleanups.push(workspace.cleanup);
    let attempts = 0;
    const handle = await acquireWorkspaceMutationLock(workspace.root, {
      fileSystem: fileSystem((target, data) => {
        attempts += 1;
        if (attempts === 1) throw busy();
        fs.writeFileSync(target, data, { flag: "wx" });
      }),
    });
    expect(attempts).toBe(2);
    releaseWorkspaceMutationLock(handle);
  });

  test("does not retry a transient failure once the owner file exists", async () => {
    const workspace = scratch();
    cleanups.push(workspace.cleanup);
    let attempts = 0;
    await expect(
      acquireWorkspaceMutationLock(workspace.root, {
        fileSystem: fileSystem((target, data) => {
          attempts += 1;
          fs.writeFileSync(target, data, { flag: "wx" });
          throw busy();
        }),
      }),
    ).rejects.toThrow("busy");
    expect(attempts).toBe(1);
  });
});

describe("assertStoredRequirementBoundary", () => {
  const prose = "The service must log every request it receives.";
  const prolog = { query: async () => ({ success: true, bindings: {} }) };
  const lookup = (
    stored: Record<string, unknown>,
    keepsSemanticBaseline?: (hash: string) => boolean,
  ): StoredEntityLookup => ({
    exists: async () => true,
    entity: async () => stored,
    ...(keepsSemanticBaseline ? { keepsSemanticBaseline } : {}),
  });
  const write = (
    properties: Record<string, unknown>,
    stored: StoredEntityLookup,
  ) =>
    assertStoredRequirementBoundary(
      { type: "req", id: "REQ-b", properties } as never,
      [],
      prolog,
      undefined,
      stored,
    );
  const refusal =
    "Proposition-complete ingestion failed: REQ-b would be written as a current requirement without a complete proposition inventory (";

  test("refuses changed prose of a stored current requirement", async () => {
    await expect(
      write(
        { semantic_text: prose },
        lookup({ status: "open", semantic_text: "Old prose must stay." }),
      ),
    ).rejects.toThrow(refusal);
    // Unchanged legacy prose keeps being accepted.
    await write(
      { title: "Renamed" },
      lookup({ status: "open", semantic_text: prose }),
    );
  });

  test("judges an uncompiled requirement by the baseline its last sync kept", async () => {
    const hashes: string[] = [];
    await write(
      { semantic_text: prose },
      lookup({ status: "open" }, (hash) => {
        hashes.push(hash);
        return true;
      }),
    );
    expect(hashes).toHaveLength(1);
    await expect(
      write(
        { semantic_text: prose },
        lookup({ status: "open" }, () => false),
      ),
    ).rejects.toThrow(refusal);
    await expect(
      write(
        { semantic_text: prose, semantic_inventory_version: 1 },
        lookup({ status: "open" }, () => true),
      ),
    ).rejects.toThrow(refusal);
  });
});
