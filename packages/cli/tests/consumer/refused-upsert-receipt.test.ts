// implements REQ-core-atomic-upsert-persistence, REQ-kibi-operation-interface-parity
import { afterEach, describe, expect, test } from "bun:test";
import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import {
  type ConsumerWorkspace,
  type Json,
  QUOTA_SUBJECT,
  adviseProse,
  authorQuotaRequirement,
  checkViolations,
  createConsumerWorkspace,
} from "./workspace.js";

/**
 * A kb_upsert refused at commit time (here by the contradiction check) must
 * leave the workspace exactly as it found it: the authored file, its
 * relationship shards and, for an untracked file an earlier kb_upsert
 * created, the pending-source receipt that binds it. Before the fix the
 * receipt kept the refused write's hash, so kb_check reported
 * source-relationship-parity hash drift and kb_status went dirty although
 * nothing had changed.
 */

let workspace: ConsumerWorkspace | undefined;

afterEach(() => {
  workspace?.cleanup();
  workspace = undefined;
});

const FREE_TIER_PROSE = "The free-tier remaining call quota must equal 0.";

function pendingReceipts(root: string): string[] {
  const directory = path.join(root, ".kb", "recovery", "pending-sources");
  return existsSync(directory) ? readdirSync(directory).sort() : [];
}

describe("a commit-time refusal restores the pending-source receipt", () => {
  test("contradiction refusal on an untracked requirement leaves kb_check and kb_status clean", () => {
    const ws = createConsumerWorkspace("kibi-refused-upsert-receipt-");
    workspace = ws;

    // Tracked state: one requirement that needs remaining > 0, and a
    // conflicting value fact (remaining = 0) nothing links yet.
    ws.write(".kb/facts/FACT-QUOTA-SUBJECT.md", QUOTA_SUBJECT);
    authorQuotaRequirement(ws, {
      id: "REQ-QUOTA-CALL",
      title: "Calls need remaining quota",
      prose: "The remaining call quota must be greater than 0.",
      factId: "FACT-QUOTA-POSITIVE",
      operator: "gt",
      value: 0,
    });
    const { contract, propositions } = adviseProse(ws, FREE_TIER_PROSE);
    expect(propositions).toHaveLength(1);
    const [claim] = propositions as [(typeof propositions)[number]];
    ws.write(
      ".kb/facts/FACT-QUOTA-ZERO.md",
      [
        "---",
        "id: FACT-QUOTA-ZERO",
        "title: Free-tier remaining quota is zero",
        "type: fact",
        "status: active",
        "fact_kind: property_value",
        "subject_key: client.call_quota",
        "property_key: remaining",
        "operator: eq",
        "value_type: int",
        "value_int: 0",
        `claim_key: ${claim.claim_key}`,
        `claim_text: ${claim.claim_text}`,
        "---",
        "",
      ].join("\n"),
    );
    ws.sync();

    // An untracked requirement written by kb_upsert: its pending-source
    // receipt binds the file until it is staged in Git. Its clause is still
    // unmodeled (`missing`): a modeled entry needs its grounding link in the
    // same write.
    const ledgerFor = (status: "missing" | "modeled") => ({
      semantic_text: FREE_TIER_PROSE,
      semantic_inventory_version: contract.version,
      semantic_source_field: contract.source_field,
      semantic_source_hash: contract.source_hash,
      semantic_inventory: [{ ...claim, status }],
      logic_claims: [claim.claim_key],
    });
    const body = `${FREE_TIER_PROSE}\n\n## Context\n\nThe free tier is capped at zero remaining calls; raised by the test project owner while onboarding.\n`;
    const created = ws.json(["upsert"], {
      type: "req",
      id: "REQ-quota-free-tier",
      properties: {
        title: "Free-tier remaining quota is zero",
        status: "open",
        ...ledgerFor("missing"),
      },
      document: { body },
    });
    expect(created, JSON.stringify(created.error)).toMatchObject({
      status: "success",
    });
    const receiptsAfterCreate = pendingReceipts(ws.root);
    expect(receiptsAfterCreate.length).toBeGreaterThan(0);
    const fileAfterCreate = ws.read(".kb/requirements/REQ-quota-free-tier.md");
    expect(checkViolations(ws, "source-relationship-parity")).toEqual([]);

    // Linking the zero fact contradicts REQ-QUOTA-CALL (gt 0 vs eq 0), so the
    // commit refuses the write at stage=contradiction_check.
    const linkPayload = {
      type: "req",
      id: "REQ-quota-free-tier",
      properties: {
        title: "Free-tier remaining quota is zero",
        status: "open",
        ...ledgerFor("modeled"),
      },
      document: { body },
      relationships: [
        {
          type: "constrains",
          from: "REQ-quota-free-tier",
          to: "FACT-QUOTA-SUBJECT",
        },
        {
          type: "requires_property",
          from: "REQ-quota-free-tier",
          to: "FACT-QUOTA-ZERO",
        },
      ],
    };
    // The dry run previews the commit-time check instead of saying "valid".
    const preview = ws.json(["upsert"], { ...linkPayload, dryRun: true });
    const previewData = preview.data as Json;
    expect(previewData.valid).toBe(false);
    expect(JSON.stringify(previewData.errors)).toContain(
      "Contradiction detected",
    );
    expect(ws.read(".kb/requirements/REQ-quota-free-tier.md")).toBe(
      fileAfterCreate,
    );
    expect(pendingReceipts(ws.root)).toEqual(receiptsAfterCreate);

    const refused = ws.json(["upsert"], linkPayload);
    expect(refused.status).toBe("error");
    expect(JSON.stringify(refused.error)).toContain("Contradiction detected");
    expect(JSON.stringify(refused.error)).toContain("contradiction_check");

    // Nothing changed: file bytes, receipt set, parity and freshness.
    expect(ws.read(".kb/requirements/REQ-quota-free-tier.md")).toBe(
      fileAfterCreate,
    );
    expect(pendingReceipts(ws.root)).toEqual(receiptsAfterCreate);
    expect(checkViolations(ws, "source-relationship-parity")).toEqual([]);
    const status = ws.json(["status"], {});
    const statusData = status.data as Json;
    expect(statusData.syncState).toBe("fresh");
    expect(
      JSON.stringify(status.diagnostics ?? []).includes("hash drift"),
    ).toBe(false);
    const [stored] = (
      ws.json(["query"], { id: "REQ-quota-free-tier" }).data as Json
    ).entities as Json[];
    expect(stored?.requires_property ?? []).toEqual([]);
  }, 300_000);
});
