import { describe, expect, test } from "bun:test";
import {
  SyncError,
  pendingSourceEscapesError,
  pendingSourceHashDriftError,
  pendingSourceMissingError,
} from "../../src/commands/sync/errors.js";

describe("sync refusals", () => {
  test("a SyncError carries its name, message and code", () => {
    const error = new SyncError("refused", "SOME_CODE");
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("SyncError");
    expect(error.message).toBe("refused");
    expect(error.code).toBe("SOME_CODE");
    expect(new SyncError("refused").code).toBeUndefined();
  });

  test("a pending source outside the workspace or gone names the path and the fix", () => {
    const escapes = pendingSourceEscapesError("../x.md");
    expect(escapes).toBeInstanceOf(SyncError);
    expect(escapes.code).toBe("PENDING_SOURCE_ESCAPES_WORKSPACE");
    expect(escapes.message).toBe(
      "Pending source path escapes workspace: ../x.md",
    );

    const missing = pendingSourceMissingError(".kb/requirements/a.md");
    expect(missing.code).toBe("PENDING_SOURCE_MISSING");
    expect(missing.message).toBe(
      "Pending source is missing: .kb/requirements/a.md. If the file was deleted on purpose, run 'kibi branch recover --apply' to rebuild the branch KB from the sources that remain.",
    );
  });

  test("hash drift names both hashes only when both are known", () => {
    const tail = (file: string) =>
      `. Kibi wrote this untracked file and it was edited outside Kibi since. To keep the edit, stage the file (git add ${file}) so Git tracks the bytes Kibi compiles, then run 'kibi sync' again; or write the change through kb_upsert (CLI: kibi upsert), which records the new bytes. 'kibi branch recover --apply' does not resolve this.`;
    const both = pendingSourceHashDriftError("a.md", "aaa", "bbb");
    expect(both.code).toBe("PENDING_SOURCE_HASH_DRIFT");
    expect(both.message).toBe(
      `Pending source hash drift blocks sync for a.md; expected aaa, found bbb${tail("a.md")}`,
    );
    for (const error of [
      pendingSourceHashDriftError("a.md"),
      pendingSourceHashDriftError("a.md", "aaa"),
      pendingSourceHashDriftError("a.md", undefined, "bbb"),
    ])
      expect(error.message).toBe(
        `Pending source hash drift blocks sync for a.md${tail("a.md")}`,
      );
  });
});
