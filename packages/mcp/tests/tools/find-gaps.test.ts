import { afterAll, beforeAll, describe, expect, mock, test } from "bun:test";
import type { PrologProcess } from "kibi-cli/prolog";
import { PrologProcess as RealPrologProcess } from "kibi-cli/prolog";
import { handleKbFindGaps } from "../../src/tools/find-gaps.js";
import { handleKbUpsert } from "../../src/tools/upsert.js";
import {
  type IsolatedCoreFixture,
  setupIsolatedCore,
} from "./discovery-root-fixture.js";

const KB_FIND_GAPS_INTEGRATION_TIMEOUT_MS = 15_000;

describe("MCP find-gaps tool handler", () => {
  test("returns matching rows with relationship counts", async () => {
    const query = mock(async () => ({
      success: true,
      bindings: {
        JsonString: JSON.stringify({
          rows: [
            {
              id: "REQ-001",
              type: "req",
              title: "User authentication",
              status: "open",
              missingRelationships: ["specified_by"],
              presentRelationships: [],
              relationshipCounts: { specified_by: 0, verified_by: 1 },
              source: ".kb/requirements/REQ-001.md",
            },
          ],
          count: 1,
          meta: {
            branch: "feature/discovery-bundle",
            snapshotId: "stamp:123",
            syncedAt: "2026-03-22T12:00:00Z",
            dirty: false,
          },
        }),
      },
    }));

    const prolog = { query } as unknown as PrologProcess;
    const result = await handleKbFindGaps(prolog, {
      type: "req",
      missingRelationships: ["specified_by"],
    });

    expect(result.structuredContent?.count).toBe(1);
    expect(result.structuredContent?.rows[0]?.id).toBe("REQ-001");
    expect(result.content[0]?.text).toContain("REQ-001");
  });
});

describe("kb_find_gaps isolated-core regression (issue #118)", () => {
  let prolog: RealPrologProcess;
  let fixture: IsolatedCoreFixture;

  beforeAll(async () => {
    fixture = setupIsolatedCore();
    prolog = new RealPrologProcess();
    await prolog.start();
    await prolog.query(
      "set_prolog_flag(answer_write_options, [max_depth(0), spacing(next_argument)])",
    );
    await prolog.query(`kb_attach('${fixture.kbDataDir}')`);
  });

  afterAll(async () => {
    if (prolog?.isRunning()) {
      await prolog.query("kb_detach");
      await prolog.terminate();
    }
    fixture.cleanup();
  });

  test(
    "find_gaps returns only reqs missing specified_by from isolated core",
    async () => {
      // Seed entities
      await handleKbUpsert(prolog, {
        type: "req",
        id: "REQ-118-GAPS-1",
        properties: {
          title: "Issue 118 gaps req 1",
          status: "open",
          priority: "must",
        },
      });
      await handleKbUpsert(prolog, {
        type: "req",
        id: "REQ-118-GAPS-2",
        properties: { title: "Issue 118 gaps req 2", status: "open" },
      });
      await handleKbUpsert(prolog, {
        type: "scenario",
        id: "SCEN-118-GAPS-2",
        properties: { title: "Issue 118 gaps scenario", status: "active" },
      });
      // Only REQ-118-GAPS-2 gets the specified_by relationship
      await handleKbUpsert(prolog, {
        type: "req",
        id: "REQ-118-GAPS-2",
        properties: { title: "Issue 118 gaps req 2", status: "open" },
        relationships: [
          {
            type: "specified_by",
            from: "REQ-118-GAPS-2",
            to: "SCEN-118-GAPS-2",
          },
        ],
      });

      // Query for reqs MISSING specified_by — should return only REQ-118-GAPS-1
      const missingResult = await handleKbFindGaps(prolog, {
        type: "req",
        missingRelationships: ["specified_by"],
        limit: 100,
        offset: 0,
      });

      expect(missingResult.structuredContent?.count).toBe(1);
      expect(missingResult.structuredContent?.rows[0]?.id).toBe(
        "REQ-118-GAPS-1",
      );
    },
    KB_FIND_GAPS_INTEGRATION_TIMEOUT_MS,
  );

  test(
    "find_gaps returns only reqs present with specified_by from isolated core",
    async () => {
      // Query for reqs that HAVE specified_by — should return only REQ-118-GAPS-2
      const presentResult = await handleKbFindGaps(prolog, {
        type: "req",
        presentRelationships: ["specified_by"],
        limit: 100,
        offset: 0,
      });

      expect(presentResult.structuredContent?.count).toBe(1);
      expect(presentResult.structuredContent?.rows[0]?.id).toBe(
        "REQ-118-GAPS-2",
      );
    },
    KB_FIND_GAPS_INTEGRATION_TIMEOUT_MS,
  );
});
