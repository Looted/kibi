import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from "bun:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { analyzeSemanticAdvisorInput } from "kibi-cli/operations/semantic-advisor/analyze-prose";
import type { PrologProcess } from "kibi-cli/prolog";
import { handleKbUpsert } from "../../src/tools/upsert.js";
import {
  attachTestKb,
  createTestKbDir,
  detachTestKb,
  startIntegrationProlog,
  stopIntegrationProlog,
} from "../helpers/integration-prolog.js";

describe("MCP upsert semantic advisor", () => {
  let prolog: PrologProcess;
  let testKbPath: string;

  beforeAll(async () => {
    prolog = await startIntegrationProlog();
    testKbPath = await createTestKbDir("kibi-mcp-advisor-");
  });

  beforeEach(async () => {
    await detachTestKb(prolog);
    await fs.rm(testKbPath, { recursive: true, force: true });
    await fs.mkdir(testKbPath, { recursive: true });
    await attachTestKb(prolog, testKbPath);
  });

  afterAll(async () => {
    await stopIntegrationProlog(prolog);
    await fs.rm(testKbPath, { recursive: true, force: true });
  });

  test("returns advisory receipt for successful prose-heavy requirement upsert", async () => {
    const payload = {
      type: "req",
      id: "REQ-SESSIONS",
      properties: {
        title: "Limit active sessions",
        status: "open",
        source: "docs/requirements/sessions.md",
        text_ref: "src/session-policy.ts:42",
        semantic_text: "Users may have at most two active sessions.",
      },
    };
    const semantic = analyzeSemanticAdvisorInput({ payload });
    const contract = semantic.receipt.inventory_contract;
    const result = await handleKbUpsert(prolog, {
      ...payload,
      properties: {
        ...payload.properties,
        logic_claims: semantic.receipt.logic_coverage.expected_claim_keys,
        semantic_inventory_version: contract.version,
        semantic_source_field: contract.source_field,
        semantic_source_hash: contract.source_hash,
        semantic_inventory: semantic.receipt.propositions,
      },
    });

    const structured = result.structuredContent as
      | (NonNullable<typeof result.structuredContent> & {
          semanticAdvisor?: Record<string, unknown> | null;
          warnings?: string[];
        })
      | undefined;

    expect(structured).toMatchObject({ created: 1, updated: 0 });
    expect(structured?.semanticAdvisor).toMatchObject({
      logic_readiness: "needs_modeling",
      candidate_lane: "strict_property",
      suggestions: [
        expect.objectContaining({
          kind: "strict_property",
          claim: expect.objectContaining({
            subject_key: "user.session",
            property_key: "active_count",
            operator: "lte",
            value_int: 2,
          }),
        }),
      ],
    });
    expect(structured?.warnings).toEqual(
      expect.arrayContaining([expect.stringContaining("kb_model_requirement")]),
    );
  });
});
