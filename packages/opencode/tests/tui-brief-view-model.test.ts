import { describe, expect, it } from "bun:test";
import {
  buildTuiBriefSummary,
  buildTuiBriefViewModel,
} from "../src/tui-brief-view-model";
import type {
  DeliveryReasons,
  IdleBriefEnvelope,
  IdleBriefEnvelopeV1,
  IdleBriefEnvelopeV2,
} from "../src/idle-brief-store";

function makeV1(
  overrides: Partial<IdleBriefEnvelopeV1> = {},
): IdleBriefEnvelopeV1 {
  return {
    schemaVersion: "1.0",
    briefId: "brief-v1",
    type: "success",
    sessionId: "session-1",
    branch: "main",
    createdAt: "2026-04-25T10:00:00Z",
    unread: true,
    auditCursor: {
      lastTimestamp: "2026-04-25T10:00:00+00:00",
      lastOperation: "upsert",
      entryCount: 1,
      fileSize: 100,
    },
    summary: "test summary v1",
    counts: {
      requirementsAdded: 2,
      relationshipsAdded: 3,
      entitiesDeleted: 1,
    },
    validation: { violations: [], count: 0, diagnostics: [] },
    briefing: {
      tldr: "v1 tldr",
      promptBlock: "v1 prompt",
      citations: [
        { id: "CIT-001", title: "Citation 1", source: "docs/foo.md" },
      ],
      constraints: [{ statement: "Must do X", citationIds: [] }],
      regressionRisks: [{ statement: "Risk Y", citationIds: [] }],
      missingEvidence: [{ statement: "Evidence Z", citationIds: [] }],
    },
    contentHash: "hash-v1",
    ...overrides,
  };
}

function makeV2(
  overrides: Partial<IdleBriefEnvelopeV2> = {},
): IdleBriefEnvelopeV2 {
  return {
    schemaVersion: "2.0",
    briefId: "brief-v2",
    type: "warning",
    sessionId: "session-2",
    branch: "develop",
    createdAt: "2026-04-26T10:00:00Z",
    unread: false,
    auditCursor: {
      lastTimestamp: "2026-04-26T10:00:00+00:00",
      lastOperation: "upsert",
      entryCount: 3,
      fileSize: 200,
    },
    summary: "test summary v2",
    counts: {
      entitiesAdded: 4,
      entitiesModified: 5,
      entitiesRemoved: 2,
      relationshipsChanged: 6,
    },
    changes: {
      entities: {
        added: [{ id: "REQ-001", type: "req", title: "Test requirement" }],
        modified: [{ id: "REQ-002", type: "req", title: "Modified req" }],
        removed: [],
      },
      relationships: {
        changed: 6,
      },
    },
    validation: {
      violations: [
        {
          rule: "no-dangling-refs",
          entityId: "REQ-003",
          description: "Dangling reference",
        },
      ],
      count: 1,
      diagnostics: [],
    },
    briefing: {
      tldr: "v2 tldr",
      promptBlock: "v2 prompt",
      citations: [],
      changeNarrative: ["Added REQ-001: Test requirement", "Modified REQ-002"],
      constraints: undefined,
      regressionRisks: undefined,
      missingEvidence: undefined,
    },
    contentHash: "hash-v2",
    ...overrides,
  };
}

