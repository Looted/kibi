import { afterAll, describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { DETACHED_SNAPSHOT_KB_BRANCH } from "../../src/utils/branch-resolver.js";
import { branchStorePath } from "../../src/utils/branch-store-locator.js";
import { spawnSync } from "../helpers/isolated-env.js";

// Real temp Git repositories checked out at a bare SHA, driven through the
// built CLI's JSON routes. Reads answer from a read-only snapshot of the
// checkout and say so; writes are refused with the way out.

const kibiBin = path.resolve(__dirname, "../../bin/kibi");
const roots: string[] = [];

type Envelope = {
  status: string;
  data: Record<string, unknown> | null;
  diagnostics: Array<{
    code?: string;
    message: string;
    detail?: Record<string, unknown>;
  }>;
  error?: { code: string; message: string };
};

function git(cwd: string, args: readonly string[]): string {
  const result = spawnSync(
    "git",
    [
      "-c",
      "user.email=test@test.com",
      "-c",
      "user.name=Kibi Test",
      "-c",
      "commit.gpgsign=false",
      "-c",
      "core.hooksPath=/dev/null",
      "-c",
      "advice.detachedHead=false",
      ...args,
    ],
    { cwd, encoding: "utf8" },
  );
  if (result.status !== 0) {
    throw new Error(`git ${args.join(" ")} failed: ${result.stderr}`);
  }
  return result.stdout.trim();
}

function kibi(
  cwd: string,
  args: readonly string[],
  input?: unknown,
): { status: number | null; stdout: string; stderr: string } {
  const result = spawnSync("node", [kibiBin, ...args], {
    cwd,
    encoding: "utf8",
    timeout: 120_000,
    ...(input === undefined ? {} : { input: `${JSON.stringify(input)}\n` }),
  });
  return {
    status: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
  };
}

function route(cwd: string, name: string, input: unknown): Envelope {
  const result = kibi(cwd, [name, "--input", "-"], input);
  return JSON.parse(result.stdout) as Envelope;
}

function writeRequirement(root: string, id: string, title: string): void {
  const dir = path.join(root, ".kb", "requirements");
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    path.join(dir, `${id}.md`),
    `---\nid: ${id}\ntitle: ${title}\ntype: req\nstatus: open\ntags: [auth]\n---\n\n${title}.\n`,
  );
}

/** A repository on `main` with one committed requirement. */
function createRepository(): string {
  const root = mkdtempSync(path.join(os.tmpdir(), "kibi-detached-"));
  roots.push(root);
  git(root, ["init", "-q", "-b", "main"]);
  const init = kibi(root, ["init", "--no-hooks"]);
  if (init.status !== 0) throw new Error(`kibi init failed: ${init.stderr}`);
  writeRequirement(root, "REQ-demo-login", "Users log in with a password");
  git(root, ["add", "-A"]);
  git(root, ["commit", "-q", "-m", "init"]);
  return root;
}

/** Content digest of a directory tree; "missing" when it does not exist. */
function treeDigest(dir: string): string {
  if (!existsSync(dir)) return "missing";
  const hash = createHash("sha256");
  const visit = (current: string): void => {
    for (const entry of readdirSync(current, { withFileTypes: true }).sort(
      (left, right) => left.name.localeCompare(right.name),
    )) {
      const full = path.join(current, entry.name);
      hash.update(path.relative(dir, full));
      if (entry.isDirectory()) visit(full);
      else if (entry.isFile()) hash.update(readFileSync(full));
    }
  };
  visit(dir);
  return hash.digest("hex");
}

function queryIds(envelope: Envelope): string[] {
  const entities = (envelope.data?.entities ?? []) as Array<{ id: string }>;
  return entities.map((entity) => entity.id).sort();
}

function detachedNotice(envelope: Envelope) {
  return envelope.diagnostics.find(
    (diagnostic) => diagnostic.code === "detached_head_read_only",
  );
}

afterAll(() => {
  for (const root of roots.splice(0)) {
    kibi(root, ["engine", "stop"]);
    rmSync(root, { recursive: true, force: true });
  }
});

