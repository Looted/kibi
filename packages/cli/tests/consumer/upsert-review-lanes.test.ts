// executable_for TEST-kibi-upsert-review-lanes
// implements REQ-kibi-upsert-preserves-requirement-semantics, REQ-kibi-review-observation-claim-text
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
          { statement: STATEMENT, sourceId: "spec", reference: "claim:1" },
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

    // A grounding fact still needs both halves of the provenance pair.
    const grounding = workspace.json(["upsert"], {
      type: "fact",
      id: "FACT-export-csv-value",
      properties: {
        title: "Exports are CSV",
        status: "active",
        fact_kind: "property_value",
        subject_key: "report.export",
        property_key: "format",
        operator: "eq",
        value_type: "string",
        value_string: "csv",
        claim_text: STATEMENT,
      },
    });
    expect(grounding.status).toBe("error");
    expect(JSON.stringify(grounding.error)).toContain("claim_key");

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
