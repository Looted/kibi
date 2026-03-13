/**
 * Tests for helper functions in helpers.ts
 * Pure functions with no VS Code dependencies - fast unit tests
 */

import { describe, expect, test } from "bun:test";
import {
  buildHoverMarkdown,
  categorizeEntities,
  formatLensTitle,
} from "../src/helpers";

describe("categorizeEntities", () => {
  test("empty relationships returns empty categories", () => {
    const result = categorizeEntities([]);
    expect(result).toEqual({
      reqs: [],
      scenarios: [],
      tests: [],
      adrs: [],
      flags: [],
      events: [],
      symbols: [],
      other: [],
    });
  });

  test("single REQ- entity categorized correctly", () => {
    const result = categorizeEntities([
      { type: "verified_by", from: "REQ-001", to: "TEST-001" },
    ]);
    expect(result.reqs).toEqual(["REQ-001"]);
    expect(result.tests).toEqual(["TEST-001"]);
  });

  test("mixed entities categorized by prefix", () => {
    const result = categorizeEntities([
      { type: "specified_by", from: "REQ-001", to: "SCEN-001" },
      { type: "verified_by", from: "REQ-001", to: "TEST-001" },
      { type: "constrained_by", from: "SYM-001", to: "ADR-001" },
    ]);
    expect(result.reqs).toEqual(["REQ-001"]);
    expect(result.scenarios).toEqual(["SCEN-001"]);
    expect(result.tests).toEqual(["TEST-001"]);
    expect(result.symbols).toEqual(["SYM-001"]);
    expect(result.adrs).toEqual(["ADR-001"]);
  });

  test("unknown prefix categorized as other", () => {
    const result = categorizeEntities([
      { type: "relates_to", from: "UNKNOWN-001", to: "REQ-001" },
    ]);
    expect(result.other).toEqual(["UNKNOWN-001"]);
    expect(result.reqs).toEqual(["REQ-001"]);
  });

  test("duplicate IDs are deduplicated", () => {
    const result = categorizeEntities([
      { type: "verified_by", from: "REQ-001", to: "TEST-001" },
      { type: "specified_by", from: "REQ-001", to: "SCEN-001" },
      { type: "constrained_by", from: "TEST-001", to: "ADR-001" },
    ]);
    expect(result.reqs).toEqual(["REQ-001"]);
    expect(result.tests).toEqual(["TEST-001"]);
    expect(result.scenarios).toEqual(["SCEN-001"]);
    expect(result.adrs).toEqual(["ADR-001"]);
  });

  test("flags and events categorized correctly", () => {
    const result = categorizeEntities([
      { type: "guards", from: "FLAG-001", to: "SYM-001" },
      { type: "publishes", from: "SYM-001", to: "EVENT-001" },
    ]);
    expect(result.flags).toEqual(["FLAG-001"]);
    expect(result.symbols).toEqual(["SYM-001"]);
    expect(result.events).toEqual(["EVENT-001"]);
  });

  test("all prefixes categorized correctly", () => {
    const result = categorizeEntities([
      { type: "relates_to", from: "REQ-001", to: "SCEN-001" },
      { type: "relates_to", from: "TEST-001", to: "ADR-001" },
      { type: "relates_to", from: "FLAG-001", to: "EVENT-001" },
      { type: "relates_to", from: "SYM-001", to: "SYM-002" },
    ]);
    expect(result.reqs).toEqual(["REQ-001"]);
    expect(result.scenarios).toEqual(["SCEN-001"]);
    expect(result.tests).toEqual(["TEST-001"]);
    expect(result.adrs).toEqual(["ADR-001"]);
    expect(result.flags).toEqual(["FLAG-001"]);
    expect(result.events).toEqual(["EVENT-001"]);
    expect(result.symbols).toEqual(["SYM-001", "SYM-002"]);
  });
});

