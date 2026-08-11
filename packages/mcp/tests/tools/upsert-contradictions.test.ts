import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  setDefaultTimeout,
  test,
} from "bun:test";

setDefaultTimeout(30_000);
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { PrologProcess } from "kibi-cli/prolog";
import { handleKbQuery } from "../../src/tools/query.js";
import { handleKbUpsert } from "../../src/tools/upsert.js";
import {
  attachTestKb,
  createTestKbDir,
  detachTestKb,
  startIntegrationProlog,
  stopIntegrationProlog,
} from "../helpers/integration-prolog.js";

describe("MCP Upsert Contradictions and Typed Facts", () => {
  let prolog: PrologProcess;
  let testKbPath: string;

  beforeAll(async () => {
    prolog = await startIntegrationProlog();
    testKbPath = await createTestKbDir("kibi-mcp-upsert-");
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

  describe("reject-on-write contradiction enforcement", () => {
    test("should reject a new strict req that constrains same subject with incompatible property", async () => {
      // Set up: Create existing requirement with subject fact and property fact
      await handleKbUpsert(prolog, {
        type: "fact",
        id: "FACT-SUBJECT-001",
        properties: {
          title: "User session subject",
          status: "active",
          source: "test://contradiction",
          fact_kind: "subject",
          subject_key: "user.session",
        },
      });

      await handleKbUpsert(prolog, {
        type: "fact",
        id: "FACT-PROP-001",
        properties: {
          title: "Timeout 30 minutes",
          status: "active",
          source: "test://contradiction",
          fact_kind: "property_value",
          subject_key: "user.session",
          property_key: "timeout_minutes",
          operator: "eq",
          value_type: "int",
          value_int: 30,
        },
      });

      // Create first requirement with constrains + requires_property
      await handleKbUpsert(prolog, {
        type: "req",
        id: "REQ-CONTRADICT-A",
        properties: {
          title: "Requirement A: 30 min timeout",
          status: "open",
          source: "test://contradiction",
        },
        relationships: [
          {
            type: "constrains",
            from: "REQ-CONTRADICT-A",
            to: "FACT-SUBJECT-001",
          },
          {
            type: "requires_property",
            from: "REQ-CONTRADICT-A",
            to: "FACT-PROP-001",
          },
        ],
      });

      // Create conflicting fact
      await handleKbUpsert(prolog, {
        type: "fact",
        id: "FACT-PROP-002",
        properties: {
          title: "Timeout 60 minutes",
          status: "active",
          source: "test://contradiction",
          fact_kind: "property_value",
          subject_key: "user.session",
          property_key: "timeout_minutes",
          operator: "eq",
          value_type: "int",
          value_int: 60,
        },
      });

      // Attempt to create conflicting requirement (should reject)
      await expect(
        handleKbUpsert(prolog, {
          type: "req",
          id: "REQ-CONTRADICT-B",
          properties: {
            title: "Requirement B: 60 min timeout",
            status: "open",
            source: "test://contradiction",
          },
          relationships: [
            {
              type: "constrains",
              from: "REQ-CONTRADICT-B",
              to: "FACT-SUBJECT-001",
            },
            {
              type: "requires_property",
              from: "REQ-CONTRADICT-B",
              to: "FACT-PROP-002",
            },
          ],
        }),
      ).rejects.toThrow(/contradiction/i);
    });

    test("rejects opposite polarities for the same ground predicate", async () => {
      for (const [id, polarity, claimKey] of [
        ["FACT-PRED-ALLOW", "assert", "CLAIM-94D8C542E05AAC78"],
        ["FACT-PRED-DENY", "deny", "CLAIM-355C7B2C85728F72"],
      ] as const) {
        await handleKbUpsert(prolog, {
          type: "fact",
          id,
          properties: {
            title: `${polarity} publish permission`,
            status: "active",
            source: "test://predicate-contradiction",
            fact_kind: "predicate",
            predicate_name: "permission_rule",
            predicate_args: ["suspended_user", "publish", "article"],
            canonical_key: "permission_rule(suspended_user,publish,article)",
            polarity,
            claim_key: claimKey,
            claim_text:
              polarity === "assert"
                ? "Suspended users may publish articles"
                : "Suspended users must not publish articles",
          },
        });
      }

      await handleKbUpsert(prolog, {
        type: "req",
        id: "REQ-PRED-ALLOW",
        properties: {
          title: "Allow suspended publishing",
          status: "open",
          source: "test://predicate-contradiction",
          logic_claims: ["CLAIM-94D8C542E05AAC78"],
        },
        relationships: [
          {
            type: "requires_predicate",
            from: "REQ-PRED-ALLOW",
            to: "FACT-PRED-ALLOW",
          },
        ],
      });

      await expect(
        handleKbUpsert(prolog, {
          type: "req",
          id: "REQ-PRED-DENY",
          properties: {
            title: "Deny suspended publishing",
            status: "open",
            source: "test://predicate-contradiction",
            logic_claims: ["CLAIM-355C7B2C85728F72"],
          },
          relationships: [
            {
              type: "requires_predicate",
              from: "REQ-PRED-DENY",
              to: "FACT-PRED-DENY",
            },
          ],
        }),
      ).rejects.toThrow(/Predicate conflict.*permission_rule/i);
    });

    test("should accept write when supersedes relationship is included in same request", async () => {
      // Set up existing requirement
      await handleKbUpsert(prolog, {
        type: "fact",
        id: "FACT-SUBJECT-002",
        properties: {
          title: "API rate limit subject",
          status: "active",
          source: "test://supersedes",
          fact_kind: "subject",
          subject_key: "api.rate_limit",
        },
      });

      await handleKbUpsert(prolog, {
        type: "fact",
        id: "FACT-PROP-003",
        properties: {
          title: "100 req/sec",
          status: "active",
          source: "test://supersedes",
          fact_kind: "property_value",
          subject_key: "api.rate_limit",
          property_key: "requests_per_second",
          operator: "eq",
          value_type: "int",
          value_int: 100,
        },
      });

      await handleKbUpsert(prolog, {
        type: "req",
        id: "REQ-OLD-001",
        properties: {
          title: "Old requirement: 100 req/sec",
          status: "open",
          source: "test://supersedes",
        },
        relationships: [
          { type: "constrains", from: "REQ-OLD-001", to: "FACT-SUBJECT-002" },
          {
            type: "requires_property",
            from: "REQ-OLD-001",
            to: "FACT-PROP-003",
          },
        ],
      });

      // Create new fact with different value
      await handleKbUpsert(prolog, {
        type: "fact",
        id: "FACT-PROP-004",
        properties: {
          title: "200 req/sec",
          status: "active",
          source: "test://supersedes",
          fact_kind: "property_value",
          subject_key: "api.rate_limit",
          property_key: "requests_per_second",
          operator: "eq",
          value_type: "int",
          value_int: 200,
        },
      });

      // New requirement supersedes old one - should be accepted
      const result = await handleKbUpsert(prolog, {
        type: "req",
        id: "REQ-NEW-001",
        properties: {
          title: "New requirement: 200 req/sec",
          status: "open",
          source: "test://supersedes",
        },
        relationships: [
          { type: "constrains", from: "REQ-NEW-001", to: "FACT-SUBJECT-002" },
          {
            type: "requires_property",
            from: "REQ-NEW-001",
            to: "FACT-PROP-004",
          },
          { type: "supersedes", from: "REQ-NEW-001", to: "REQ-OLD-001" },
        ],
      });

      expect(result.structuredContent?.created).toBe(1);

      // Verify new requirement exists
      const queryResult = await handleKbQuery(prolog, { id: "REQ-NEW-001" });
      expect(queryResult.structuredContent?.entities.length).toBe(1);
    });

    test("contradiction rejection leaves no entity persisted after failure", async () => {
      // Set up existing requirement
      await handleKbUpsert(prolog, {
        type: "fact",
        id: "FACT-SUBJECT-003",
        properties: {
          title: "Feature flag subject",
          status: "active",
          source: "test://rollback",
          fact_kind: "subject",
          subject_key: "feature.dark_mode",
        },
      });

      await handleKbUpsert(prolog, {
        type: "fact",
        id: "FACT-PROP-005",
        properties: {
          title: "Enabled true",
          status: "active",
          source: "test://rollback",
          fact_kind: "property_value",
          subject_key: "feature.dark_mode",
          property_key: "enabled",
          operator: "eq",
          value_type: "bool",
          value_bool: true,
        },
      });

      await handleKbUpsert(prolog, {
        type: "req",
        id: "REQ-EXISTING-001",
        properties: {
          title: "Existing: enable dark mode",
          status: "open",
          source: "test://rollback",
        },
        relationships: [
          {
            type: "constrains",
            from: "REQ-EXISTING-001",
            to: "FACT-SUBJECT-003",
          },
          {
            type: "requires_property",
            from: "REQ-EXISTING-001",
            to: "FACT-PROP-005",
          },
        ],
      });

      // Create conflicting fact
      await handleKbUpsert(prolog, {
        type: "fact",
        id: "FACT-PROP-006",
        properties: {
          title: "Enabled false",
          status: "active",
          source: "test://rollback",
          fact_kind: "property_value",
          subject_key: "feature.dark_mode",
          property_key: "enabled",
          operator: "eq",
          value_type: "bool",
          value_bool: false,
        },
      });

      // Attempt conflicting upsert - should fail
      let threw = false;
      try {
        await handleKbUpsert(prolog, {
          type: "req",
          id: "REQ-ROLLBACK-TEST",
          properties: {
            title: "Conflicting: disable dark mode",
            status: "open",
            source: "test://rollback",
          },
          relationships: [
            {
              type: "constrains",
              from: "REQ-ROLLBACK-TEST",
              to: "FACT-SUBJECT-003",
            },
            {
              type: "requires_property",
              from: "REQ-ROLLBACK-TEST",
              to: "FACT-PROP-006",
            },
          ],
        });
      } catch {
        threw = true;
      }
      expect(threw).toBe(true);

      // Verify conflicting entity does NOT exist
      const queryResult = await handleKbQuery(prolog, {
        id: "REQ-ROLLBACK-TEST",
      });
      expect(queryResult.structuredContent?.entities.length).toBe(0);
    });

    test("contradiction rejection leaves no entity after save/detach/reattach", async () => {
      // Set up existing requirement
      await handleKbUpsert(prolog, {
        type: "fact",
        id: "FACT-SUBJECT-004",
        properties: {
          title: "Database pool subject",
          status: "active",
          source: "test://persist-rollback",
          fact_kind: "subject",
          subject_key: "db.connection_pool",
        },
      });

      await handleKbUpsert(prolog, {
        type: "fact",
        id: "FACT-PROP-007",
        properties: {
          title: "Max 10 connections",
          status: "active",
          source: "test://persist-rollback",
          fact_kind: "property_value",
          subject_key: "db.connection_pool",
          property_key: "max_connections",
          operator: "eq",
          value_type: "int",
          value_int: 10,
        },
      });

      await handleKbUpsert(prolog, {
        type: "req",
        id: "REQ-PERSIST-001",
        properties: {
          title: "Existing: 10 connections",
          status: "open",
          source: "test://persist-rollback",
        },
        relationships: [
          {
            type: "constrains",
            from: "REQ-PERSIST-001",
            to: "FACT-SUBJECT-004",
          },
          {
            type: "requires_property",
            from: "REQ-PERSIST-001",
            to: "FACT-PROP-007",
          },
        ],
      });

      // Save and detach
      await prolog.query("kb_save");
      await prolog.query("kb_detach");

      // Reattach
      await prolog.query(`kb_attach('${testKbPath}')`);

      // Create conflicting fact
      await handleKbUpsert(prolog, {
        type: "fact",
        id: "FACT-PROP-008",
        properties: {
          title: "Max 20 connections",
          status: "active",
          source: "test://persist-rollback",
          fact_kind: "property_value",
          subject_key: "db.connection_pool",
          property_key: "max_connections",
          operator: "eq",
          value_type: "int",
          value_int: 20,
        },
      });

      // Attempt conflicting upsert - should fail
      let threw = false;
      try {
        await handleKbUpsert(prolog, {
          type: "req",
          id: "REQ-PERSIST-FAIL",
          properties: {
            title: "Conflicting: 20 connections",
            status: "open",
            source: "test://persist-rollback",
          },
          relationships: [
            {
              type: "constrains",
              from: "REQ-PERSIST-FAIL",
              to: "FACT-SUBJECT-004",
            },
            {
              type: "requires_property",
              from: "REQ-PERSIST-FAIL",
              to: "FACT-PROP-008",
            },
          ],
        });
      } catch {
        threw = true;
      }
      expect(threw).toBe(true);

      // Save, detach, reattach
      await prolog.query("kb_save");
      await prolog.query("kb_detach");
      await prolog.query(`kb_attach('${testKbPath}')`);

      // Verify conflicting entity still does NOT exist
      const queryResult = await handleKbQuery(prolog, {
        id: "REQ-PERSIST-FAIL",
      });
      expect(queryResult.structuredContent?.entities.length).toBe(0);
    }, 15000);

    test("observation/meta facts do not trigger hard rejection", async () => {
      // Create observation-type fact (not strict property_value on same subject)
      await handleKbUpsert(prolog, {
        type: "fact",
        id: "FACT-OBS-001",
        properties: {
          title: "User count observation",
          status: "active",
          source: "test://observation",
          fact_kind: "observation",
          subject_key: "metrics.users",
          property_key: "count",
          operator: "eq",
          value_type: "int",
          value_int: 1000,
        },
      });

      // Create requirement using observation fact
      await handleKbUpsert(prolog, {
        type: "req",
        id: "REQ-OBS-001",
        properties: {
          title: "User count monitoring",
          status: "open",
          source: "test://observation",
        },
        relationships: [
          { type: "constrains", from: "REQ-OBS-001", to: "FACT-OBS-001" },
        ],
      });

      // Another observation with different value should be allowed
      await handleKbUpsert(prolog, {
        type: "fact",
        id: "FACT-OBS-002",
        properties: {
          title: "User count observation 2",
          status: "active",
          source: "test://observation",
          fact_kind: "observation",
          subject_key: "metrics.users",
          property_key: "count",
          operator: "eq",
          value_type: "int",
          value_int: 2000,
        },
      });

      // This should succeed - observations don't trigger contradiction enforcement
      const result = await handleKbUpsert(prolog, {
        type: "req",
        id: "REQ-OBS-002",
        properties: {
          title: "Another user count observation",
          status: "open",
          source: "test://observation",
        },
        relationships: [
          { type: "constrains", from: "REQ-OBS-002", to: "FACT-OBS-002" },
        ],
      });

      expect(result.structuredContent?.created).toBe(1);
    });

    test("_skipContradictionCheck bypasses the gate", async () => {
      // Set up existing requirement
      await handleKbUpsert(prolog, {
        type: "fact",
        id: "FACT-SUBJECT-005",
        properties: {
          title: "Cache TTL subject",
          status: "active",
          source: "test://skip-check",
          fact_kind: "subject",
          subject_key: "cache.ttl",
        },
      });

      await handleKbUpsert(prolog, {
        type: "fact",
        id: "FACT-PROP-009",
        properties: {
          title: "TTL 300 seconds",
          status: "active",
          source: "test://skip-check",
          fact_kind: "property_value",
          subject_key: "cache.ttl",
          property_key: "seconds",
          operator: "eq",
          value_type: "int",
          value_int: 300,
        },
      });

      await handleKbUpsert(prolog, {
        type: "req",
        id: "REQ-SKIP-EXISTING",
        properties: {
          title: "Existing: 300 sec TTL",
          status: "open",
          source: "test://skip-check",
        },
        relationships: [
          {
            type: "constrains",
            from: "REQ-SKIP-EXISTING",
            to: "FACT-SUBJECT-005",
          },
          {
            type: "requires_property",
            from: "REQ-SKIP-EXISTING",
            to: "FACT-PROP-009",
          },
        ],
      });

      // Create conflicting fact
      await handleKbUpsert(prolog, {
        type: "fact",
        id: "FACT-PROP-010",
        properties: {
          title: "TTL 600 seconds",
          status: "active",
          source: "test://skip-check",
          fact_kind: "property_value",
          subject_key: "cache.ttl",
          property_key: "seconds",
          operator: "eq",
          value_type: "int",
          value_int: 600,
        },
      });

      // With _skipContradictionCheck, should succeed despite contradiction
      const result = await handleKbUpsert(prolog, {
        type: "req",
        id: "REQ-SKIPPED",
        properties: {
          title: "Conflicting: 600 sec TTL",
          status: "open",
          source: "test://skip-check",
        },
        relationships: [
          { type: "constrains", from: "REQ-SKIPPED", to: "FACT-SUBJECT-005" },
          {
            type: "requires_property",
            from: "REQ-SKIPPED",
            to: "FACT-PROP-010",
          },
        ],
        _skipContradictionCheck: true,
      });

      expect(result.structuredContent?.created).toBe(1);

      // Verify it exists
      const queryResult = await handleKbQuery(prolog, { id: "REQ-SKIPPED" });
      expect(queryResult.structuredContent?.entities.length).toBe(1);
    });

    test("error text mentions conflicting req IDs and subject/property info", async () => {
      // Set up existing requirement
      await handleKbUpsert(prolog, {
        type: "fact",
        id: "FACT-SUBJECT-006",
        properties: {
          title: "Max upload size subject",
          status: "active",
          source: "test://error-message",
          fact_kind: "subject",
          subject_key: "upload.max_size",
        },
      });

      await handleKbUpsert(prolog, {
        type: "fact",
        id: "FACT-PROP-011",
        properties: {
          title: "10 MB limit",
          status: "active",
          source: "test://error-message",
          fact_kind: "property_value",
          subject_key: "upload.max_size",
          property_key: "megabytes",
          operator: "eq",
          value_type: "int",
          value_int: 10,
        },
      });

      await handleKbUpsert(prolog, {
        type: "req",
        id: "REQ-ERROR-A",
        properties: {
          title: "Existing: 10 MB limit",
          status: "open",
          source: "test://error-message",
        },
        relationships: [
          { type: "constrains", from: "REQ-ERROR-A", to: "FACT-SUBJECT-006" },
          {
            type: "requires_property",
            from: "REQ-ERROR-A",
            to: "FACT-PROP-011",
          },
        ],
      });

      // Create conflicting fact
      await handleKbUpsert(prolog, {
        type: "fact",
        id: "FACT-PROP-012",
        properties: {
          title: "100 MB limit",
          status: "active",
          source: "test://error-message",
          fact_kind: "property_value",
          subject_key: "upload.max_size",
          property_key: "megabytes",
          operator: "eq",
          value_type: "int",
          value_int: 100,
        },
      });

      // Attempt conflicting upsert and verify error message
      let errorCaught = false;
      try {
        await handleKbUpsert(prolog, {
          type: "req",
          id: "REQ-ERROR-B",
          properties: {
            title: "Conflicting: 100 MB limit",
            status: "open",
            source: "test://error-message",
          },
          relationships: [
            { type: "constrains", from: "REQ-ERROR-B", to: "FACT-SUBJECT-006" },
            {
              type: "requires_property",
              from: "REQ-ERROR-B",
              to: "FACT-PROP-012",
            },
          ],
        });
      } catch (error) {
        errorCaught = true;
        const message = error instanceof Error ? error.message : String(error);
        // Error should mention contradiction, conflicting req IDs, and subject/property
        expect(message).toMatch(/contradiction/i);
        expect(message).toMatch(/REQ-ERROR-A/);
        expect(message).toMatch(/upload\.max_size/);
        expect(message).toMatch(/megabytes/);
        // Error should suggest remediation
        expect(message).toMatch(/supersedes|deprecate/i);
      }

      expect(errorCaught).toBe(true);
    });

    test("meta facts do not trigger hard rejection", async () => {
      // Create meta-type fact (not strict property_value on same subject)
      await handleKbUpsert(prolog, {
        type: "fact",
        id: "FACT-META-001",
        properties: {
          title: "System version meta",
          status: "active",
          source: "test://meta",
          fact_kind: "meta",
          subject_key: "system.version",
          property_key: "major",
          operator: "eq",
          value_type: "int",
          value_int: 2,
        },
      });

      // Create requirement using meta fact
      await handleKbUpsert(prolog, {
        type: "req",
        id: "REQ-META-001",
        properties: {
          title: "Version 2.x requirement",
          status: "open",
          source: "test://meta",
        },
        relationships: [
          { type: "constrains", from: "REQ-META-001", to: "FACT-META-001" },
        ],
      });

      // Another meta fact with different value should be allowed
      await handleKbUpsert(prolog, {
        type: "fact",
        id: "FACT-META-002",
        properties: {
          title: "System version meta 2",
          status: "active",
          source: "test://meta",
          fact_kind: "meta",
          subject_key: "system.version",
          property_key: "major",
          operator: "eq",
          value_type: "int",
          value_int: 3,
        },
      });

      // This should succeed - meta facts don't trigger contradiction enforcement
      const result = await handleKbUpsert(prolog, {
        type: "req",
        id: "REQ-META-002",
        properties: {
          title: "Version 3.x requirement",
          status: "open",
          source: "test://meta",
        },
        relationships: [
          { type: "constrains", from: "REQ-META-002", to: "FACT-META-002" },
        ],
      });

      expect(result.structuredContent?.created).toBe(1);
    });

    test("unrelated supersedes does not mask conflicts - only new req supersedes works", async () => {
      // Set up: Existing requirement that will be contradicted
      await handleKbUpsert(prolog, {
        type: "fact",
        id: "FACT-SUBJECT-SUPER-001",
        properties: {
          title: "Timeout subject",
          status: "active",
          source: "test://unrelated-supersedes",
          fact_kind: "subject",
          subject_key: "session.timeout",
        },
      });

      await handleKbUpsert(prolog, {
        type: "fact",
        id: "FACT-PROP-SUPER-001",
        properties: {
          title: "Timeout 30 minutes",
          status: "active",
          source: "test://unrelated-supersedes",
          fact_kind: "property_value",
          subject_key: "session.timeout",
          property_key: "minutes",
          operator: "eq",
          value_type: "int",
          value_int: 30,
        },
      });

      await handleKbUpsert(prolog, {
        type: "req",
        id: "REQ-EXISTING-SUPER",
        properties: {
          title: "Existing: 30 min timeout",
          status: "open",
          source: "test://unrelated-supersedes",
        },
        relationships: [
          {
            type: "constrains",
            from: "REQ-EXISTING-SUPER",
            to: "FACT-SUBJECT-SUPER-001",
          },
          {
            type: "requires_property",
            from: "REQ-EXISTING-SUPER",
            to: "FACT-PROP-SUPER-001",
          },
        ],
      });

      // Create placeholder first
      await handleKbUpsert(prolog, {
        type: "req",
        id: "REQ-OLD-PLACEHOLDER",
        properties: {
          title: "Old placeholder",
          status: "open",
          source: "test://unrelated-supersedes",
        },
      });

      // Create an unrelated requirement that supersedes the placeholder
      await handleKbUpsert(prolog, {
        type: "req",
        id: "REQ-UNRELATED-SUPER",
        properties: {
          title: "Unrelated requirement",
          status: "open",
          source: "test://unrelated-supersedes",
        },
        relationships: [
          // This supersedes relationship is unrelated to REQ-EXISTING-SUPER
          {
            type: "supersedes",
            from: "REQ-UNRELATED-SUPER",
            to: "REQ-OLD-PLACEHOLDER",
          },
        ],
      });

      // Create conflicting fact
      await handleKbUpsert(prolog, {
        type: "fact",
        id: "FACT-PROP-SUPER-002",
        properties: {
          title: "Timeout 60 minutes",
          status: "active",
          source: "test://unrelated-supersedes",
          fact_kind: "property_value",
          subject_key: "session.timeout",
          property_key: "minutes",
          operator: "eq",
          value_type: "int",
          value_int: 60,
        },
      });

      // Attempt conflicting upsert WITHOUT supersedes to the conflicting req
      // The unrelated supersedes edge should NOT mask the conflict
      let threw = false;
      try {
        await handleKbUpsert(prolog, {
          type: "req",
          id: "REQ-CONFLICT-NO-SUPER",
          properties: {
            title: "Conflicting: 60 min timeout",
            status: "open",
            source: "test://unrelated-supersedes",
          },
          relationships: [
            {
              type: "constrains",
              from: "REQ-CONFLICT-NO-SUPER",
              to: "FACT-SUBJECT-SUPER-001",
            },
            {
              type: "requires_property",
              from: "REQ-CONFLICT-NO-SUPER",
              to: "FACT-PROP-SUPER-002",
            },
          ],
        });
      } catch {
        threw = true;
      }

      expect(threw).toBe(true);
    });

    test("closed requirements still trigger contradiction rejection", async () => {
      await handleKbUpsert(prolog, {
        type: "fact",
        id: "FACT-SUBJECT-CLOSED-001",
        properties: {
          title: "Closed requirement subject",
          status: "active",
          source: "test://closed-current",
          fact_kind: "subject",
          subject_key: "session.closed",
        },
      });

      await handleKbUpsert(prolog, {
        type: "fact",
        id: "FACT-PROP-CLOSED-001",
        properties: {
          title: "Timeout 30 minutes",
          status: "active",
          source: "test://closed-current",
          fact_kind: "property_value",
          subject_key: "session.closed",
          property_key: "timeout_minutes",
          operator: "eq",
          value_type: "int",
          value_int: 30,
        },
      });

      await handleKbUpsert(prolog, {
        type: "req",
        id: "REQ-CLOSED-CURRENT-001",
        properties: {
          title: "Closed requirement remains current",
          status: "closed",
          source: "test://closed-current",
        },
        relationships: [
          {
            type: "constrains",
            from: "REQ-CLOSED-CURRENT-001",
            to: "FACT-SUBJECT-CLOSED-001",
          },
          {
            type: "requires_property",
            from: "REQ-CLOSED-CURRENT-001",
            to: "FACT-PROP-CLOSED-001",
          },
        ],
      });

      await handleKbUpsert(prolog, {
        type: "fact",
        id: "FACT-PROP-CLOSED-002",
        properties: {
          title: "Timeout 60 minutes",
          status: "active",
          source: "test://closed-current",
          fact_kind: "property_value",
          subject_key: "session.closed",
          property_key: "timeout_minutes",
          operator: "eq",
          value_type: "int",
          value_int: 60,
        },
      });

      await expect(
        handleKbUpsert(prolog, {
          type: "req",
          id: "REQ-CLOSED-CONFLICT-001",
          properties: {
            title: "Conflicts with closed requirement",
            status: "open",
            source: "test://closed-current",
          },
          relationships: [
            {
              type: "constrains",
              from: "REQ-CLOSED-CONFLICT-001",
              to: "FACT-SUBJECT-CLOSED-001",
            },
            {
              type: "requires_property",
              from: "REQ-CLOSED-CONFLICT-001",
              to: "FACT-PROP-CLOSED-002",
            },
          ],
        }),
      ).rejects.toThrow(/contradiction/i);
    });

    test("same property with non-overlapping scope is allowed", async () => {
      await handleKbUpsert(prolog, {
        type: "fact",
        id: "FACT-SUBJECT-SCOPE-001",
        properties: {
          title: "Scoped timeout subject",
          status: "active",
          source: "test://scope-overlap",
          fact_kind: "subject",
          subject_key: "session.scope",
        },
      });

      await handleKbUpsert(prolog, {
        type: "fact",
        id: "FACT-PROP-SCOPE-001",
        properties: {
          title: "Global timeout 30 minutes",
          status: "active",
          source: "test://scope-overlap",
          fact_kind: "property_value",
          subject_key: "session.scope",
          property_key: "timeout_minutes",
          operator: "eq",
          value_type: "int",
          value_int: 30,
          scope: "global",
        },
      });

      await handleKbUpsert(prolog, {
        type: "req",
        id: "REQ-SCOPE-ALLOW-001",
        properties: {
          title: "Global timeout requirement",
          status: "open",
          source: "test://scope-overlap",
        },
        relationships: [
          {
            type: "constrains",
            from: "REQ-SCOPE-ALLOW-001",
            to: "FACT-SUBJECT-SCOPE-001",
          },
          {
            type: "requires_property",
            from: "REQ-SCOPE-ALLOW-001",
            to: "FACT-PROP-SCOPE-001",
          },
        ],
      });

      await handleKbUpsert(prolog, {
        type: "fact",
        id: "FACT-PROP-SCOPE-002",
        properties: {
          title: "Tenant timeout 60 minutes",
          status: "active",
          source: "test://scope-overlap",
          fact_kind: "property_value",
          subject_key: "session.scope",
          property_key: "timeout_minutes",
          operator: "eq",
          value_type: "int",
          value_int: 60,
          scope: "tenant",
        },
      });

      const result = await handleKbUpsert(prolog, {
        type: "req",
        id: "REQ-SCOPE-ALLOW-002",
        properties: {
          title: "Tenant timeout requirement",
          status: "open",
          source: "test://scope-overlap",
        },
        relationships: [
          {
            type: "constrains",
            from: "REQ-SCOPE-ALLOW-002",
            to: "FACT-SUBJECT-SCOPE-001",
          },
          {
            type: "requires_property",
            from: "REQ-SCOPE-ALLOW-002",
            to: "FACT-PROP-SCOPE-002",
          },
        ],
      });

      expect(result.structuredContent?.created).toBe(1);
    });

    test("same property with non-overlapping validity windows is allowed", async () => {
      await handleKbUpsert(prolog, {
        type: "fact",
        id: "FACT-SUBJECT-VALIDITY-001",
        properties: {
          title: "Validity subject",
          status: "active",
          source: "test://validity-overlap",
          fact_kind: "subject",
          subject_key: "billing.plan",
        },
      });

      await handleKbUpsert(prolog, {
        type: "fact",
        id: "FACT-PROP-VALIDITY-001",
        properties: {
          title: "Grace period 7 days",
          status: "active",
          source: "test://validity-overlap",
          fact_kind: "property_value",
          subject_key: "billing.plan",
          property_key: "grace_period_days",
          operator: "eq",
          value_type: "int",
          value_int: 7,
          valid_from: "2026-01-01T00:00:00Z",
          valid_to: "2026-03-01T00:00:00Z",
        },
      });

      await handleKbUpsert(prolog, {
        type: "req",
        id: "REQ-VALIDITY-ALLOW-001",
        properties: {
          title: "First validity window",
          status: "open",
          source: "test://validity-overlap",
        },
        relationships: [
          {
            type: "constrains",
            from: "REQ-VALIDITY-ALLOW-001",
            to: "FACT-SUBJECT-VALIDITY-001",
          },
          {
            type: "requires_property",
            from: "REQ-VALIDITY-ALLOW-001",
            to: "FACT-PROP-VALIDITY-001",
          },
        ],
      });

      await handleKbUpsert(prolog, {
        type: "fact",
        id: "FACT-PROP-VALIDITY-002",
        properties: {
          title: "Grace period 14 days",
          status: "active",
          source: "test://validity-overlap",
          fact_kind: "property_value",
          subject_key: "billing.plan",
          property_key: "grace_period_days",
          operator: "eq",
          value_type: "int",
          value_int: 14,
          valid_from: "2026-04-01T00:00:00Z",
          valid_to: "2026-06-01T00:00:00Z",
        },
      });

      const result = await handleKbUpsert(prolog, {
        type: "req",
        id: "REQ-VALIDITY-ALLOW-002",
        properties: {
          title: "Second validity window",
          status: "open",
          source: "test://validity-overlap",
        },
        relationships: [
          {
            type: "constrains",
            from: "REQ-VALIDITY-ALLOW-002",
            to: "FACT-SUBJECT-VALIDITY-001",
          },
          {
            type: "requires_property",
            from: "REQ-VALIDITY-ALLOW-002",
            to: "FACT-PROP-VALIDITY-002",
          },
        ],
      });

      expect(result.structuredContent?.created).toBe(1);
    });

    test("different properties on the same subject do not trigger rejection", async () => {
      await handleKbUpsert(prolog, {
        type: "fact",
        id: "FACT-SUBJECT-DIFFERENT-PROP-001",
        properties: {
          title: "Shared subject",
          status: "active",
          source: "test://different-property",
          fact_kind: "subject",
          subject_key: "session.config",
        },
      });

      await handleKbUpsert(prolog, {
        type: "fact",
        id: "FACT-PROP-DIFFERENT-PROP-001",
        properties: {
          title: "Timeout 30 minutes",
          status: "active",
          source: "test://different-property",
          fact_kind: "property_value",
          subject_key: "session.config",
          property_key: "timeout_minutes",
          operator: "eq",
          value_type: "int",
          value_int: 30,
        },
      });

      await handleKbUpsert(prolog, {
        type: "req",
        id: "REQ-DIFFERENT-PROP-001",
        properties: {
          title: "Timeout requirement",
          status: "open",
          source: "test://different-property",
        },
        relationships: [
          {
            type: "constrains",
            from: "REQ-DIFFERENT-PROP-001",
            to: "FACT-SUBJECT-DIFFERENT-PROP-001",
          },
          {
            type: "requires_property",
            from: "REQ-DIFFERENT-PROP-001",
            to: "FACT-PROP-DIFFERENT-PROP-001",
          },
        ],
      });

      await handleKbUpsert(prolog, {
        type: "fact",
        id: "FACT-PROP-DIFFERENT-PROP-002",
        properties: {
          title: "Retry count 5",
          status: "active",
          source: "test://different-property",
          fact_kind: "property_value",
          subject_key: "session.config",
          property_key: "max_retries",
          operator: "eq",
          value_type: "int",
          value_int: 5,
        },
      });

      const result = await handleKbUpsert(prolog, {
        type: "req",
        id: "REQ-DIFFERENT-PROP-002",
        properties: {
          title: "Retry requirement",
          status: "open",
          source: "test://different-property",
        },
        relationships: [
          {
            type: "constrains",
            from: "REQ-DIFFERENT-PROP-002",
            to: "FACT-SUBJECT-DIFFERENT-PROP-001",
          },
          {
            type: "requires_property",
            from: "REQ-DIFFERENT-PROP-002",
            to: "FACT-PROP-DIFFERENT-PROP-002",
          },
        ],
      });

      expect(result.structuredContent?.created).toBe(1);
    });

    test("reserved fields do not change contradiction rejection", async () => {
      await handleKbUpsert(prolog, {
        type: "fact",
        id: "FACT-SUBJECT-RESERVED-001",
        properties: {
          title: "Reserved field subject",
          status: "active",
          source: "test://reserved-fields",
          fact_kind: "subject",
          subject_key: "user.permissions",
        },
      });

      await handleKbUpsert(prolog, {
        type: "fact",
        id: "FACT-PROP-RESERVED-001",
        properties: {
          title: "Admin true",
          status: "active",
          source: "test://reserved-fields",
          fact_kind: "property_value",
          subject_key: "user.permissions",
          property_key: "admin_access",
          operator: "eq",
          value_type: "bool",
          value_bool: true,
          closed_world: true,
          canonical_key: "user.permissions.admin_access.eq.true",
          claim_key: "CLAIM-96720CB5F7E6C80C",
          claim_text: "Admin access required",
        },
      });

      await handleKbUpsert(prolog, {
        type: "req",
        id: "REQ-RESERVED-001",
        properties: {
          title: "Admin access required",
          status: "open",
          source: "test://reserved-fields",
          logic_claims: ["CLAIM-96720CB5F7E6C80C"],
          semantic_inventory_version: "kibi.semantic-inventory.v1",
          semantic_source_field: "title",
          semantic_source_hash:
            "812fc837108361ba43606606235d2ce67d8d4dca7df4cc21cf90fd96ea583128",
          semantic_inventory: [
            {
              claim_key: "CLAIM-96720CB5F7E6C80C",
              claim_text: "Admin access required",
              role: "normative",
              status: "modeled",
              span: { start: 0, end: 21 },
            },
          ],
        },
        relationships: [
          {
            type: "constrains",
            from: "REQ-RESERVED-001",
            to: "FACT-SUBJECT-RESERVED-001",
          },
          {
            type: "requires_property",
            from: "REQ-RESERVED-001",
            to: "FACT-PROP-RESERVED-001",
          },
        ],
      });

      await handleKbUpsert(prolog, {
        type: "fact",
        id: "FACT-PROP-RESERVED-002",
        properties: {
          title: "Admin false",
          status: "active",
          source: "test://reserved-fields",
          fact_kind: "property_value",
          subject_key: "user.permissions",
          property_key: "admin_access",
          operator: "eq",
          value_type: "bool",
          value_bool: false,
          closed_world: false,
          canonical_key: "user.permissions.admin_access.eq.false",
          claim_key: "CLAIM-C1962C62F34F1603",
          claim_text: "Admin access forbidden",
        },
      });

      await expect(
        handleKbUpsert(prolog, {
          type: "req",
          id: "REQ-RESERVED-002",
          properties: {
            title: "Admin access forbidden",
            status: "open",
            source: "test://reserved-fields",
            logic_claims: ["CLAIM-C1962C62F34F1603"],
            semantic_inventory_version: "kibi.semantic-inventory.v1",
            semantic_source_field: "title",
            semantic_source_hash:
              "21352758d70032ad189683dde8e2401d2ace303c8e7f2829feb71d515ae9a200",
            semantic_inventory: [
              {
                claim_key: "CLAIM-C1962C62F34F1603",
                claim_text: "Admin access forbidden",
                role: "normative",
                status: "modeled",
                span: { start: 0, end: 22 },
              },
            ],
          },
          relationships: [
            {
              type: "constrains",
              from: "REQ-RESERVED-002",
              to: "FACT-SUBJECT-RESERVED-001",
            },
            {
              type: "requires_property",
              from: "REQ-RESERVED-002",
              to: "FACT-PROP-RESERVED-002",
            },
          ],
        }),
      ).rejects.toThrow(/contradiction/i);
    });

    test("rejects relationships whose source does not match the upserted entity", async () => {
      await handleKbUpsert(prolog, {
        type: "req",
        id: "REQ-FOREIGN-OLD",
        properties: {
          title: "Old requirement",
          status: "open",
          source: "test://foreign-source",
        },
      });

      await handleKbUpsert(prolog, {
        type: "req",
        id: "REQ-FOREIGN-OTHER",
        properties: {
          title: "Other requirement",
          status: "open",
          source: "test://foreign-source",
        },
      });

      await expect(
        handleKbUpsert(prolog, {
          type: "req",
          id: "REQ-FOREIGN-NEW",
          properties: {
            title: "New requirement",
            status: "open",
            source: "test://foreign-source",
          },
          relationships: [
            {
              type: "supersedes",
              from: "REQ-FOREIGN-OTHER",
              to: "REQ-FOREIGN-OLD",
            },
          ],
        }),
      ).rejects.toThrow(/from.*REQ-FOREIGN-NEW|source.*upserted entity/i);
    });

    test("failed contradiction write leaves no audit residue after save/detach/reattach", async () => {
      // Set up existing requirement
      await handleKbUpsert(prolog, {
        type: "fact",
        id: "FACT-SUBJECT-AUDIT",
        properties: {
          title: "Feature flag subject",
          status: "active",
          source: "test://audit-residue",
          fact_kind: "subject",
          subject_key: "feature.x",
        },
      });

      await handleKbUpsert(prolog, {
        type: "fact",
        id: "FACT-PROP-AUDIT-001",
        properties: {
          title: "Enabled true",
          status: "active",
          source: "test://audit-residue",
          fact_kind: "property_value",
          subject_key: "feature.x",
          property_key: "enabled",
          operator: "eq",
          value_type: "bool",
          value_bool: true,
        },
      });

      await handleKbUpsert(prolog, {
        type: "req",
        id: "REQ-AUDIT-EXISTING",
        properties: {
          title: "Existing: enable feature x",
          status: "open",
          source: "test://audit-residue",
        },
        relationships: [
          {
            type: "constrains",
            from: "REQ-AUDIT-EXISTING",
            to: "FACT-SUBJECT-AUDIT",
          },
          {
            type: "requires_property",
            from: "REQ-AUDIT-EXISTING",
            to: "FACT-PROP-AUDIT-001",
          },
        ],
      });

      // Save and detach to persist the baseline
      await prolog.query("kb_save");
      await prolog.query("kb_detach");

      // Reattach
      await prolog.query(`kb_attach('${testKbPath}')`);

      // Create conflicting fact
      await handleKbUpsert(prolog, {
        type: "fact",
        id: "FACT-PROP-AUDIT-002",
        properties: {
          title: "Enabled false",
          status: "active",
          source: "test://audit-residue",
          fact_kind: "property_value",
          subject_key: "feature.x",
          property_key: "enabled",
          operator: "eq",
          value_type: "bool",
          value_bool: false,
        },
      });

      // Attempt conflicting upsert - should fail
      try {
        await handleKbUpsert(prolog, {
          type: "req",
          id: "REQ-AUDIT-FAIL",
          properties: {
            title: "Conflicting: disable feature x",
            status: "open",
            source: "test://audit-residue",
          },
          relationships: [
            {
              type: "constrains",
              from: "REQ-AUDIT-FAIL",
              to: "FACT-SUBJECT-AUDIT",
            },
            {
              type: "requires_property",
              from: "REQ-AUDIT-FAIL",
              to: "FACT-PROP-AUDIT-002",
            },
          ],
        });
      } catch {
        // Expected
      }

      // Save, detach, reattach
      await prolog.query("kb_save");
      await prolog.query("kb_detach");
      await prolog.query(`kb_attach('${testKbPath}')`);

      // Verify the failed entity does NOT exist
      const queryResult = await handleKbQuery(prolog, { id: "REQ-AUDIT-FAIL" });
      expect(queryResult.structuredContent?.entities.length).toBe(0);

      // Verify no audit changesets were persisted for the failed entity or its relationships
      const auditResult = await prolog.query(
        "aggregate_all(count, (changeset(_, _, Id, _), sub_atom(Id, 0, _, _, 'REQ-AUDIT-FAIL')), Count)",
      );
      expect(auditResult.success).toBe(true);
      expect(Number(auditResult.bindings.Count)).toBe(0);
    }, 15000);
  });

  describe("typed fact upsert", () => {
    test("should successfully upsert a typed fact with value_int", async () => {
      const result = await handleKbUpsert(prolog, {
        type: "fact",
        id: "FACT-TYPED-INT-001",
        properties: {
          title: "Session timeout fact",
          status: "active",
          source: "test://typed-fact",
          fact_kind: "property_value",
          subject_key: "user.session",
          property_key: "timeout_minutes",
          operator: "eq",
          value_type: "int",
          value_int: 30,
        },
      });

      expect(result.structuredContent?.created).toBe(1);

      // Verify it can be queried back
      const queryResult = await handleKbQuery(prolog, {
        id: "FACT-TYPED-INT-001",
      });

      expect(queryResult.structuredContent?.entities.length).toBe(1);
      const entity = queryResult.structuredContent?.entities[0] as Record<
        string,
        unknown
      >;
      expect(entity?.value_int).toBe(30);
      expect(entity?.value_type).toBe("int");
      expect(entity?.operator).toBe("eq");
    });

    test("should successfully upsert a typed fact with closed_world boolean", async () => {
      const result = await handleKbUpsert(prolog, {
        type: "fact",
        id: "FACT-CLOSED-WORLD-001",
        properties: {
          title: "Closed world fact",
          status: "active",
          source: "test://typed-fact",
          fact_kind: "property_value",
          subject_key: "user.permissions",
          property_key: "admin",
          operator: "eq",
          value_type: "bool",
          value_bool: true,
          closed_world: true,
        },
      });

      expect(result.structuredContent?.created).toBe(1);

      // Verify it can be queried back with boolean preserved
      const queryResult = await handleKbQuery(prolog, {
        id: "FACT-CLOSED-WORLD-001",
      });

      expect(queryResult.structuredContent?.entities.length).toBe(1);
      const entity = queryResult.structuredContent?.entities[0] as Record<
        string,
        unknown
      >;
      expect(entity?.closed_world).toBe(true);
      expect(entity?.value_bool).toBe(true);
    });

    test("should reject non-fact entity with fact_kind", async () => {
      // Req entities should not accept fact_kind
      await expect(
        handleKbUpsert(prolog, {
          type: "req",
          id: "REQ-FACT-KIND-INVALID",
          properties: {
            title: "Invalid req with fact_kind",
            status: "open",
            source: "test://typed-fact",
            fact_kind: "property_value",
          },
        }),
      ).rejects.toThrow();
    });

    test("should reject fact with invalid polarity", async () => {
      await expect(
        handleKbUpsert(prolog, {
          type: "fact",
          id: "FACT-INVALID-POLARITY",
          properties: {
            title: "Invalid polarity fact",
            status: "active",
            source: "test://typed-fact",
            fact_kind: "property_value",
            subject_key: "user",
            property_key: "name",
            operator: "eq",
            value_type: "string",
            value_string: "test",
            polarity: "maybe", // Invalid value
          },
        }),
      ).rejects.toThrow();
    });

    test("should accept fact with valid require polarity", async () => {
      const result = await handleKbUpsert(prolog, {
        type: "fact",
        id: "FACT-REQUIRE-POLARITY",
        properties: {
          title: "Require polarity fact",
          status: "active",
          source: "test://typed-fact",
          fact_kind: "property_value",
          subject_key: "user",
          property_key: "active",
          operator: "eq",
          value_type: "bool",
          value_bool: true,
          polarity: "require",
        },
      });

      expect(result.structuredContent?.created).toBe(1);

      const queryResult = await handleKbQuery(prolog, {
        id: "FACT-REQUIRE-POLARITY",
      });

      expect(queryResult.structuredContent?.entities.length).toBe(1);
      const entity = queryResult.structuredContent?.entities[0] as Record<
        string,
        unknown
      >;
      expect(entity?.polarity).toBe("require");
    });

    test("should preserve all typed literal values in round-trip", async () => {
      // Create a typed fact with various value types
      const factId = "FACT-ROUNDTRIP-001";

      await handleKbUpsert(prolog, {
        type: "fact",
        id: factId,
        properties: {
          title: "Roundtrip test fact",
          status: "active",
          source: "test://roundtrip",
          fact_kind: "property_value",
          subject_key: "api.rate_limit",
          property_key: "requests_per_second",
          operator: "eq",
          value_type: "int",
          value_int: 100,
          closed_world: false,
          canonical_key: "api.rate_limit.requests_per_second.eq.100",
          polarity: "require",
        },
      });

      // Query back and verify all values
      const queryResult = await handleKbQuery(prolog, { id: factId });
      expect(queryResult.structuredContent?.entities.length).toBe(1);

      const entity = queryResult.structuredContent?.entities[0] as Record<
        string,
        unknown
      >;

      // Verify scalar values are preserved
      expect(entity?.value_int).toBe(100);
      expect(entity?.closed_world).toBe(false);
      expect(entity?.canonical_key).toBe(
        "api.rate_limit.requests_per_second.eq.100",
      );
      expect(entity?.fact_kind).toBe("property_value");
      expect(entity?.operator).toBe("eq");
      expect(entity?.value_type).toBe("int");
      expect(entity?.polarity).toBe("require");
    });
  });

  describe("typed literal codec coverage", () => {
    test("should preserve integer values in round-trip", async () => {
      const factId = "FACT-CODEC-INT-001";

      await handleKbUpsert(prolog, {
        type: "fact",
        id: factId,
        properties: {
          title: "Codec int test",
          status: "active",
          source: "test://codec",
          fact_kind: "property_value",
          subject_key: "test",
          property_key: "count",
          operator: "eq",
          value_type: "int",
          value_int: 42,
        },
      });

      // Query back to verify integer is preserved as number
      const queryResult = await handleKbQuery(prolog, { id: factId });
      expect(queryResult.structuredContent?.entities.length).toBe(1);

      const entity = queryResult.structuredContent?.entities[0] as Record<
        string,
        unknown
      >;
      expect(entity?.value_int).toBe(42);
      expect(entity?.value_int).toBeNumber();
    });

    test("should preserve boolean values in round-trip", async () => {
      const factId = "FACT-CODEC-BOOL-001";

      await handleKbUpsert(prolog, {
        type: "fact",
        id: factId,
        properties: {
          title: "Codec bool test",
          status: "active",
          source: "test://codec",
          fact_kind: "property_value",
          subject_key: "test",
          property_key: "enabled",
          operator: "eq",
          value_type: "bool",
          value_bool: false,
          closed_world: true,
        },
      });

      // Query back to verify booleans are preserved
      const queryResult = await handleKbQuery(prolog, { id: factId });
      expect(queryResult.structuredContent?.entities.length).toBe(1);

      const entity = queryResult.structuredContent?.entities[0] as Record<
        string,
        unknown
      >;
      expect(entity?.value_bool).toBe(false);
      expect(entity?.closed_world).toBe(true);
      expect(entity?.value_bool).toBeBoolean();
      expect(entity?.closed_world).toBeBoolean();
    });

    test("should preserve decimal number values in round-trip", async () => {
      const factId = "FACT-CODEC-NUMBER-001";

      await handleKbUpsert(prolog, {
        type: "fact",
        id: factId,
        properties: {
          title: "Codec number test",
          status: "active",
          source: "test://codec",
          fact_kind: "property_value",
          subject_key: "api",
          property_key: "rate",
          operator: "eq",
          value_type: "number",
          value_number: 3.14,
        },
      });

      // Query back to verify decimal is preserved
      const queryResult = await handleKbQuery(prolog, { id: factId });
      expect(queryResult.structuredContent?.entities.length).toBe(1);

      const entity = queryResult.structuredContent?.entities[0] as Record<
        string,
        unknown
      >;
      expect(entity?.value_number).toBe(3.14);
      expect(entity?.value_number).toBeNumber();
    });
  });

  describe("strict-lane pairing validation for constrains/requires_property", () => {
    test("should reject constrains relationship to a property_value fact", async () => {
      // Create a property_value fact (not a subject fact)
      await handleKbUpsert(prolog, {
        type: "fact",
        id: "FACT-PROP-SL-001",
        properties: {
          title: "Property value fact",
          status: "active",
          source: "test://strict-lane",
          fact_kind: "property_value",
          subject_key: "user.session",
          property_key: "timeout_minutes",
          operator: "eq",
          value_type: "int",
          value_int: 30,
        },
      });

      // Attempt to create a req with constrains pointing to property_value fact
      await expect(
        handleKbUpsert(prolog, {
          type: "req",
          id: "REQ-CONSTRAINS-PROP-VAL",
          properties: {
            title: "Req constrains property_value",
            status: "open",
            source: "test://strict-lane",
          },
          relationships: [
            {
              type: "constrains",
              from: "REQ-CONSTRAINS-PROP-VAL",
              to: "FACT-PROP-SL-001",
            },
          ],
        }),
      ).rejects.toThrow(/constrains.*subject.*observation.*meta/);
    });

    test("should reject requires_property relationship to a subject fact", async () => {
      // Create a subject fact (not a property_value fact)
      await handleKbUpsert(prolog, {
        type: "fact",
        id: "FACT-SUBJECT-SL-001",
        properties: {
          title: "Subject fact",
          status: "active",
          source: "test://strict-lane",
          fact_kind: "subject",
          subject_key: "user.session",
        },
      });

      // Attempt to create a req with requires_property pointing to subject fact
      await expect(
        handleKbUpsert(prolog, {
          type: "req",
          id: "REQ-REQUIRES-SUBJECT",
          properties: {
            title: "Req requires_property from subject",
            status: "open",
            source: "test://strict-lane",
          },
          relationships: [
            {
              type: "requires_property",
              from: "REQ-REQUIRES-SUBJECT",
              to: "FACT-SUBJECT-SL-001",
            },
          ],
        }),
      ).rejects.toThrow(/requires_property.*property_value.*observation.*meta/);
    });
  });
});