describe("buildTuiBriefViewModel", () => {
  it("builds a deterministic view model from a schema 1.0 envelope", () => {
    const envelope = makeV1();
    const vm = buildTuiBriefViewModel(envelope);

    expect(vm.briefId).toBe("brief-v1");
    expect(vm.schemaVersion).toBe("1.0");
    expect(vm.branch).toBe("main");
    expect(vm.type).toBe("success");
    expect(vm.unread).toBe(true);
    expect(vm.contentHash).toBe("hash-v1");

    // Title from summary (v1 has no changeNarrative)
    expect(vm.title).toBe("test summary v1");

    // What changed — falls back to summary
    expect(vm.whatChanged).toEqual(["test summary v1"]);

    // Why it matters — defaults when promptBlock is not allowed as UI copy
    expect(vm.whyItMatters).toBe(
      "This update changes how the project knowledge should be interpreted and applied.",
    );

    // Counts
    expect(vm.counts).toEqual({
      schemaVersion: "1.0",
      requirementsAdded: 2,
      relationshipsAdded: 3,
      entitiesDeleted: 1,
    });

    // Knowledge impact
    expect(vm.knowledgeImpact.citations).toHaveLength(1);
    expect(vm.knowledgeImpact.citations[0]?.id).toBe("CIT-001");
    expect(vm.knowledgeImpact.constraints).toHaveLength(1);
    expect(vm.knowledgeImpact.regressionRisks).toHaveLength(1);

    // Interpretation note
    expect(vm.interpretationNote.validationCount).toBe(0);
    expect(vm.interpretationNote.missingEvidence).toHaveLength(1);
  });

  it("builds a deterministic view model from a schema 2.0 envelope", () => {
    const envelope = makeV2();
    const vm = buildTuiBriefViewModel(envelope);

    expect(vm.briefId).toBe("brief-v2");
    expect(vm.schemaVersion).toBe("2.0");
    expect(vm.branch).toBe("develop");
    expect(vm.type).toBe("warning");
    expect(vm.unread).toBe(false);

    // Title from first changeNarrative line
    expect(vm.title).toBe("Added REQ-001: Test requirement");

    // What changed — from changeNarrative (first 2)
    expect(vm.whatChanged).toEqual([
      "Added REQ-001: Test requirement",
      "Modified REQ-002",
    ]);

    // Counts
    expect(vm.counts).toEqual({
      schemaVersion: "2.0",
      entitiesAdded: 4,
      entitiesModified: 5,
      entitiesRemoved: 2,
      relationshipsChanged: 6,
    });

    // Knowledge impact — no citations, constraints, risks in this envelope
    expect(vm.knowledgeImpact.citations).toHaveLength(0);
    expect(vm.knowledgeImpact.constraints).toHaveLength(0);
    expect(vm.knowledgeImpact.regressionRisks).toHaveLength(0);

    // Interpretation note — has 1 validation issue
    expect(vm.interpretationNote.validationCount).toBe(1);
    expect(vm.interpretationNote.missingEvidence).toHaveLength(0);
  });

  it("falls back to entity summary when changeNarrative is empty for v2", () => {
    const envelope = makeV2({
      briefing: {
        tldr: "tldr fallback",
        promptBlock: "",
        citations: [],
        changeNarrative: [],
      },
      summary: "summary fallback",
    });
    const vm = buildTuiBriefViewModel(envelope);

    // Title falls back to summary
    expect(vm.title).toBe("summary fallback");
    // What changed falls back to modified entity, then added entity
    expect(vm.whatChanged).toEqual(["Modified REQ-002: Modified req"]);
  });

  it("falls back to summary when no entities exist for v2", () => {
    const envelope = makeV2({
      briefing: {
        tldr: "tldr fallback",
        promptBlock: "",
        citations: [],
        changeNarrative: [],
      },
      changes: {
        entities: { added: [], modified: [], removed: [] },
        relationships: { changed: 0 },
      },
      summary: "summary fallback",
    });
    const vm = buildTuiBriefViewModel(envelope);

    expect(vm.whatChanged).toEqual(["summary fallback"]);
  });

  it("does not regenerate data — output is deterministic", () => {
    const envelope = makeV1();
    const vm1 = buildTuiBriefViewModel(envelope);
    const vm2 = buildTuiBriefViewModel(envelope);

    expect(vm1).toEqual(vm2);
  });

  it("cross-surface parity: toast whyItMatters matches view model whyItMatters", () => {
    const deliveryReasons: DeliveryReasons = {
      version: 1,
      items: [
        {
          kind: "entity_modified",
          text: "Updated requirement REQ-100",
          entityIds: ["REQ-100"],
        },
        {
          kind: "relationship_changed",
          text: "Updated 3 relationships",
          entityIds: [],
        },
      ],
      toast: {
        title: "Kibi Knowledge Update",
        summary: "Updated requirement REQ-100, Updated 3 relationships",
        whyItMatters: "Requirements and facts were updated.",
      },
    };

    const briefing = {
      tldr: "tldr",
      promptBlock: "prompt",
      citations: [],
    } as IdleBriefEnvelope["briefing"] & { deliveryReasons?: DeliveryReasons };
    const envelope = makeV1({ briefing });
    (envelope.briefing as typeof envelope.briefing & { deliveryReasons?: DeliveryReasons }).deliveryReasons =
      deliveryReasons;

    const vm = buildTuiBriefViewModel(envelope);

    // Toast whyItMatters matches view model whyItMatters (same primary text)
    expect(vm.whyItMatters).toBe(deliveryReasons.toast.whyItMatters);
    expect(vm.whyItMatters).toBe("Requirements and facts were updated.");

    // What changed items match deliveryReasons item text
    expect(vm.whatChanged).toEqual([
      "Updated requirement REQ-100",
      "Updated 3 relationships",
    ]);

    // Title uses toast summary when deliveryReasons present
    expect(vm.title).toBe(deliveryReasons.toast.summary);
  });

  it("builds view model from legacy v1 envelope without deliveryReasons", () => {
    const envelope = makeV1({
      briefing: {
        tldr: "Legacy tldr",
        promptBlock: "Legacy prompt",
        citations: [],
      },
    });

    const vm = buildTuiBriefViewModel(envelope);

    expect(vm.title).toBe("test summary v1");
    expect(vm.whyItMatters).toBe(
      "This update changes how the project knowledge should be interpreted and applied.",
    );
    expect(vm.whatChanged).toEqual(["test summary v1"]);
  });

  it("regression: exact generic Why it matters string absent from view model when deliveryReasons exists", () => {
    const deliveryReasons: DeliveryReasons = {
      version: 1,
      items: [
        {
          kind: "entity_added",
          text: "Added requirement REQ-050",
          entityIds: ["REQ-050"],
        },
      ],
      toast: {
        title: "Kibi Knowledge Update",
        summary: "Added requirement REQ-050",
        whyItMatters: "Entities were updated.",
      },
    };

    const briefing = {
      tldr: "tldr",
      promptBlock: "should not appear",
      citations: [],
    } as IdleBriefEnvelope["briefing"] & { deliveryReasons?: DeliveryReasons };

    const envelope = makeV1({ briefing });
    (envelope.briefing as typeof envelope.briefing & { deliveryReasons?: DeliveryReasons }).deliveryReasons =
      deliveryReasons;

    const vm = buildTuiBriefViewModel(envelope);

    expect(vm.whyItMatters).not.toBe(
      "This update changes how the project knowledge should be interpreted and applied.",
    );
    expect(vm.whyItMatters).toBe("Entities were updated.");
    expect(vm.title).toBe("Added requirement REQ-050");
    expect(vm.whatChanged).toEqual(["Added requirement REQ-050"]);
  });

});