describe("formatLensTitle", () => {
  test("empty categories returns 'No linked entities'", () => {
    const result = formatLensTitle({}, []);
    expect(result).toBe("No linked entities");
  });

  test("single category with count 1 uses singular", () => {
    const result = formatLensTitle({ reqs: ["REQ-001"] }, []);
    expect(result).toBe("📋 1 req");
  });

  test("single category with count > 1 uses plural", () => {
    const result = formatLensTitle({ reqs: ["REQ-001", "REQ-002"] }, []);
    expect(result).toBe("📋 2 reqs");
  });

  test("multiple categories joined with bullet", () => {
    const result = formatLensTitle(
      { reqs: ["REQ-001"], tests: ["TEST-001", "TEST-002"] },
      [],
    );
    expect(result).toBe("📋 1 req • ✓ 2 tests");
  });

  test("zero counts are omitted", () => {
    const result = formatLensTitle(
      {
        reqs: [],
        tests: ["TEST-001"],
        adrs: [],
        scenarios: ["SCEN-001"],
      },
      [],
    );
    expect(result).toBe("✓ 1 test • 🎭 1 scenario");
  });

  test("all category types with correct emojis", () => {
    const result = formatLensTitle(
      {
        reqs: ["REQ-001"],
        scenarios: ["SCEN-001"],
        tests: ["TEST-001"],
        adrs: ["ADR-001"],
        flags: ["FLAG-001"],
        events: ["EVENT-001"],
        symbols: ["SYM-001"],
      },
      [],
    );
    expect(result).toBe(
      "📋 1 req • 🎭 1 scenario • ✓ 1 test • 📐 1 ADR • 🚩 1 flag • ⚡ 1 event • 🔗 1 symbol",
    );
  });

  test("single flag guarded by flag name", () => {
    const result = formatLensTitle({}, [
      { flagId: "FLAG-001", flagName: "beta" },
    ]);
    expect(result).toBe("🚩 guarded by beta");
  });

  test("multiple flags guarded by multiple names", () => {
    const result = formatLensTitle({}, [
      { flagId: "FLAG-001", flagName: "beta" },
      { flagId: "FLAG-002", flagName: "experimental" },
    ]);
    expect(result).toBe("🚩 guarded by beta, experimental");
  });

  test("categories and flags combined", () => {
    const result = formatLensTitle({ reqs: ["REQ-001", "REQ-002"] }, [
      { flagId: "FLAG-001", flagName: "beta" },
    ]);
    expect(result).toBe("📋 2 reqs • 🚩 guarded by beta");
  });

  test("singular vs plural for all categories", () => {
    const result = formatLensTitle(
      {
        reqs: ["REQ-001"],
        scenarios: ["SCEN-001", "SCEN-002"],
        tests: ["TEST-001"],
        adrs: ["ADR-001", "ADR-002", "ADR-003"],
        flags: ["FLAG-001"],
        events: ["EVENT-001", "EVENT-002"],
        symbols: ["SYM-001"],
      },
      [],
    );
    expect(result).toBe(
      "📋 1 req • 🎭 2 scenarios • ✓ 1 test • 📐 3 ADRs • 🚩 1 flag • ⚡ 2 events • 🔗 1 symbol",
    );
  });
});

