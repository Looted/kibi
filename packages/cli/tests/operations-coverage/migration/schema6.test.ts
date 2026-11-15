import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  applySchema6MigrationAction,
  buildLifecycleRepairActions,
  buildSchema6MigrationFragment,
  migrationSyncAction,
  requirementStatusActions,
  unapprovedExceptionsFromSources,
} from "../../../src/operations/migration/schema6.js";
import {
  type MigrationAction,
  migrationAction,
} from "../../../src/public/operations/migration-plan.js";
import { git } from "../../helpers/in-process-workspace.js";
import {
  writeCurrentRequirement,
  writeDriftedRequirement,
  writeManifest,
} from "../../helpers/schema6-fixture.js";
import { scratch } from "../helpers.js";

/** Anchoring a claim to its subject is a person's review, never automatic. */
const isSubjectAnchor = (code: string): boolean =>
  code.startsWith("claim_subject_anchor_");

const cleanups: Array<() => void> = [];
afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup();
});
function workspace() {
  const ws = scratch({}, "kibi-ops-cov-schema6-");
  cleanups.push(ws.cleanup);
  return ws;
}
const file = (root: string, relative: string) => path.join(root, relative);
const edit = (
  root: string,
  relative: string,
  change: (text: string) => string,
) => {
  const absolute = file(root, relative);
  writeFileSync(absolute, change(readFileSync(absolute, "utf8")));
};
const setStatus = (root: string, id: string, status: string) =>
  edit(root, `.kb/requirements/${id}.md`, (text) =>
    text.replace("status: open", `status: ${status}`),
  );
/** A drifted requirement whose grounding fact declares no claim_key. */
const writeUngroundable = (root: string, id: string) => {
  const { factId } = writeDriftedRequirement(root, id, 1);
  edit(root, `.kb/facts/${factId}.md`, (text) =>
    text.replace(/^claim_key: .*\n/m, "").replace(/^claim_text: .*\n/m, ""),
  );
};
const byId = (actions: readonly MigrationAction[], id: string) => {
  const action = actions.find((row) => row.id === id);
  if (action === undefined) throw new Error(`no action ${id}`);
  return action;
};
const context = (root: string) => ({
  workspaceRoot: root,
  clock: () => new Date("2026-11-01T00:00:00Z"),
});

