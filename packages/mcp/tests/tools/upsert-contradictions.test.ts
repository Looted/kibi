import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  setDefaultTimeout,
  test,
} from "bun:test";

// One-shot mode spawns a fresh swipl process per query (~1-1.5s each).
// Tests with 4+ sequential upserts exceed the default 5s timeout.
setDefaultTimeout(30_000);
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { PrologProcess } from "kibi-cli/prolog";
import { handleKbQuery } from "../../src/tools/query.js";
import { handleKbUpsert } from "../../src/tools/upsert.js";

describe("MCP Upsert Contradictions and Typed Facts", () => {
  let prolog: PrologProcess;
  let testKbPath: string;

  beforeAll(async () => {
    prolog = new PrologProcess();
    await prolog.start();
    await prolog.query(
      "set_prolog_flag(answer_write_options, [max_depth(0), spacing(next_argument)])",
    );

    testKbPath = await fs.mkdtemp(path.join(os.tmpdir(), "kibi-mcp-upsert-"));
  });

  beforeEach(async () => {
    // Detach first to avoid "No permission to attach" on test 2+
    await prolog.query("kb_detach").catch(() => {});
    await fs.rm(testKbPath, { recursive: true, force: true });
    await fs.mkdir(testKbPath, { recursive: true });
    await prolog.query(`kb_attach('${testKbPath}')`);
  });

  afterAll(async () => {
    if (prolog?.isRunning()) {
      await prolog.query("kb_detach");
      await prolog.terminate();
    }
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
