// executable_for TEST-kibi-upsert-review-lanes
import { afterEach, describe, expect, test } from "bun:test";
import {
  type ConsumerWorkspace,
  type Json,
  createConsumerWorkspace,
} from "./workspace.js";

let ws: ConsumerWorkspace | undefined;
afterEach(() => {
  ws?.cleanup();
  ws = undefined;
});

const STATEMENT = "Users must be able to export reports as CSV.";

/** A workspace holding one requirement written by an approved bootstrap plan. */
function bootstrappedRequirement(): { ws: ConsumerWorkspace; req: Json } {
  const workspace = createConsumerWorkspace("kibi-upsert-review-lanes-");
  ws = workspace;
  const plan = (
    workspace.json(["plan-bootstrap"], {
      bootstrapContext: {
        projectSummary: "Report exports.",
        verificationAnchors: ["bun test"],
        knowledgeSources: [
          {
            id: "spec",
            title: "Product spec",
            kind: "specification",
            locator: "https://example.com/spec",
            authority: "authoritative",
          },
        ],
        intentClaims: [
          {
            statement: STATEMENT,
            sourceId: "spec",
            reference: "claim:1",
            excerpt: "Users need to export their reports as CSV.",
          },
        ],
      },
    }).data as Json
  ).plan as Json;
  expect(plan.status).toBe("ready");
  expect(
    workspace.json(["apply-plan"], { plan, approvedPlanHash: plan.planHash }),
  ).toMatchObject({ status: "success" });
  const [req] = (
    workspace.json(["query"], { type: "req", fields: "full" }).data as Json
  ).entities as Json[];
  if (req === undefined) throw new Error("bootstrap wrote no requirement");
  return { ws: workspace, req };
}

/** The origin the store holds for an entity, as an object. */
function storedOrigin(entity: Json): Json {
  const origin = entity.origin;
  return (typeof origin === "string" ? JSON.parse(origin) : origin) as Json;
}

describe("kb_upsert review lanes through the real CLI", () => {
  test("links a scenario without resending the ledger and records a review observation quoting its claim", () => {
    const { ws: workspace, req } = bootstrappedRequirement();
    const reqId = String(req.id);
    expect(
      workspace.json(["upsert"], {
        type: "scenario",
        id: "SCEN-export-csv",
        properties: {
          title: "A user exports a report as CSV",
          status: "active",
        },
      }),
    ).toMatchObject({ status: "success" });

    const linked = workspace.json(["upsert"], {
      type: "req",
      id: reqId,
      properties: { title: req.title, status: "open" },
      relationships: [
        { type: "specified_by", from: reqId, to: "SCEN-export-csv" },
      ],
    });
    expect(linked).toMatchObject({ status: "success" });
    // The compiled store keeps the ledger right away, not only after a sync.
    const [afterLink] = (workspace.json(["query"], { id: reqId }).data as Json)
      .entities as Json[];
    expect(afterLink?.semantic_inventory).toEqual(req.semantic_inventory);
    expect(afterLink?.logic_claims).toEqual(req.logic_claims);

    // The bootstrap requirement is a firm decision: a retitle that cites no
    // new human words is refused before its ledger is read.
    const unapproved = workspace.json(["upsert"], {
      type: "req",
      id: reqId,
      properties: {
        title: "Users must be able to export reports.",
        status: "open",
      },
    });
    expect(unapproved.status).toBe("error");
    expect(JSON.stringify(unapproved.error)).toContain(
      "is a firm decision, so kb_upsert does not change its title in place",
    );
    // Citing the person's words, changing the prose (the semantic_text its
    // ledger reads) without a new ledger is still rejected.
    const retitled = workspace.json(["upsert"], {
      type: "req",
      id: reqId,
      properties: {
        title: req.title,
        status: "open",
        semantic_text: "Users must be able to export reports.",
        origin: { ...storedOrigin(req), ref: "spec:claim:2" },
      },
    });
    expect(retitled.status).toBe("error");
    expect(JSON.stringify(retitled.error)).toContain(
      "Proposition-complete ingestion failed",
    );

    const observation = workspace.json(["upsert"], {
      type: "fact",
      id: "FACT-review-export-csv",
      properties: {
        title: "Export claim needs a CSV dialect decision",
        status: "active",
        fact_kind: "observation",
        text_ref: "spec:claim:1",
        tags: ["review:invalid-write"],
        claim_text: STATEMENT,
      },
    });
    expect(observation).toMatchObject({ status: "success" });

    // A grounding fact may send the claim text alone: Kibi derives the key.
    const groundingProperties = {
      title: "Exports are CSV",
      status: "active",
      fact_kind: "property_value",
      subject_key: "report.export",
      property_key: "format",
      operator: "eq",
      value_type: "string",
      value_string: "csv",
      claim_text: STATEMENT,
    };
    const grounding = workspace.json(["upsert"], {
      type: "fact",
      id: "FACT-export-csv-value",
      properties: groundingProperties,
    });
    expect(grounding).toMatchObject({ status: "success" });
    const [inventoryEntry] = req.semantic_inventory as Json[];
    const [storedGrounding] = (
      workspace.json(["query"], { id: "FACT-export-csv-value" }).data as Json
    ).entities as Json[];
    expect(storedGrounding?.claim_key).toBe(inventoryEntry?.claim_key);
    expect(storedGrounding?.claim_text).toBe(STATEMENT);
    // A key that does not belong to the text is still refused.
    const mismatched = workspace.json(["upsert"], {
      type: "fact",
      id: "FACT-export-csv-value",
      properties: {
        ...groundingProperties,
        claim_key: "CLAIM-AAAAAAAAAAAAAAAA",
      },
    });
    expect(mismatched.status).toBe("error");
    expect(JSON.stringify(mismatched.error)).toContain(
      "claim_key must equal the stable key derived from claim_text",
    );
    // The observation stays a keyless review note.
    const [storedObservation] = (
      workspace.json(["query"], { id: "FACT-review-export-csv" }).data as Json
    ).entities as Json[];
    expect(storedObservation?.claim_key).toBeUndefined();

    workspace.sync();
    const [stored] = (workspace.json(["query"], { id: reqId }).data as Json)
      .entities as Json[];
    expect(stored?.semantic_inventory).toEqual(req.semantic_inventory);
    expect(stored?.logic_claims).toEqual(req.logic_claims);
    expect(stored?.semantic_text).toBe(STATEMENT);
    const check = workspace.json(["check"], {
      rules: [
        "strict-fact-shape",
        "required-fields",
        "no-dangling-refs",
        "logic-coverage",
      ],
    });
    expect((check.data as Json).violations).toEqual([]);
    expect(String(stored?.specified_by)).toContain("SCEN-export-csv");
    const status = workspace.json(["status"], {});
    expect((status.data as Json).syncState).toBe("fresh");
  }, 120_000);
});