describe("requirement status actions", () => {
  test("plan each status mapping with its latent drift", () => {
    const ws = workspace();
    writeDriftedRequirement(ws.root, "REQ-c", 0);
    setStatus(ws.root, "REQ-c", "accepted");
    writeDriftedRequirement(ws.root, "REQ-d", 1);
    setStatus(ws.root, "REQ-d", "proposed");
    writeUngroundable(ws.root, "REQ-i");
    setStatus(ws.root, "REQ-i", "draft");
    writeCurrentRequirement(ws.root, "REQ-f", "The system must log out users.");
    setStatus(ws.root, "REQ-f", "bogus");
    writeCurrentRequirement(
      ws.root,
      "REQ-g",
      "The system must reset passwords.",
    );
    setStatus(ws.root, "REQ-g", "pending");
    const actions = requirementStatusActions(ws.root);
    expect(actions.map((action) => action.id)).toStrictEqual([
      "req-status-vocabulary-map-REQ-c",
      "semantic-inventory-rederive-REQ-c",
      "req-status-vocabulary-map-REQ-d",
      "semantic-inventory-rederive-drop-grounding-REQ-d",
      "req-status-vocabulary-map-REQ-f",
      "req-status-vocabulary-map-REQ-g",
      "req-status-vocabulary-map-REQ-i",
    ]);
    const mapC = byId(actions, "req-status-vocabulary-map-REQ-c");
    expect(mapC.invocation).toStrictEqual({
      kind: "cli",
      command_argv: [
        "kibi",
        "migrate",
        "--apply-safe",
        "--approved-action",
        "req-status-vocabulary-map-REQ-c",
      ],
    });
    expect(mapC.evidence.mapping).toBe("accepted -> open");
    expect(
      (mapC.evidence.latentDrift as Record<string, unknown>).rederiveAction,
    ).toBe("semantic-inventory-rederive-REQ-c");
    const rederiveC = byId(actions, "semantic-inventory-rederive-REQ-c");
    expect(rederiveC.safety).toBe("review");
    expect(rederiveC.dependsOn).toStrictEqual([
      "req-status-vocabulary-map-REQ-c",
    ]);
    expect(rederiveC.invocation).toStrictEqual({
      kind: "cli",
      command_argv: [
        "kibi",
        "migrate",
        "--apply-safe",
        "--approved-action",
        "req-status-vocabulary-map-REQ-c",
        "--approved-action",
        "semantic-inventory-rederive-REQ-c",
      ],
    });
    expect(rederiveC.evidence.afterStatus).toBe("open");
    expect(rederiveC.evidence.note).toBe(
      "This drift shows once the requirement has status open; approve it together with req-status-vocabulary-map-REQ-c.",
    );
    expect(
      (
        byId(actions, "req-status-vocabulary-map-REQ-d").evidence
          .latentDrift as Record<string, unknown>
      ).rederiveAction,
    ).toBe("semantic-inventory-rederive-drop-grounding-REQ-d");
    const dropD = byId(
      actions,
      "semantic-inventory-rederive-drop-grounding-REQ-d",
    );
    expect(dropD.dependsOn).toStrictEqual(["req-status-vocabulary-map-REQ-d"]);
    expect(dropD.evidence.afterStatus).toBe("open");
    expect(dropD.evidence.alternativeTo).toBeUndefined();
    expect(String(dropD.evidence.approve)).toContain(
      " --approved-action req-status-vocabulary-map-REQ-d --approved-action ",
    );
    const mapI = byId(actions, "req-status-vocabulary-map-REQ-i");
    expect((mapI.evidence.latentDrift as Record<string, unknown>).note).toBe(
      "After the mapping, kibi sync rejects this requirement until its inventory is fixed by hand; rerun kibi migrate for the semantic_inventory_review action.",
    );
    const mapF = byId(actions, "req-status-vocabulary-map-REQ-f");
    expect(mapF.invocation.kind).toBe("review");
    expect(typeof mapF.evidence.extractionError).toBe("string");
    const mapG = byId(actions, "req-status-vocabulary-map-REQ-g");
    expect(mapG.evidence.latentDrift).toBeNull();
    expect(mapG.evidence.extractionError).toBeUndefined();
  });

  test("approved mappings and re-derivations apply in order", async () => {
    const ws = workspace();
    writeDriftedRequirement(ws.root, "REQ-c", 0);
    setStatus(ws.root, "REQ-c", "accepted");
    writeDriftedRequirement(ws.root, "REQ-d", 1);
    setStatus(ws.root, "REQ-d", "proposed");
    const actions = requirementStatusActions(ws.root);
    for (const id of [
      "req-status-vocabulary-map-REQ-c",
      "semantic-inventory-rederive-REQ-c",
      "req-status-vocabulary-map-REQ-d",
      "semantic-inventory-rederive-drop-grounding-REQ-d",
    ])
      await applySchema6MigrationAction(byId(actions, id), context(ws.root));
    expect(
      readFileSync(file(ws.root, ".kb/requirements/REQ-c.md"), "utf8"),
    ).toContain("status: open");
    expect(requirementStatusActions(ws.root)).toStrictEqual([]);
    expect(
      buildSchema6MigrationFragment({
        workspaceRoot: ws.root,
        currentSchemaVersion: 99,
      }).actions.filter((action) =>
        action.code.startsWith("semantic_inventory"),
      ),
    ).toStrictEqual([]);
  });
});