describe("buildHoverMarkdown", () => {
  test("single entity with all fields", () => {
    const symbolInfo = {
      id: "SYM-001",
      title: "Process Payment",
      file: "src/payment.ts",
      line: 42,
    };
    const entities = [
      {
        id: "REQ-001",
        type: "req",
        title: "Payment Processing",
        status: "active",
        tags: ["payment", "core"],
      },
    ];
    const result = buildHoverMarkdown(symbolInfo, entities);
    expect(result).toContain("# SYM-001");
    expect(result).toContain("`src/payment.ts:42`");
    expect(result).toContain(
      "📋 **REQ-001**: Payment Processing (status: active, tags: payment, core)",
    );
    expect(result).toContain(
      "[Browse entities](command:kibi.browseLinkedEntities)",
    );
  });

  test("multiple entities ordered correctly", () => {
    const symbolInfo = {
      id: "SYM-001",
      title: "User Authentication",
      file: "src/auth.ts",
      line: 10,
    };
    const entities = [
      {
        id: "REQ-001",
        type: "req",
        title: "User Login",
        status: "active",
        tags: ["auth"],
      },
      {
        id: "TEST-001",
        type: "test",
        title: "Login Test",
        status: "passed",
        tags: ["unit", "auth"],
      },
      {
        id: "ADR-001",
        type: "adr",
        title: "JWT Decision",
        status: "accepted",
        tags: ["security"],
      },
    ];
    const result = buildHoverMarkdown(symbolInfo, entities);
    expect(result).toContain("# SYM-001");
    expect(result).toContain("`src/auth.ts:10`");
    expect(result).toContain(
      "📋 **REQ-001**: User Login (status: active, tags: auth)",
    );
    expect(result).toContain(
      "✓ **TEST-001**: Login Test (status: passed, tags: unit, auth)",
    );
    expect(result).toContain(
      "📐 **ADR-001**: JWT Decision (status: accepted, tags: security)",
    );
  });

  test("empty entities array shows no entity lines", () => {
    const symbolInfo = {
      id: "SYM-001",
      title: "Function",
      file: "src/file.ts",
      line: 5,
    };
    const entities: Parameters<typeof buildHoverMarkdown>[1] = [];
    const result = buildHoverMarkdown(symbolInfo, entities);
    expect(result).toContain("# SYM-001");
    expect(result).toContain("`src/file.ts:5`");
    expect(result).toContain(
      "[Browse entities](command:kibi.browseLinkedEntities)",
    );
    expect(result).not.toMatch(/\*\*.*\*\*:/); // No entity entries
  });

  test("empty tags shows 'none'", () => {
    const symbolInfo = {
      id: "SYM-001",
      title: "Function",
      file: "src/file.ts",
      line: 5,
    };
    const entities = [
      {
        id: "TEST-001",
        type: "test",
        title: "Test",
        status: "passed",
        tags: [],
      },
    ];
    const result = buildHoverMarkdown(symbolInfo, entities);
    expect(result).toContain("tags: none");
  });

  test("all entity types with correct emojis", () => {
    const symbolInfo = {
      id: "SYM-001",
      title: "Symbol",
      file: "src/file.ts",
      line: 1,
    };
    const entities = [
      { id: "REQ-001", type: "req", title: "Req", status: "active", tags: [] },
      {
        id: "SCEN-001",
        type: "scenario",
        title: "Scenario",
        status: "draft",
        tags: [],
      },
      {
        id: "TEST-001",
        type: "test",
        title: "Test",
        status: "passed",
        tags: [],
      },
      {
        id: "ADR-001",
        type: "adr",
        title: "ADR",
        status: "accepted",
        tags: [],
      },
      {
        id: "FLAG-001",
        type: "flag",
        title: "Flag",
        status: "enabled",
        tags: [],
      },
      {
        id: "EVENT-001",
        type: "event",
        title: "Event",
        status: "active",
        tags: [],
      },
      {
        id: "SYM-002",
        type: "symbol",
        title: "Symbol",
        status: "active",
        tags: [],
      },
    ];
    const result = buildHoverMarkdown(symbolInfo, entities);
    expect(result).toContain("📋 **REQ-001**");
    expect(result).toContain("🎭 **SCEN-001**");
    expect(result).toContain("✓ **TEST-001**");
    expect(result).toContain("📐 **ADR-001**");
    expect(result).toContain("🚩 **FLAG-001**");
    expect(result).toContain("⚡ **EVENT-001**");
    expect(result).toContain("🔗 **SYM-002**");
  });

  test("command link always present", () => {
    const symbolInfo = {
      id: "SYM-001",
      title: "Function",
      file: "src/file.ts",
      line: 5,
    };
    const entities: Parameters<typeof buildHoverMarkdown>[1] = [];
    const result = buildHoverMarkdown(symbolInfo, entities);
    expect(result).toContain(
      "[Browse entities](command:kibi.browseLinkedEntities)",
    );
  });

  test("special characters in title and tags handled", () => {
    const symbolInfo = {
      id: "SYM-001",
      title: "Function with <script>",
      file: "src/file.ts",
      line: 5,
    };
    const entities = [
      {
        id: "REQ-001",
        type: "req",
        title: "Requirement with & special <chars>",
        status: "active",
        tags: ["tag-with-dash", "tag_with_underscore"],
      },
    ];
    const result = buildHoverMarkdown(symbolInfo, entities);
    expect(result).toContain("Requirement with & special <chars>");
    expect(result).toContain("tag-with-dash, tag_with_underscore");
  });
});
