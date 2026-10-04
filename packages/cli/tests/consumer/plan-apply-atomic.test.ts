// implements REQ-kibi-change-to-proof-plan-compiler-v2
import { afterEach, describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmdirSync,
  statSync,
} from "node:fs";
import path from "node:path";
import {
  type ConsumerWorkspace,
  type Json,
  createConsumerWorkspace,
} from "./workspace.js";

/**
 * Consumer view of atomic compile-plan application: `kibi compile-intent`
 * plans a requirement with its scenario, test and rule facts, and
 * `kibi apply-plan` lands all of it in one store commit or none of it, each
 * entity written to its authored document so a rebuild keeps it. An
 * interrupted application leaves its journal and partly published files on
 * disk; the next mutating call, or an explicit recoveryJournalId, settles it.
 */

let workspace: ConsumerWorkspace | undefined;

afterEach(() => {
  workspace?.cleanup();
  workspace = undefined;
});

const REQ = "REQ-checkout-positive-total";
const SCEN = "SCEN-checkout-positive-total";
const TEST = "TEST-checkout-positive-total";
/** The authored requirement document the plan targets outside `.kb`. */
const DOC = "docs/requirements/checkout-positive-total.md";

type Relationship = { type: string; from?: string; to: string };
type PlanStep = {
  type: string;
  id: string;
  properties: Json;
  relationships?: Relationship[];
  document?: { path?: string; body?: string };
};
type CompilePlan = Json & {
  planHash: string;
  status: string;
  steps: PlanStep[];
  sourceWrites: unknown[];
};

type JournalFile = {
  path: string;
  origin: "plan" | "entity-document" | "relationship-shard";
  mode: "write";
  before: null;
  beforeHash: null;
  after: string;
  afterHash: string;
};
type Journal = Json & {
  state: string;
  resolution?: { action: string; by: string };
  files: JournalFile[];
  store: Json & { entries: unknown[] };
};