describe("detached HEAD (bare SHA) workspaces", () => {
  test("answer reads from the checkout's snapshot and refuse writes when no branch points at HEAD", () => {
    const root = createRepository();
    const mainStore = branchStorePath(root, "main");
    const mainStoreBefore = treeDigest(mainStore);
    git(root, ["checkout", "-q", "--detach"]);
    writeRequirement(root, "REQ-demo-logout", "Users log out");
    git(root, ["add", "-A"]);
    git(root, ["commit", "-q", "-m", "detached only"]);
    const head = git(root, ["rev-parse", "HEAD"]);
    const snapshotStore = branchStorePath(root, DETACHED_SNAPSHOT_KB_BRANCH);

    const query = route(root, "query", { type: "req" });
    expect(query.status).toBe("success");
    // The requirement committed only on the detached SHA is visible.
    expect(queryIds(query)).toEqual(["REQ-demo-login", "REQ-demo-logout"]);
    const notice = detachedNotice(query);
    expect(notice?.message).toContain(snapshotStore);
    expect(notice?.message).toContain("writes are refused");
    expect(notice?.detail).toEqual({
      head,
      branchesAtHead: [],
      kbBranch: DETACHED_SNAPSHOT_KB_BRANCH,
      storePath: snapshotStore,
      writes: "refused",
    });

    const status = route(root, "status", {});
    expect(status.status).toBe("success");
    expect(status.data?.branchAttachment).toMatchObject({
      kind: "detached_snapshot",
      kbBranch: DETACHED_SNAPSHOT_KB_BRANCH,
    });
    expect(status.data?.syncState).toBe("fresh");
    expect(detachedNotice(status)).toBeDefined();

    const upsert = kibi(root, ["upsert", "--input", "-"], {
      type: "req",
      id: "REQ-demo-refused",
      properties: { title: "Refused", status: "open" },
    });
    expect(upsert.status).not.toBe(0);
    expect(`${upsert.stdout}${upsert.stderr}`).toContain(
      "kb_upsert writes the branch KB",
    );
    expect(`${upsert.stdout}${upsert.stderr}`).toContain(
      "git switch -c <branch>",
    );
    expect(
      existsSync(path.join(root, ".kb", "requirements", "REQ-demo-refused.md")),
    ).toBe(false);

    const sync = kibi(root, ["sync"]);
    expect(sync.status).not.toBe(0);
    expect(`${sync.stdout}${sync.stderr}`).toContain(
      "kibi sync writes the branch KB",
    );
    // No branch KB was guessed or written for the detached checkout.
    expect(treeDigest(mainStore)).toBe(mainStoreBefore);
  }, 240_000);

  test("does not choose between two branches at HEAD", () => {
    const root = createRepository();
    git(root, ["branch", "release"]);
    git(root, ["checkout", "-q", "--detach"]);

    const query = route(root, "query", { type: "req" });
    expect(query.status).toBe("success");
    expect(queryIds(query)).toEqual(["REQ-demo-login"]);
    expect(detachedNotice(query)?.detail).toMatchObject({
      branchesAtHead: ["main", "release"],
      kbBranch: DETACHED_SNAPSHOT_KB_BRANCH,
    });

    const upsert = kibi(root, ["upsert", "--input", "-"], {
      type: "req",
      id: "REQ-demo-refused",
      properties: { title: "Refused", status: "open" },
    });
    expect(upsert.status).not.toBe(0);
    expect(`${upsert.stdout}${upsert.stderr}`).toContain(
      "'git switch main' (or another branch at HEAD)",
    );
  }, 240_000);

  test("serves a CI-style shallow checkout of a SHA with no local branch", () => {
    const origin = createRepository();
    const head = git(origin, ["rev-parse", "HEAD"]);
    const ci = mkdtempSync(path.join(os.tmpdir(), "kibi-detached-ci-"));
    roots.push(ci);
    git(ci, ["init", "-q", "-b", "main"]);
    git(ci, [
      "fetch",
      "-q",
      "--depth",
      "1",
      `file://${origin}`,
      "+refs/heads/main:refs/remotes/origin/main",
    ]);
    git(ci, ["checkout", "-q", "--detach", head]);
    expect(existsSync(path.join(ci, ".git", "shallow"))).toBe(true);

    const query = route(ci, "query", { id: "REQ-demo-login" });
    expect(query.status).toBe("success");
    expect(queryIds(query)).toEqual(["REQ-demo-login"]);
    expect(detachedNotice(query)?.detail).toMatchObject({
      head,
      branchesAtHead: [],
    });

    const search = route(ci, "search", { query: "password login" });
    expect(search.status).toBe("success");
    expect(detachedNotice(search)).toBeDefined();

    const check = route(ci, "check", {});
    expect(check.status).not.toBe("error");
    expect(detachedNotice(check)).toBeDefined();
  }, 240_000);
});
