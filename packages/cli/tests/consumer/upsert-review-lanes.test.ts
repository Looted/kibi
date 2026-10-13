// executable_for TEST-kibi-upsert-review-lanes
// implements REQ-kibi-upsert-preserves-requirement-semantics, REQ-kibi-review-observation-claim-text-v2
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
  const [req] = (workspace.json(["query"], { type: "req" }).data as Json)
    .entities as Json[];
  if (req === undefined) throw new Error("bootstrap wrote no requirement");
  return { ws: workspace, req };
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

    // Changing the prose without a new ledger is still rejected.
    const retitled = workspace.json(["upsert"], {
      type: "req",
      id: reqId,
      properties: {
        title: "Users must be able to export reports.",
        status: "open",
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

  test("refuses making an inventory-less requirement current and accepts it with the inventory", () => {
    const workspace = createConsumerWorkspace("kibi-upsert-stored-boundary-");
    ws = workspace;
    workspace.write(
      `.kb/requirements/${ID}.md`,
      `---\nid: ${ID}\ntitle: Export retention\nstatus: draft\npriority: must\n---\n\n${PROSE}\n\n## Context\n\nSupport asked for a retention window after customers could not tell how long an export stays available.\n`,
    );
    workspace.sync();

    // The payload alone carries no prose, but the file it leaves is a closed
    // (current) requirement whose prose has no inventory.
    const closed = workspace.json(["upsert"], {
      type: "req",
      id: ID,
      properties: { title: "Export retention", status: "closed" },
    });
    expect(closed.status).toBe("error");
    const message = JSON.stringify(closed.error);
    expect(message).toContain("Proposition-complete ingestion failed");
    expect(message).toContain(
      `${ID} would be written as a current requirement`,
    );
    expect(message).toContain("semantic_inventory must contain exactly 1");
    expect(message).toContain(`with id '${ID}'`);
    expect(workspace.read(`.kb/requirements/${ID}.md`)).toContain(
      "status: draft",
    );

    const analysis = workspace.json(["model"], {
      mode: "analyze",
      type: "req",
      id: ID,
      text: PROSE,
    });
    const receipt = (analysis.data as Json).receipt as Json;
    const contract = receipt.inventory_contract as Json;
    const propositions = receipt.propositions as Json[];
    expect(propositions).toHaveLength(1);
    const accepted = workspace.json(["upsert"], {
      type: "req",
      id: ID,
      properties: {
        title: "Export retention",
        status: "closed",
        semantic_text: PROSE,
        semantic_inventory_version: contract.version,
        semantic_source_field: contract.source_field,
        semantic_source_hash: contract.source_hash,
        semantic_inventory: propositions.map(
          ({ claim_key, claim_text, role, status, span }) => ({
            claim_key,
            claim_text,
            role,
            status,
            span,
          }),
        ),
        logic_claims: propositions.map(({ claim_key }) => claim_key),
      },
    });
    expect(accepted).toMatchObject({ status: "success" });
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
});