describe("buildSchema6MigrationFragment", () => {
  test("plans drift reviews, proof contract claims and lifecycle repairs", () => {
    const ws = workspace();
    writeManifest(ws.root, 5);
    writeDriftedRequirement(ws.root, "REQ-a", 0);
    writeDriftedRequirement(ws.root, "REQ-b", 1);
    writeUngroundable(ws.root, "REQ-h");
    writeCurrentRequirement(ws.root, "REQ-e", "The system must log in users.");
    setStatus(ws.root, "REQ-e", "done");
    ws.write(
      ".kb/tests/TEST-one.md",
      "---\nid: TEST-one\ntitle: one\ntype: test\nstatus: active\nproof_contract:\n  kind: rule\n---\n\nTest.\n",
    );
    ws.write(
      ".kb/tests/TEST-many.md",
      "---\nid: TEST-many\ntitle: many\ntype: test\nstatus: active\nproof_contract:\n  kind: rule\n---\n\nTest.\n",
    );
    ws.write(
      ".kb/requirements/REQ-folded.md",
      "---\nid: REQ-folded\ntitle: REQ-folded\ntype: req\nstatus: open\nsource: >-\n  src/gone.ts\n---\n\nThe system must do folded.\n",
    );
    ws.write(
      ".kb/facts/FACT-ref.md",
      "---\nid: FACT-ref\ntitle: ref\ntype: fact\nstatus: active\ntext_ref: docs/gone.md\n---\n\nFact.\n",
    );
    const candidate = (claim: string, binding: "derived" | "attested") => ({
      claim_key: claim,
      requirement_id: "REQ-a",
      fact_id: "FACT-1",
      binding,
    });
    const fragment = buildSchema6MigrationFragment({
      workspaceRoot: ws.root,
      currentSchemaVersion: 5,
      claimCandidates: [
        {
          test_id: "TEST-one",
          kind: "rule",
          candidates: [candidate("c1", "derived")],
        },
        {
          test_id: "TEST-many",
          kind: "rule",
          candidates: [candidate("c1", "derived"), candidate("c2", "derived")],
        },
      ],
    });
    const ids = fragment.actions.map((action) => action.id);
    expect(ids).toContain("proof-contract-claims-pin");
    expect(ids).toContain("proof-contract-claims-review-TEST-many");
    expect(ids).toContain("semantic-inventory-review-REQ-b");
    expect(ids).toContain("semantic-inventory-rederive-drop-grounding-REQ-b");
    expect(ids).toContain("semantic-inventory-review-REQ-h");
    expect(ids).not.toContain(
      "semantic-inventory-rederive-drop-grounding-REQ-h",
    );
    expect(ids).toContain("req-status-delivered-map");
    expect(fragment.sourceRewriteActionIds).toContain(
      "proof-contract-claims-pin",
    );
    expect(fragment.sourceRewriteActionIds).toContain(
      "semantic-inventory-rederive-REQ-a",
    );
    expect(fragment.sourceRewriteActionIds).toContain(
      "req-status-delivered-map",
    );
    expect(fragment.diagnostics).toStrictEqual([
      "2 requirement inventory(ies) need a manual fix before kibi sync succeeds; see the semantic_inventory_review actions.",
    ]);
    const review = byId(fragment.actions, "semantic-inventory-review-REQ-b");
    expect(
      String((review.invocation as { instruction: string }).instruction),
    ).toContain(
      "Or approve semantic-inventory-rederive-drop-grounding-REQ-b, which writes that contract",
    );
    const reviewH = byId(fragment.actions, "semantic-inventory-review-REQ-h");
    expect(
      String((reviewH.invocation as { instruction: string }).instruction),
    ).not.toContain("Or approve");
    const drop = byId(
      fragment.actions,
      "semantic-inventory-rederive-drop-grounding-REQ-b",
    );
    expect(drop.dependsOn).toStrictEqual([]);
    expect(drop.evidence.alternativeTo).toBe("semantic-inventory-review-REQ-b");
    expect(drop.invocation).toStrictEqual({
      kind: "cli",
      command_argv: [
        "kibi",
        "migrate",
        "--apply-safe",
        "--approved-action",
        "semantic-inventory-rederive-drop-grounding-REQ-b",
      ],
    });
    expect(ids).toContain("review-text-ref-dangling-FACT-ref");
    expect(ids.some((id) => id.includes("REQ-folded"))).toBe(true);
  });

  test("applies the drop-grounding re-derivation", async () => {
    const ws = workspace();
    writeDriftedRequirement(ws.root, "REQ-b", 1);
    const fragment = buildSchema6MigrationFragment({
      workspaceRoot: ws.root,
      currentSchemaVersion: 99,
    });
    await applySchema6MigrationAction(
      byId(
        fragment.actions,
        "semantic-inventory-rederive-drop-grounding-REQ-b",
      ),
      context(ws.root),
    );
    // The re-derived claims still name no subject; that anchor is a person's
    // review, not part of this step.
    expect(
      buildSchema6MigrationFragment({
        workspaceRoot: ws.root,
        currentSchemaVersion: 99,
      }).actions.filter((action) => !isSubjectAnchor(action.code)),
    ).toStrictEqual([]);
  });
});

