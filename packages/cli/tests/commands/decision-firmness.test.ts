import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { isolatedCliSandboxEnv } from "../helpers/isolated-env.js";
import {
  type ParityWorkspace,
  createParityWorkspace,
} from "../parity/helpers.js";

const kibiBin = fileURLToPath(new URL("../../bin/kibi", import.meta.url));

async function route(
  workspace: ParityWorkspace,
  name: string,
  input: Record<string, unknown>,
): Promise<{
  exitCode: number;
  stdout: string;
  json: Record<string, unknown>;
}> {
  const child = Bun.spawn(["bun", "run", kibiBin, name, "--input", "-"], {
    cwd: workspace.root,
    env: isolatedCliSandboxEnv({ KIBI_WORKSPACE: workspace.root }),
    stdin: new Blob([JSON.stringify(input)]),
    stdout: "pipe",
    stderr: "pipe",
  });
  const [exitCode, stdout] = await Promise.all([
    child.exited,
    new Response(child.stdout).text(),
  ]);
  let json: Record<string, unknown> = {};
  try {
    json = JSON.parse(stdout) as Record<string, unknown>;
  } catch {
    // Non-JSON output is asserted through stdout.
  }
  return { exitCode, stdout, json };
}

async function queried(workspace: ParityWorkspace, id: string) {
  const { json } = await route(workspace, "query", { id });
  const data = json.data as { entities?: Array<Record<string, unknown>> };
  return data.entities?.find((entity) => entity.id === id);
}

const WHY =
  "## Why this changed\nA failing end-to-end test showed the old limit dropped valid carts at the boundary, which the old decision never considered.";

describe("decision firmness through the public routes", () => {
  let workspace: ParityWorkspace;

  beforeAll(async () => {
    workspace = await createParityWorkspace();
  }, 60_000);

  afterAll(async () => {
    await workspace?.cleanup();
  });

  test("kb_upsert refuses a firm decision without a reference and writes nothing", async () => {
    const result = await route(workspace, "upsert", {
      type: "req",
      id: "REQ-FIRM-NOREF",
      properties: {
        title: "Firm without ref",
        status: "open",
        firmness: "firm",
      },
    });
    expect(result.exitCode).not.toBe(0);
    expect(result.stdout).toContain("firmness: firm needs origin.ref");
    expect(await queried(workspace, "REQ-FIRM-NOREF")).toBeUndefined();
  }, 60_000);

  test("kb_query shows firm for a referenced decision and default when unset", async () => {
    const firm = await route(workspace, "upsert", {
      type: "req",
      id: "REQ-FIRM-REF",
      properties: {
        title: "Firm with ref",
        status: "open",
        firmness: "firm",
        origin: { kind: "human", ref: "ticket-7" },
      },
    });
    expect(firm.exitCode, firm.stdout).toBe(0);
    const plain = await route(workspace, "upsert", {
      type: "req",
      id: "REQ-FIRM-PLAIN",
      properties: { title: "No firmness", status: "open" },
    });
    expect(plain.exitCode, plain.stdout).toBe(0);

    expect((await queried(workspace, "REQ-FIRM-REF"))?.firmness).toBe("firm");

    // An update that omits firmness keeps it and is judged with it.
    const reprioritized = await route(workspace, "upsert", {
      type: "req",
      id: "REQ-FIRM-REF",
      properties: { title: "Firm with ref", status: "open", priority: "must" },
    });
    expect(reprioritized.exitCode, reprioritized.stdout).toBe(0);
    expect((await queried(workspace, "REQ-FIRM-REF"))?.firmness).toBe("firm");
    const dropsRef = await route(workspace, "upsert", {
      type: "req",
      id: "REQ-FIRM-REF",
      properties: {
        title: "Firm with ref",
        status: "open",
        origin: { kind: "agent" },
      },
    });
    expect(dropsRef.exitCode).not.toBe(0);
    expect(dropsRef.stdout).toContain("firmness: firm needs origin.ref");
    expect((await queried(workspace, "REQ-FIRM-REF"))?.origin).toMatchObject({
      ref: "ticket-7",
    });
    expect((await queried(workspace, "REQ-FIRM-PLAIN"))?.firmness).toBe(
      "default",
    );
  }, 60_000);

  test("kb_check blocks an unexplained supersede and a default decision replacing a firm one", async () => {
    const replacement = await route(workspace, "upsert", {
      type: "req",
      id: "REQ-FIRM-NEXT",
      properties: { title: "Replaces the firm decision", status: "open" },
      relationships: [
        { type: "supersedes", from: "REQ-FIRM-NEXT", to: "REQ-FIRM-REF" },
      ],
    });
    expect(replacement.exitCode, replacement.stdout).toBe(0);

    const check = await route(workspace, "check", {
      rules: ["decision-firm-superseded", "supersedes-reason-missing"],
    });
    const violations = (
      (check.json.data as { violations?: Array<Record<string, unknown>> })
        ?.violations ?? []
    ).map((violation) => `${violation.rule}:${violation.entityId}`);
    expect(violations).toContain("decision-firm-superseded:REQ-FIRM-NEXT");
    expect(violations).toContain("supersedes-reason-missing:REQ-FIRM-NEXT");

    const explained = await route(workspace, "upsert", {
      type: "req",
      id: "REQ-FIRM-NEXT",
      properties: {
        title: "Replaces the firm decision",
        status: "open",
        firmness: "firm",
        origin: { kind: "human", ref: "ticket-8" },
      },
      document: { body: `Replaces the firm decision.\n\n${WHY}\n` },
    });
    expect(explained.exitCode, explained.stdout).toBe(0);
    const recheck = await route(workspace, "check", {
      rules: ["decision-firm-superseded", "supersedes-reason-missing"],
    });
    const remaining = (
      (recheck.json.data as { violations?: Array<Record<string, unknown>> })
        ?.violations ?? []
    ).filter((violation) => violation.entityId === "REQ-FIRM-NEXT");
    expect(remaining).toEqual([]);
  }, 120_000);
});