describe("buildTuiBriefSummary", () => {
  it("produces full summary text from a schema 1.0 envelope", () => {
    const envelope: IdleBriefEnvelope = makeV1();
    const summary = buildTuiBriefSummary(envelope);

    expect(summary).toContain("## What changed");
    expect(summary).toContain("## Why it matters");
    expect(summary).toContain(
      "This update changes how the project knowledge should be interpreted and applied.",
    );
    expect(summary).toContain("## Project knowledge impact");
    expect(summary).toContain("**CIT-001**");
    expect(summary).toContain("Must do X");
    expect(summary).toContain("Risk Y");
    expect(summary).toContain("## Interpretation note");
    expect(summary).toContain("Evidence Z");
  });

  it("produces full summary text from a schema 2.0 envelope", () => {
    const envelope: IdleBriefEnvelope = makeV2();
    const summary = buildTuiBriefSummary(envelope);

    expect(summary).toContain("## What changed");
    expect(summary).toContain("Added REQ-001: Test requirement");
    expect(summary).toContain("Modified REQ-002");
    expect(summary).toContain("## Why it matters");
    expect(summary).toContain(
      "This update changes how the project knowledge should be interpreted and applied.",
    );
    expect(summary).toContain("## Interpretation note");
    expect(summary).toContain("1 issue(s)");
  });

  it("omits knowledge impact section when no citations/risks/constraints", () => {
    const envelope: IdleBriefEnvelope = makeV1({
      briefing: {
        tldr: "tldr",
        promptBlock: "prompt",
        citations: [],
        constraints: undefined,
        regressionRisks: undefined,
        missingEvidence: undefined,
      },
      validation: { violations: [], count: 0, diagnostics: [] },
    });
    const summary = buildTuiBriefSummary(envelope);

    expect(summary).not.toContain("## Project knowledge impact");
    expect(summary).not.toContain("## Interpretation note");
  });

  it("trims trailing blank lines", () => {
    const envelope: IdleBriefEnvelope = makeV1({
      briefing: {
        tldr: "tldr",
        promptBlock: "prompt",
        citations: [],
      },
    });
    const summary = buildTuiBriefSummary(envelope);

    expect(summary.endsWith("\n")).toBe(false);
  });

  it("uses default why-it-matters when promptBlock is empty", () => {
    const envelope: IdleBriefEnvelope = makeV1({
      briefing: {
        tldr: "tldr",
        promptBlock: "",
        citations: [],
      },
    });
    const summary = buildTuiBriefSummary(envelope);

    expect(summary).toContain(
      "This update changes how the project knowledge should be interpreted and applied.",
    );
  });

  it("prefers deliveryReasons for full brief sections", () => {
    const deliveryReasons: DeliveryReasons = {
      version: 1,
      items: [
        {
          kind: "entity_added",
          text: "Added requirement REQ-009",
          entityIds: ["REQ-009"],
        },
      ],
      toast: {
        title: "Kibi Knowledge Update",
        summary: "Added requirement REQ-009",
        whyItMatters: "Entities were updated.",
      },
    };

    const briefing = {
      tldr: "tldr",
      promptBlock: "prompt",
      citations: [],
    } as IdleBriefEnvelope["briefing"] & { deliveryReasons?: DeliveryReasons };
    const envelope = makeV1({ briefing });
    (envelope.briefing as typeof envelope.briefing & { deliveryReasons?: DeliveryReasons }).deliveryReasons =
      deliveryReasons;
    const summary = buildTuiBriefSummary(envelope);

    expect(summary).toContain("## What changed");
    expect(summary).toContain("- Added requirement REQ-009");
    expect(summary).toContain("## Why it matters");
    expect(summary).toContain("Entities were updated.");
    expect(summary).not.toContain(
      "This update changes how the project knowledge should be interpreted and applied.",
    );
  });
});