describe("unapprovedExceptionsFromSources", () => {
  test("skips superseded, approved and unknown exceptions", () => {
    const ws = workspace();
    writeCurrentRequirement(
      ws.root,
      "REQ-base",
      "Uploads must verify checksums.",
    );
    writeCurrentRequirement(
      ws.root,
      "REQ-x1",
      "Uploads from mirrors may skip it.",
      {
        links: [{ type: "exempts", target: "REQ-base" }],
      },
    );
    writeCurrentRequirement(
      ws.root,
      "REQ-x2",
      "Uploads from LAN may skip it.",
      {
        links: [
          { type: "exempts", target: "REQ-base" },
          { type: "exempts", target: "REQ-other" },
        ],
      },
    );
    writeCurrentRequirement(
      ws.root,
      "REQ-x3",
      "Uploads from tests may skip it.",
      {
        approved_by: "alice",
        links: [{ type: "exempts", target: "REQ-base" }],
      },
    );
    writeCurrentRequirement(
      ws.root,
      "REQ-new",
      "Uploads from CI may skip it.",
      {
        links: [{ type: "supersedes", target: "REQ-x1" }],
      },
    );
    ws.write(".kb/requirements/broken.md", "---\nid: [\n---\n");
    ws.write(".kb/relationships/bad.yaml", "{{{");
    expect(unapprovedExceptionsFromSources(ws.root)).toStrictEqual([
      {
        exceptionId: "REQ-x2",
        exempts: ["REQ-base", "REQ-other"],
        source: ".kb/requirements/REQ-x2.md",
      },
    ]);
  });
});

describe("lifecycle repairs", () => {
  test("reviews a supersession cycle", () => {
    const ws = workspace();
    writeCurrentRequirement(ws.root, "REQ-p", "The system must do p.", {
      links: [{ type: "supersedes", target: "REQ-q" }],
    });
    writeCurrentRequirement(ws.root, "REQ-q", "The system must do q.", {
      links: [{ type: "supersedes", target: "REQ-p" }],
    });
    const { actions } = buildLifecycleRepairActions(ws.root);
    expect(actions.map((action) => action.code)).toContain(
      "review_supersession_cycle",
    );
  });
});

