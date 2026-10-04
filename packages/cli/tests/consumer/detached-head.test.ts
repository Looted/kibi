// implements REQ-branch-store-recovery-v4
import { afterEach, describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import path from "node:path";
import {
  type ConsumerWorkspace,
  type Json,
  createConsumerWorkspace,
  doc,
} from "./workspace.js";

/**
 * Consumer view of a bare-SHA checkout: the KB is committed on `main`,
 * `main` moves on, and the first commit is checked out detached so no local
 * branch points at HEAD. Reads answer from a read-only snapshot compiled
 * from that checkout; writes are refused and no branch KB is touched.
 */

let workspace: ConsumerWorkspace | undefined;

afterEach(() => {
  workspace?.cleanup();
  workspace = undefined;
});

type Notice = {
  code: string;
  severity: string;
  message: string;
  detail: {
    head: string;
    branchesAtHead: string[];
    kbBranch: string;
    storePath: string;
    writes: string;
  };
};

function detachedNotice(envelope: Json): Notice | undefined {
  return (envelope.diagnostics as Notice[]).find(
    (diagnostic) => diagnostic.code === "detached_head_read_only",
  );
}

function ids(envelope: Json): string[] {
  const data = envelope.data as { entities: Array<{ id: string }> };
  return data.entities.map((entity) => entity.id).sort();
}

const REQUIREMENT = doc(
  `
id: REQ-login-password
title: Users log in with a password
type: req
status: open
links:
  - type: specified_by
    target: SCEN-login-password
`,
  "Users log in with a password.",
);

function scenario(id: string, title: string): string {
  return doc(
    `
id: ${id}
title: ${title}
type: scenario
status: active
`,
    `Given a registered user, ${title.toLowerCase()}.`,
  );
}

describe("detached HEAD checkouts through the kibi CLI", () => {
  test("answer query, search and status from a read-only snapshot of the checkout and refuse upsert", () => {
    const ws = createConsumerWorkspace("kibi-detached-head-");
    workspace = ws;

    ws.write(".kb/requirements/REQ-login-password.md", REQUIREMENT);
    ws.write(
      ".kb/scenarios/SCEN-login-password.md",
      scenario("SCEN-login-password", "The user logs in with a password"),
    );
    ws.git("add", "-A");
    ws.git("commit", "-q", "-m", "login requirement");
    const first = ws.git("rev-parse", "HEAD");
    ws.sync();

    // main moves on: a second scenario lands after the first commit.
    ws.write(
      ".kb/scenarios/SCEN-login-passkey.md",
      scenario("SCEN-login-passkey", "The user logs in with a passkey"),
    );
    ws.git("add", "-A");
    ws.git("commit", "-q", "-m", "passkey scenario");
    ws.sync();
    expect(ids(ws.json(["query"], { type: "scenario" }))).toEqual([
      "SCEN-login-passkey",
      "SCEN-login-password",
    ]);
    const mainSnapshot = (ws.json(["status"], {}).data as Json).snapshotId;
    ws.kibi(["engine", "stop"]);

    ws.git("checkout", "-q", "--detach", first);
    expect(ws.git("branch", "--points-at", "HEAD")).not.toMatch(
      /^\*?\s*main$/m,
    );

    // query: the snapshot holds exactly what the checked-out commit tracks,
    // not main's KB, and says so.
    const query = ws.json(["query"], { type: "scenario" });
    expect(query.status).toBe("success");
    expect(ids(query)).toEqual(["SCEN-login-password"]);
    const notice = detachedNotice(query);
    expect(notice).toMatchObject({
      severity: "warning",
      detail: {
        head: first,
        branchesAtHead: [],
        kbBranch: "kibi-internal/detached-head-snapshot",
        writes: "refused",
      },
    });
    const storePath = notice?.detail.storePath ?? "";
    expect(path.isAbsolute(storePath)).toBe(true);
    expect(existsSync(storePath)).toBe(true);
    expect(notice?.message).toContain(first.slice(0, 12));
    expect(notice?.message).toContain(storePath);
    expect(notice?.message).toContain("writes are refused");
    expect(ids(ws.json(["query"], { type: "req" }))).toEqual([
      "REQ-login-password",
    ]);

    // search answers from the same snapshot.
    const search = ws.json(["search"], { query: "log in with a password" });
    expect(search.status).toBe("success");
    const results = (search.data as { results: Array<{ entity: Json }> })
      .results;
    expect(results.map((result) => result.entity.id)).toContain(
      "REQ-login-password",
    );
    expect(results.map((result) => result.entity.id)).not.toContain(
      "SCEN-login-passkey",
    );
    expect(detachedNotice(search)?.detail).toEqual(notice?.detail);

    // status reports the snapshot attachment as fresh and read-only.
    const status = ws.json(["status"], {});
    expect(status.status).toBe("success");
    expect(status.data).toMatchObject({
      branch: "kibi-internal/detached-head-snapshot",
      kbPath: storePath,
      syncState: "fresh",
      branchAttachment: {
        gitBranch: "HEAD",
        kind: "detached_snapshot",
        kbBranch: "kibi-internal/detached-head-snapshot",
        storePath,
        readOnly: { head: first, branchesAtHead: [] },
      },
    });
    expect(detachedNotice(status)?.detail).toEqual(notice?.detail);

    // upsert is refused before anything is written, and the refusal names
    // the way out.
    const upsert = ws.kibi(["upsert"], {
      input: {
        type: "scenario",
        id: "SCEN-login-refused",
        properties: { title: "A refused scenario", status: "active" },
      },
    });
    expect(upsert.status).toBe(1);
    expect(upsert.stdout.trim()).toBe("");
    expect(upsert.stderr).toContain(
      `kb_upsert writes the branch KB, but HEAD is detached at ${first.slice(0, 12)} and no local branch points at it.`,
    );
    expect(upsert.stderr).toContain("'git switch -c <branch>'");
    expect(upsert.stderr).toContain("KIBI_BRANCH");
    expect(
      existsSync(path.join(ws.root, ".kb/scenarios/SCEN-login-refused.md")),
    ).toBe(false);
    expect(ids(ws.json(["query"], { type: "scenario" }))).toEqual([
      "SCEN-login-password",
    ]);
    ws.kibi(["engine", "stop"]);

    // Back on main: its KB was neither guessed for the detached checkout
    // nor written while it was attached.
    ws.git("switch", "-q", "main");
    expect((ws.json(["status"], {}).data as Json).snapshotId).toBe(
      mainSnapshot,
    );
    expect(ids(ws.json(["query"], { type: "scenario" }))).toEqual([
      "SCEN-login-passkey",
      "SCEN-login-password",
    ]);
  }, 300_000);
});