function git(root: string, args: readonly string[]): void {
  execFileSync(
    "git",
    [
      "-c",
      "user.name=Kibi Test",
      "-c",
      "user.email=test@kibi.invalid",
      ...args,
    ],
    { cwd: root, stdio: "pipe" },
  );
}

// An imported rule: no firmness and no agent origin, so it reads as firm.
const IMPORTED_RULE = `---
id: REQ-FIRM-IMPORTED
type: req
title: Carts hold at most 50 items
status: open
priority: must
origin:
  kind: import
  ref: docs/policy.md#L4
---
Carts hold at most 50 items.

## Context
The warehouse picker handles one cart per trip.
`;

async function violationsOf(
  workspace: ParityWorkspace,
  rule: string,
): Promise<Array<Record<string, unknown>>> {
  const check = await route(workspace, "check", { rules: [rule] });
  return (
    (check.json.data as { violations?: Array<Record<string, unknown>> })
      ?.violations ?? []
  ).filter((violation) => violation.rule === rule);
}

describe("firm decisions are not edited in place", () => {
  let workspace: ParityWorkspace;
  let rulePath: string;

  beforeAll(async () => {
    workspace = await createParityWorkspace();
    rulePath = path.join(
      workspace.root,
      ".kb/requirements/REQ-FIRM-IMPORTED.md",
    );
    await mkdir(path.dirname(rulePath), { recursive: true });
    await writeFile(rulePath, IMPORTED_RULE, "utf8");
    // Sync compiles the staged snapshot.
    git(workspace.root, ["add", "-A"]);
    const synced = Bun.spawnSync(["bun", "run", kibiBin, "sync"], {
      cwd: workspace.root,
      env: isolatedCliSandboxEnv({ KIBI_WORKSPACE: workspace.root }),
    });
    expect(synced.exitCode, synced.stdout.toString()).toBe(0);
    git(workspace.root, ["add", "-A"]);
    git(workspace.root, ["commit", "-q", "-m", "seed"]);
  }, 120_000);

  afterAll(async () => {
    await workspace?.cleanup();
  });

  test("kb_upsert refuses to change a firm rule's statement or title and writes nothing", async () => {
    const body = await route(workspace, "upsert", {
      type: "req",
      id: "REQ-FIRM-IMPORTED",
      properties: { title: "Carts hold at most 50 items", status: "open" },
      document: {
        body: "Carts hold at most 80 items.\n\n## Context\nThe warehouse picker handles one cart per trip.\n",
      },
    });
    expect(body.exitCode).not.toBe(0);
    expect(body.stdout).toContain(
      "REQ-FIRM-IMPORTED is a firm decision, so kb_upsert does not change its statement in place",
    );

    const dryRun = await route(workspace, "upsert", {
      type: "req",
      id: "REQ-FIRM-IMPORTED",
      properties: { title: "Carts hold at most 80 items", status: "open" },
      dryRun: true,
    });
    expect(dryRun.stdout).toContain("does not change its title in place");
    expect((dryRun.json.data as { valid?: boolean } | undefined)?.valid).toBe(
      false,
    );

    // Relabelling it as an agent's choice does not make it editable.
    const downgraded = await route(workspace, "upsert", {
      type: "req",
      id: "REQ-FIRM-IMPORTED",
      properties: {
        title: "Carts hold at most 50 items",
        status: "open",
        firmness: "default",
      },
    });
    expect(downgraded.exitCode).not.toBe(0);
    expect(downgraded.stdout).toContain(
      "does not change its firmness in place",
    );

    expect(await readFile(rulePath, "utf8")).toBe(IMPORTED_RULE);
  }, 120_000);

  test("kb_upsert keeps context and metadata edits open on a firm rule", async () => {
    const result = await route(workspace, "upsert", {
      type: "req",
      id: "REQ-FIRM-IMPORTED",
      properties: {
        title: "Carts hold at most 50 items",
        status: "open",
        tags: ["carts"],
      },
      document: {
        body: "Carts hold at most 50 items.\n\n## Context\nThe warehouse picker handles one cart per trip, and larger carts block the aisle.\n",
      },
    });
    expect(result.exitCode, result.stdout).toBe(0);
    expect(await violationsOf(workspace, "decision-firm-edited")).toEqual([]);
  }, 120_000);

  test("kb_check reports a firm rule edited on disk since HEAD until the edit cites new human words", async () => {
    git(workspace.root, ["add", "-A"]);
    git(workspace.root, ["commit", "-q", "-m", "context"]);
    const committed = await readFile(rulePath, "utf8");
    await writeFile(
      rulePath,
      committed.replace(
        "Carts hold at most 50 items.\n",
        "Carts hold at most 80 items.\n",
      ),
      "utf8",
    );
    const edited = await violationsOf(workspace, "decision-firm-edited");
    expect(edited.map((violation) => violation.entityId)).toEqual([
      "REQ-FIRM-IMPORTED",
    ]);
    expect(String(edited[0]?.description)).toContain(
      "statement changed since HEAD",
    );

    await writeFile(
      rulePath,
      committed
        .replace(
          "Carts hold at most 50 items.\n",
          "Carts hold at most 80 items.\n",
        )
        .replace("ref: docs/policy.md#L4", "ref: ticket-12"),
      "utf8",
    );
    expect(await violationsOf(workspace, "decision-firm-edited")).toEqual([]);
    await writeFile(rulePath, committed, "utf8");
  }, 120_000);

  test("kb_upsert applies a firm rule change that cites the person's words", async () => {
    const result = await route(workspace, "upsert", {
      type: "req",
      id: "REQ-FIRM-IMPORTED",
      properties: {
        title: "Carts hold at most 80 items",
        status: "open",
        origin: { kind: "human", ref: "ticket-12" },
      },
      document: {
        body: "Carts hold at most 80 items.\n\n## Context\nThe warehouse picker handles one cart per trip.\n",
      },
    });
    expect(result.exitCode, result.stdout).toBe(0);
    expect((await queried(workspace, "REQ-FIRM-IMPORTED"))?.title).toBe(
      "Carts hold at most 80 items",
    );
    expect(await violationsOf(workspace, "decision-firm-edited")).toEqual([]);
  }, 120_000);
});