describe("applySchema6MigrationAction", () => {
  test("runs each automatic schema step", async () => {
    const ws = workspace();
    writeManifest(ws.root, 5);
    ws.write(
      ".kb/facts/FACT-p.md",
      "---\nid: FACT-p\ntitle: p\ntype: fact\nstatus: active\nfact_kind: property_value\npolarity: require\nsubject_key: api\nproperty_key: tls\n---\n\nThe API requires TLS.\n",
    );
    ws.write(
      ".kb/requirements/REQ-t.md",
      "---\nid: REQ-t\ntitle: REQ-t\nstatus: open\nfirmness: firm\n---\n\nThe system must keep TLS on.\n",
    );
    writeCurrentRequirement(ws.root, "REQ-e", "The system must log in users.");
    setStatus(ws.root, "REQ-e", "done");
    writeCurrentRequirement(ws.root, "REQ-old", "The system must do old.");
    writeCurrentRequirement(ws.root, "REQ-new", "The system must do new.", {
      links: [{ type: "supersedes", target: "REQ-old" }],
    });
    ws.write(
      ".kb/requirements/REQ-src.md",
      "---\nid: REQ-src\ntitle: REQ-src\ntype: req\nstatus: open\nsource: src/gone.ts\n---\n\nThe system must do src.\n",
    );
    const fragment = buildSchema6MigrationFragment({
      workspaceRoot: ws.root,
      currentSchemaVersion: 5,
    });
    const codes = fragment.actions.map((action) => action.code);
    for (const code of [
      "polarity_value_backfill",
      "entity_type_backfill",
      "evidence_floor_pin",
      "req_status_delivered_map",
      "entity_origin_backfill",
      "close_superseded_requirements",
      "source_path_rewrite",
    ])
      expect(codes).toContain(code);
    for (const action of fragment.actions)
      if (action.safety === "automatic")
        await applySchema6MigrationAction(action, context(ws.root));
    const after = buildSchema6MigrationFragment({
      workspaceRoot: ws.root,
      currentSchemaVersion: 99,
    });
    expect(
      after.actions
        .map((action) => action.code)
        .filter((code) => !isSubjectAnchor(code)),
    ).toStrictEqual([]);
  });

  test("reports what an automatic step could not change", async () => {
    const ws = workspace();
    writeCurrentRequirement(ws.root, "REQ-e", "The system must log in users.", {
      // A scalar tags value cannot take the implemented tag in place.
      tags: "legacy",
    });
    setStatus(ws.root, "REQ-e", "done");
    writeCurrentRequirement(ws.root, "REQ-old", "The system must do old.");
    writeCurrentRequirement(ws.root, "REQ-new", "The system must do new.", {
      links: [{ type: "supersedes", target: "REQ-old" }],
    });
    ws.write(
      ".kb/requirements/REQ-src.md",
      "---\nid: REQ-src\ntitle: REQ-src\ntype: req\nstatus: open\nsource: src/gone.ts\n---\n\nThe system must do src.\n",
    );
    ws.write(
      ".kb/facts/FACT-untyped.md",
      "---\nid: FACT-untyped\ntitle: x\n---\n\nFact.\n",
    );
    // A flow mapping cannot take a type line in place.
    ws.write(
      ".kb/facts/FACT-flow.md",
      "---\n{id: FACT-flow, title: x}\n---\n\nFact.\n",
    );
    const fragment = buildSchema6MigrationFragment({
      workspaceRoot: ws.root,
      currentSchemaVersion: 99,
    });
    const find = (code: string) => {
      const action = fragment.actions.find((row) => row.code === code);
      if (action === undefined) throw new Error(`no ${code}`);
      return action;
    };
    const delivered = find("req_status_delivered_map");
    const closure = find("close_superseded_requirements");
    const repair = find("source_path_rewrite");
    const typing = find("entity_type_backfill");
    // The files change after the plan, so each step refuses to touch them.
    edit(ws.root, ".kb/requirements/REQ-old.md", (text) =>
      text.replace("status: open", "status: >-\n  open"),
    );
    edit(ws.root, ".kb/requirements/REQ-src.md", (text) =>
      text.replace("source: src/gone.ts", "source: src/other.ts"),
    );
    await expect(
      applySchema6MigrationAction(delivered, context(ws.root)),
    ).rejects.toThrow(
      "; set status: closed and add the tag implemented by hand.",
    );
    await expect(
      applySchema6MigrationAction(closure, context(ws.root)),
    ).rejects.toThrow("; set status: closed by hand.");
    await expect(
      applySchema6MigrationAction(repair, context(ws.root)),
    ).rejects.toThrow("; rerun kibi migrate and approve the new plan.");
    await expect(
      applySchema6MigrationAction(typing, context(ws.root)),
    ).rejects.toThrow("; add the type line by hand.");
  });

  test("refuses actions that name no requirement or file", async () => {
    const ws = workspace();
    const action = (code: string, fields: Record<string, unknown> = {}) =>
      migrationAction({
        id: `x-${code}`,
        code,
        category: "schema",
        safety: "automatic",
        autoApplicable: true,
        invocation: { kind: "cli", command_argv: ["kibi", "migrate", "--yes"] },
        affectedEntityIds: [],
        affectedFiles: [],
        evidence: {},
        ...fields,
      } as Parameters<typeof migrationAction>[0]);
    await expect(
      applySchema6MigrationAction(
        action("semantic_inventory_rederive"),
        context(ws.root),
      ),
    ).rejects.toThrow("Inventory re-derivation names no requirement.");
    await expect(
      applySchema6MigrationAction(
        action("semantic_inventory_rederive_drop_grounding", {
          affectedEntityIds: ["REQ-1"],
        }),
        context(ws.root),
      ),
    ).rejects.toThrow(
      "Inventory re-derivation names no requirement or contract hash.",
    );
    await expect(
      applySchema6MigrationAction(
        action("req_status_vocabulary_map"),
        context(ws.root),
      ),
    ).rejects.toThrow(
      "Requirement status mapping names no file or target status; set the status by hand.",
    );
    await expect(
      applySchema6MigrationAction(action("no_such_code"), context(ws.root)),
    ).rejects.toThrow(
      "Migration action 'no_such_code' has no schema 6 executor.",
    );
    // Malformed planned records are ignored; a well-formed one that no
    // longer matches the workspace is reported.
    await applySchema6MigrationAction(
      action("source_path_rewrite", {
        evidence: {
          rewrites: [null, { entityId: 1 }, "x"],
          removals: [{ entityId: "A", file: "f", from: "x", reason: "other" }],
        },
      }),
      context(ws.root),
    );
    for (const record of [
      { entityId: "A", file: 1, from: "x", to: "y" },
      { entityId: "A", file: "f", from: 1, to: "y" },
      { entityId: "A", file: "f", from: "x", to: 1 },
      { entityId: "A", file: "f", from: "x", to: "y" },
      { entityId: "A", file: "f", field: "text_ref", from: "x", to: "y" },
    ])
      await applySchema6MigrationAction(
        action("source_path_rewrite", { evidence: { rewrites: [record] } }),
        context(ws.root),
      );
    // A requirement that no longer drifts has nothing to re-derive.
    await applySchema6MigrationAction(
      action("semantic_inventory_rederive", {
        affectedEntityIds: ["REQ-none"],
      }),
      context(ws.root),
    );
    await expect(
      applySchema6MigrationAction(
        action("semantic_inventory_rederive_drop_grounding", {
          affectedEntityIds: ["REQ-none"],
          evidence: {
            contractHash: "x",
            droppedGrounding: [
              { type: 1, target: "y" },
              { type: "requires_predicate", target: 2 },
            ],
          },
        }),
        context(ws.root),
      ),
    ).rejects.toThrow();
  });

  test("runs the migration sync", async () => {
    const ws = workspace();
    git(ws.root, "init -q -b main --template=");
    writeCurrentRequirement(ws.root, "REQ-a", "The system must log in users.");
    const warn = spyOn(console, "warn").mockImplementation(() => {});
    const log = spyOn(console, "log").mockImplementation(() => {});
    const error = spyOn(console, "error").mockImplementation(() => {});
    try {
      await applySchema6MigrationAction(
        migrationSyncAction([]),
        context(ws.root),
      );
    } finally {
      warn.mockRestore();
      log.mockRestore();
      error.mockRestore();
    }
  });
});