function sha256(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

function compilePlan(ws: ConsumerWorkspace): CompilePlan {
  const result = ws.json(["compile-intent"], {
    intent: "Checkout may happen only when the cart total is positive.",
    mode: "create",
    requirementId: REQ,
    sourceLocations: [{ path: DOC }],
    scenarioDrafts: [
      {
        id: SCEN,
        title: "A cart with a positive total checks out",
        body: "A cart with a positive total checks out.",
      },
    ],
    testDrafts: [
      {
        id: TEST,
        title: "Verify: a cart with a positive total checks out",
        body: "Checks that a cart with a positive total checks out.",
        scenarioIds: [SCEN],
      },
    ],
  });
  const plan = result.data as CompilePlan;
  expect({ status: plan.status, diagnostics: plan.diagnostics }).toMatchObject({
    status: "ready",
  });
  expect(plan.steps.map((step) => step.id)).toEqual(
    expect.arrayContaining([REQ, SCEN, TEST]),
  );
  // Every entity is written to its own authored document when the plan
  // applies; the plan carries no free-standing source writes.
  expect(plan.sourceWrites).toEqual([]);
  const requirement = plan.steps.find((step) => step.id === REQ);
  expect(requirement?.document).toEqual({
    path: DOC,
    body: "Checkout may happen only when the cart total is positive.\n",
  });
  for (const step of plan.steps)
    if (step.id !== REQ)
      expect(step.document?.path).toMatch(
        new RegExp(`^\\.kb/[a-z]+/${step.id}\\.md$`),
      );
  return plan;
}

/** The authored documents an application writes, in step order. */
function documentsOf(plan: CompilePlan): string[] {
  return plan.steps.map((step) => step.document?.path as string);
}

function relationshipsOf(plan: CompilePlan): Relationship[] {
  return plan.steps.flatMap((step) =>
    (step.relationships ?? []).map((relationship) => ({
      ...relationship,
      from: relationship.from ?? step.id,
    })),
  );
}

/**
 * Relationship shards the plan's steps append to, in step order. A shard is
 * named by the first two hex digits of SHA-256 of the relationship source.
 */
function shardsOf(plan: CompilePlan): string[] {
  return [
    ...new Set(
      relationshipsOf(plan).map(
        (relationship) =>
          `.kb/relationships/${sha256(relationship.from ?? "").slice(0, 2)}.yaml`,
      ),
    ),
  ];
}

function storeCount(ws: ConsumerWorkspace, id: string): number {
  return (ws.json(["query"], { id }).data as { count: number }).count;
}

function entity(ws: ConsumerWorkspace, id: string): Json {
  return (ws.json(["query"], { id }).data as { entities: Json[] })
    .entities[0] as Json;
}

function journalPath(ws: ConsumerWorkspace, journalId: string): string {
  const kbPath = (ws.json(["status"], {}).data as { kbPath: string }).kbPath;
  return path.join(kbPath, "plan-apply", `${journalId}.json`);
}

function readJournal(file: string): Journal {
  return JSON.parse(readFileSync(file, "utf8")) as Journal;
}

/** Store upserts as the journal records them, one per plan step. */
function storeEntries(plan: CompilePlan): unknown[] {
  return plan.steps.map((step) => ({
    entity: { type: step.type, id: step.id, ...step.properties },
    relationships: step.relationships ?? [],
    skipContradictionCheck: false,
  }));
}

function journalFile(
  relativePath: string,
  origin: JournalFile["origin"],
  after: string,
): JournalFile {
  return {
    path: relativePath,
    origin,
    mode: "write",
    before: null,
    beforeHash: null,
    after,
    afterHash: sha256(after),
  };
}

function renderShard(relationships: readonly Relationship[]): string {
  const rows = relationships.map(
    (relationship) =>
      `  - type: ${relationship.type}\n    from: ${relationship.from}\n    to: ${relationship.to}\n    created_at: "2026-10-01T00:00:00.000Z"\n    created_by: kibi/upsert\n    source: mcp://kibi/upsert\n`,
  );
  return `relationships:\n${rows.join("")}`;
}

function errorOf(stdout: string): { code: string; message: string } {
  return (JSON.parse(stdout) as { error: { code: string; message: string } })
    .error;
}

describe("atomic compile plan application through the kibi CLI", () => {
  test("lands every entity of a compiled plan in one commit and leaves nothing half-written when a file publish fails", () => {
    const ws = createConsumerWorkspace("kibi-plan-atomic-");
    workspace = ws;
    ws.sync();
    const plan = compilePlan(ws);
    const ids = plan.steps.map((step) => step.id);
    const relationships = relationshipsOf(plan);
    const shards = shardsOf(plan);
    expect(shards.length).toBeGreaterThan(0);

    const documents = documentsOf(plan);
    // An empty directory where the last shard goes (invisible to Git, so
    // the plan's snapshots still match) makes its publish fail after every
    // entity document and every earlier shard were already published.
    const blocked = path.join(ws.root, shards.at(-1) as string);
    mkdirSync(blocked, { recursive: true });
    const approval = { plan, approvedPlanHash: plan.planHash };
    const failed = ws.kibi(["apply-plan"], { input: approval });
    expect(failed.status).toBe(1);
    const failure = errorOf(failed.stdout);
    expect(failure.code).toBe("OPERATION_FAILED");
    const restored = failure.message.match(
      /^Apply plan failed while publishing its source writes; no change was applied \(store unchanged, (\d+) source file\(s\) restored from journal (plan-apply-[0-9a-f]+)\)/,
    );
    expect(restored?.[1]).toBe(String(documents.length + shards.length - 1));
    const journalId = restored?.[2] as string;

    for (const document of documents)
      expect(existsSync(path.join(ws.root, document))).toBe(false);
    for (const shard of shards.slice(0, -1))
      expect(existsSync(path.join(ws.root, shard))).toBe(false);
    expect(statSync(blocked).isDirectory()).toBe(true);
    for (const id of ids) expect(storeCount(ws, id)).toBe(0);
    const journal = journalPath(ws, journalId);
    expect(readJournal(journal)).toMatchObject({
      planHash: plan.planHash,
      state: "rolled_back",
      resolution: { action: "rolled_back", by: "apply" },
    });

    // With the obstruction gone the same approved plan applies, all of it.
    rmdirSync(blocked);
    const applied = ws.json(["apply-plan"], approval);
    expect(applied).toMatchObject({
      status: "success",
      data: {
        outcome: "applied",
        planHash: plan.planHash,
        changedEntities: ids.length,
        changedRelationships: relationships.length,
        changedPaths: documents,
        recoveryJournalId: journalId,
        validationSummary: {
          stepsValidated: ids.length,
          stepsApplied: ids.length,
        },
      },
    });
    for (const id of ids) expect(storeCount(ws, id)).toBe(1);
    expect(entity(ws, REQ).specified_by).toContain(`kb:entity/${SCEN}`);
    expect(entity(ws, SCEN).verified_by).toContain(`kb:entity/${TEST}`);
    for (const step of plan.steps)
      expect(ws.read(step.document?.path as string)).toContain(
        `id: ${step.id}`,
      );
    expect(ws.read(DOC)).toContain(
      "Checkout may happen only when the cart total is positive.",
    );
    for (const relationship of relationships) {
      const shard = `.kb/relationships/${sha256(relationship.from ?? "").slice(0, 2)}.yaml`;
      expect(ws.read(shard)).toContain(`from: ${relationship.from}`);
      expect(ws.read(shard)).toContain(`to: ${relationship.to}`);
    }
    expect(readJournal(journal)).toMatchObject({
      state: "committed",
      resolution: { action: "completed", by: "apply" },
    });

    // The documents are the entities' source: rebuilding the store from the
    // checkout keeps every entity and relationship the plan committed.
    // Timestamps are runtime provenance, not authored content, so the
    // rebuild stamps fresh ones.
    const authored = () =>
      ids.map((id) => {
        const {
          created_at: _created,
          updated_at: _updated,
          ...rest
        } = entity(ws, id);
        return rest;
      });
    const before = authored();
    ws.stage();
    ws.text(["sync", "--rebuild"]);
    for (const id of ids) expect(storeCount(ws, id)).toBe(1);
    expect(authored()).toEqual(before);
    expect(entity(ws, REQ).source).toBe(DOC);
  }, 300_000);

  test("rolls back an application that died while publishing on the next kibi upsert", () => {
    const ws = createConsumerWorkspace("kibi-plan-interrupted-");
    workspace = ws;
    ws.sync();
    const plan = compilePlan(ws);
    const ids = plan.steps.map((step) => step.id);
    const relationships = relationshipsOf(plan);
    const journalId = `plan-apply-${plan.planHash.slice(0, 16)}`;

    // What the crash left on disk: a prepared journal naming every file the
    // plan publishes (each entity document, then each shard), the files
    // already published, and a staged temp file for the one in flight.
    const files: JournalFile[] = [
      ...plan.steps.map((step) =>
        journalFile(
          step.document?.path as string,
          "entity-document",
          `---\nid: ${step.id}\n---\n`,
        ),
      ),
      ...shardsOf(plan).map((shard) =>
        journalFile(
          shard,
          "relationship-shard",
          renderShard(
            relationships.filter(
              (relationship) =>
                `.kb/relationships/${sha256(relationship.from ?? "").slice(0, 2)}.yaml` ===
                shard,
            ),
          ),
        ),
      ),
    ];
    const inFlight = files.at(-1) as JournalFile;
    for (const file of files.slice(0, -1)) ws.write(file.path, file.after);
    const staged = `${inFlight.path}.kibi-stage-4242-00000000-0000-4000-8000-000000000000`;
    ws.write(staged, inFlight.after.slice(0, 24));
    const journal = journalPath(ws, journalId);
    const startedAt = new Date().toISOString();
    ws.write(
      path.relative(ws.root, journal),
      `${JSON.stringify(
        {
          version: "kibi.plan-apply-journal.v1",
          journalId,
          planHash: plan.planHash,
          branch: "main",
          state: "prepared",
          createdAt: startedAt,
          updatedAt: startedAt,
          files,
          store: {
            entityIds: ids,
            preCommitFingerprint: sha256("store before the plan"),
            entries: storeEntries(plan),
          },
          summary: {
            planPaths: [],
            filePaths: files.map((file) => file.path),
            changedEntities: ids.length,
            changedRelationships: relationships.length,
          },
        },
        null,
        2,
      )}\n`,
    );

    // The next write settles the journal before doing its own work and
    // reports what it did.
    const upsert = ws.json(["upsert"], {
      type: "scenario",
      id: "SCEN-checkout-guest",
      properties: { title: "A guest checks out", status: "active" },
    });
    expect(upsert.status).toBe("success");
    expect((upsert.data as { warnings: string[] }).warnings).toContain(
      `Rolled back interrupted plan ${plan.planHash.slice(0, 12)} (journal ${journalId}): the store commit was never submitted; restored ${files.length - 1} of ${files.length} journaled file(s) to their before-bytes.`,
    );
    for (const file of files)
      expect(existsSync(path.join(ws.root, file.path))).toBe(false);
    expect(existsSync(path.join(ws.root, staged))).toBe(false);
    for (const id of ids) expect(storeCount(ws, id)).toBe(0);
    expect(storeCount(ws, "SCEN-checkout-guest")).toBe(1);
    expect(readJournal(journal)).toMatchObject({
      state: "rolled_back",
      resolution: { action: "rolled_back", by: "recovery" },
      files: [],
    });

    // Recovering the settled journal by id again changes nothing.
    const replay = ws.json(["apply-plan"], { recoveryJournalId: journalId });
    expect(replay).toMatchObject({
      status: "success",
      data: {
        outcome: "rolled_back",
        planHash: plan.planHash,
        recoveryJournalId: journalId,
        changedEntities: 0,
        changedPaths: [],
      },
    });
    expect(
      (replay.data as { validationSummary: { notes: string[] } })
        .validationSummary.notes[0],
    ).toContain("nothing to recover");
  }, 300_000);

  test("completes an application that died after its store commit through recoveryJournalId, refusing while a journaled file was edited by hand", () => {
    const ws = createConsumerWorkspace("kibi-plan-recovery-");
    workspace = ws;
    ws.sync();
    const plan = compilePlan(ws);
    const ids = plan.steps.map((step) => step.id);
    const applied = ws.json(["apply-plan"], {
      plan,
      approvedPlanHash: plan.planHash,
    });
    expect(applied).toMatchObject({ data: { outcome: "applied" } });
    const journalId = (applied.data as { recoveryJournalId: string })
      .recoveryJournalId;
    const journal = journalPath(ws, journalId);
    const finished = readJournal(journal);
    expect(finished.state).toBe("committed");
    const body = ws.read(DOC);

    // What the crash left: the run died right after the store accepted the
    // batch, so every file holds its published bytes and the journal still
    // reads store_committed with the full file and store record.
    const documents = documentsOf(plan);
    const published = [...documents, ...shardsOf(plan)].map((file) =>
      journalFile(
        file,
        documents.includes(file) ? "entity-document" : "relationship-shard",
        ws.read(file),
      ),
    );
    const { resolution: _resolution, ...unfinished } = finished;
    ws.write(
      path.relative(ws.root, journal),
      `${JSON.stringify(
        {
          ...unfinished,
          state: "store_committed",
          files: published,
          store: { ...finished.store, entries: storeEntries(plan) },
        },
        null,
        2,
      )}\n`,
    );

    // A journaled file edited by hand is at neither of its journaled
    // states: recovery refuses and changes nothing.
    ws.write(DOC, "Edited by hand.\n");
    const refused = ws.kibi(["apply-plan"], {
      input: { recoveryJournalId: journalId },
    });
    expect(refused.status).toBe(1);
    const refusal = errorOf(refused.stdout);
    expect(refusal.code).toBe("PARTIAL_COMMIT_REPAIR_REQUIRED");
    expect(refusal.message).toContain(
      `${DOC} changed outside the journal (neither the journaled before nor after bytes)`,
    );
    expect(ws.read(DOC)).toBe("Edited by hand.\n");
    expect(readJournal(journal).state).toBe("store_committed");

    // Back at its published bytes, recovery completes the application.
    ws.write(DOC, body);
    const recovered = ws.json(["apply-plan"], {
      recoveryJournalId: journalId,
    });
    expect(recovered).toMatchObject({
      status: "success",
      data: {
        outcome: "replayed",
        planHash: plan.planHash,
        recoveryJournalId: journalId,
        changedEntities: ids.length,
        changedPaths: [],
      },
    });
    expect(
      (recovered.data as { validationSummary: { notes: string[] } })
        .validationSummary.notes[0],
    ).toBe(
      `Completed interrupted plan ${plan.planHash.slice(0, 12)} (journal ${journalId}): the store had accepted the batch; published 0 of ${published.length} journaled file(s) at their after-bytes.`,
    );
    expect(readJournal(journal)).toMatchObject({
      state: "committed",
      resolution: { action: "completed", by: "recovery" },
    });
    for (const id of ids) expect(storeCount(ws, id)).toBe(1);
    expect(ws.read(DOC)).toBe(body);
  }, 300_000);
});