describe("kb_upsert judges a requirement update as its file will read", () => {
  const ID = "REQ-export-retention";
  const PROSE = "Each export must stay downloadable for thirty days.";

  test("derives the ledger of an inventory-less requirement made current, and refuses a stale sent contract", () => {
    const workspace = createConsumerWorkspace("kibi-upsert-stored-boundary-");
    ws = workspace;
    workspace.write(
      `.kb/requirements/${ID}.md`,
      `---\nid: ${ID}\ntitle: Export retention\nstatus: draft\npriority: must\n---\n\n${PROSE}\n\n## Context\n\nSupport asked for a retention window after customers could not tell how long an export stays available.\n`,
    );
    workspace.sync();

    // A contract field sent with the write is judged as sent: a hash for
    // other prose leaves the closed (current) file without a valid
    // inventory, so the write is refused and the file is unchanged.
    const stale = workspace.json(["upsert"], {
      type: "req",
      id: ID,
      properties: {
        title: "Export retention",
        status: "closed",
        semantic_source_hash: "0".repeat(64),
      },
    });
    expect(stale.status).toBe("error");
    const message = JSON.stringify(stale.error);
    expect(message).toContain("Proposition-complete ingestion failed");
    expect(message).toContain(
      `${ID} would be written as a current requirement`,
    );
    expect(workspace.read(`.kb/requirements/${ID}.md`)).toContain(
      "status: draft",
    );

    // Without contract fields Kibi derives the ledger from the prose; the
    // claim nobody classified is recorded missing.
    const closed = workspace.json(["upsert"], {
      type: "req",
      id: ID,
      properties: { title: "Export retention", status: "closed" },
    });
    expect(closed).toMatchObject({ status: "success" });
    const applied = (closed.data as Json).inventoryApplied as Json[];
    expect(applied).toHaveLength(1);
    expect(applied[0]?.status).toBe("missing");
    workspace.sync();
    const [stored] = (workspace.json(["query"], { id: ID }).data as Json)
      .entities as Json[];
    expect(stored?.status).toBe("closed");
    expect(stored?.semantic_inventory).toHaveLength(1);

    // A later status-only update keeps the stored inventory and passes.
    expect(
      workspace.json(["upsert"], {
        type: "req",
        id: ID,
        properties: { title: "Export retention", status: "open" },
      }),
    ).toMatchObject({ status: "success" });
  }, 120_000);
  test("completes partial semantic_inventory entries the writer sends for the claims it classifies", () => {
    const workspace = createConsumerWorkspace("kibi-upsert-partial-inventory-");
    ws = workspace;
    const write = (id: string, extra: Json = {}, entries?: Json[]) =>
      workspace.json(["upsert"], {
        type: "req",
        id,
        properties: {
          title: "Export retention",
          status: "open",
          semantic_text: PROSE,
          ...(entries === undefined ? {} : { semantic_inventory: entries }),
        },
        ...extra,
      });
    // The claim key Kibi derives for this prose, from a preview.
    const preview = write("REQ-export-retention-preview", { dryRun: true });
    const [claim] = (preview.data as Json).inventoryApplied as Json[];
    const claimKey = String(claim?.claim_key);
    expect(claimKey).toMatch(/^CLAIM-[A-F0-9]{16}$/);
    const partial = [
      { claim_key: claimKey, status: "ontology_gap", subjects: ["export"] },
    ];

    const dryRun = write(ID, { dryRun: true }, partial);
    expect(dryRun, JSON.stringify(dryRun)).toMatchObject({
      status: "success",
      data: { valid: true },
    });
    const written = write(ID, {}, partial);
    expect(written, JSON.stringify(written)).toMatchObject({
      status: "success",
    });
    expect((written.data as Json).inventoryApplied).toEqual([
      expect.objectContaining({ claim_key: claimKey, status: "ontology_gap" }),
    ]);
    const file = workspace.read(`.kb/requirements/${ID}.md`);
    expect(file).toContain("semantic_inventory_version:");
    expect(file).toContain("status: ontology_gap");
    expect(file).toMatch(/subjects:\n\s+- export/);

    // An entry for a claim the prose does not state is still refused.
    const stale = write(`${ID}-stale`, {}, [
      { claim_key: "CLAIM-0000000000000000", status: "ontology_gap" },
    ]);
    expect(stale.status).toBe("error");
    expect(JSON.stringify(stale.error)).toContain(
      "names claim key(s) CLAIM-0000000000000000 that the prose",
    );
  }, 120_000);
});
