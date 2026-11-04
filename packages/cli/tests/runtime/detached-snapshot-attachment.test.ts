// implements REQ-branch-store-recovery-v4
import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  spyOn,
  test,
} from "bun:test";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import * as sync from "../../src/commands/sync.js";
import {
  DETACHED_HEAD_READ_ONLY_CODE,
  declaresWriteEffect,
  detachedReadOnlyDiagnostic,
  refreshDetachedSnapshot,
  resolveOperationAttachment,
} from "../../src/runtime/detached-snapshot.js";
import {
  type BranchAttachment,
  type BranchResolverDeps,
  _setBranchResolverDepsForTests,
  detachedHeadWriteRefusal,
  resolveReadBranchAttachment,
} from "../../src/utils/branch-resolver.js";

const base = mkdtempSync(path.join(os.tmpdir(), "kibi-detached-op-"));
afterAll(() => rmSync(base, { recursive: true, force: true }));
let counter = 0;
const fresh = () => {
  const dir = path.join(base, `w${counter++}`);
  mkdirSync(dir, { recursive: true });
  return dir;
};

const HEAD = "0123456789abcdef0123456789abcdef01234567";
const SHOW = "git branch --show-current";
const POINTS = "git branch --points-at HEAD --format=%(refname:short)";
const VERIFY = "git rev-parse --verify HEAD";

function git(answers: Record<string, string>): void {
  const answer = (command: string) => {
    if (command.startsWith("git check-ref-format --branch")) return "";
    const value = answers[command];
    if (value === undefined) throw new Error(`unexpected ${command}`);
    return value;
  };
  _setBranchResolverDepsForTests({
    execSync: ((command: string) =>
      answer(command)) as BranchResolverDeps["execSync"],
    execFileSync: ((file: string, args: string[]) =>
      answer([file, ...args].join(" "))) as BranchResolverDeps["execFileSync"],
  });
}
const onBranch = () =>
  git({ [SHOW]: "main", [POINTS]: "main\n", [VERIFY]: HEAD });
const detached = () =>
  git({ [SHOW]: "", [POINTS]: "a\nb\n", [VERIFY]: `${HEAD}\n` });

let savedBranch: string | undefined;
let syncSpy: ReturnType<typeof spyOn<typeof sync, "syncCommand">>;
beforeEach(() => {
  savedBranch = process.env.KIBI_BRANCH;
  Reflect.deleteProperty(process.env, "KIBI_BRANCH");
  syncSpy = spyOn(sync, "syncCommand").mockResolvedValue(
    undefined as unknown as Awaited<ReturnType<typeof sync.syncCommand>>,
  );
});
afterEach(() => {
  syncSpy.mockRestore();
  _setBranchResolverDepsForTests({});
  if (savedBranch === undefined)
    Reflect.deleteProperty(process.env, "KIBI_BRANCH");
  else process.env.KIBI_BRANCH = savedBranch;
});

describe("declaresWriteEffect", () => {
  test("only KB and workspace writes are write effects", () => {
    expect(declaresWriteEffect([])).toBe(false);
    expect(declaresWriteEffect(["kb-read", "workspace-read"])).toBe(false);
    expect(declaresWriteEffect(["kb-read", "kb-write"])).toBe(true);
    expect(declaresWriteEffect(["workspace-write"])).toBe(true);
  });
});

describe("resolveOperationAttachment", () => {
  test("a write on a branch attaches that branch without a snapshot", async () => {
    const root = fresh();
    onBranch();
    const attachment = await resolveOperationAttachment(root, {
      name: "upsert",
      effects: ["kb-write"],
    });
    expect(attachment).toMatchObject({ gitBranch: "main", kbBranch: "main" });
    expect(syncSpy).not.toHaveBeenCalled();
  });

  test("a write on a detached HEAD is refused with the switch advice", async () => {
    const root = fresh();
    detached();
    expect(
      await resolveOperationAttachment(root, {
        name: "upsert",
        effects: ["kb-read", "workspace-write"],
      }),
    ).toStrictEqual({
      error: detachedHeadWriteRefusal("upsert", root),
      code: "DETACHED_HEAD",
    });
    expect(syncSpy).not.toHaveBeenCalled();
  });

  test("other write failures pass through unchanged", async () => {
    const root = fresh();
    git({ [SHOW]: "bad name", [POINTS]: "", [VERIFY]: HEAD });
    expect(
      await resolveOperationAttachment(root, {
        name: "upsert",
        effects: ["kb-write"],
      }),
    ).toStrictEqual({
      error: "Invalid branch name detected: 'bad name'",
      code: "UNKNOWN_ERROR",
    });
  });

  test("a KB read on a detached HEAD compiles the snapshot first", async () => {
    const root = fresh();
    detached();
    const attachment = await resolveOperationAttachment(root, {
      name: "query",
      effects: ["kb-read"],
    });
    expect(attachment).toStrictEqual(resolveReadBranchAttachment(root));
    expect(syncSpy).toHaveBeenCalledTimes(1);
    expect<unknown>(syncSpy.mock.calls[0]).toEqual([
      { workspaceRoot: root, detachedSnapshot: attachment, quiet: true },
    ]);
  });

  test("a read that needs no KB, or a read on a branch, compiles nothing", async () => {
    const root = fresh();
    detached();
    const attachment = await resolveOperationAttachment(root, {
      name: "status",
      effects: ["workspace-read"],
    });
    expect(attachment).toMatchObject({ kind: "detached_snapshot" });
    onBranch();
    expect(
      await resolveOperationAttachment(root, {
        name: "query",
        effects: ["kb-read"],
      }),
    ).toMatchObject({ gitBranch: "main" });
    git({ [SHOW]: "bad name", [POINTS]: "", [VERIFY]: HEAD });
    expect(
      await resolveOperationAttachment(root, {
        name: "query",
        effects: ["kb-read"],
      }),
    ).toMatchObject({ code: "UNKNOWN_ERROR" });
    expect(syncSpy).not.toHaveBeenCalled();
  });
});

describe("refreshDetachedSnapshot", () => {
  const attachment = { kbBranch: "x" } as unknown as BranchAttachment;

  test("a failed compile names the detached snapshot", async () => {
    syncSpy.mockRejectedValueOnce(new Error("store locked"));
    await expect(refreshDetachedSnapshot("/w", attachment)).rejects.toThrow(
      "Failed to compile the read-only snapshot for this detached HEAD: store locked",
    );
    syncSpy.mockRejectedValueOnce("plain failure");
    await expect(refreshDetachedSnapshot("/w", attachment)).rejects.toThrow(
      "Failed to compile the read-only snapshot for this detached HEAD: plain failure",
    );
  });
});

describe("detachedReadOnlyDiagnostic", () => {
  test("only a read-only attachment carries the warning", () => {
    expect(detachedReadOnlyDiagnostic(undefined)).toBeUndefined();
    expect(
      detachedReadOnlyDiagnostic({
        kbBranch: "main",
      } as unknown as BranchAttachment),
    ).toBeUndefined();
    const root = fresh();
    detached();
    const attachment = resolveReadBranchAttachment(root) as BranchAttachment;
    expect(DETACHED_HEAD_READ_ONLY_CODE).toBe("detached_head_read_only");
    expect(detachedReadOnlyDiagnostic(attachment)).toStrictEqual({
      code: "detached_head_read_only",
      severity: "warning",
      message: attachment.readOnly?.notice as string,
      detail: {
        head: HEAD,
        branchesAtHead: ["a", "b"],
        kbBranch: attachment.kbBranch,
        storePath: attachment.storePath,
        writes: "refused",
      },
    });
  });
});
