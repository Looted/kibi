import { describe, expect, it } from "bun:test";
import {
  buildDeliveryReasons,
  renderFullBriefReasons,
  renderToastSummary,
} from "../src/brief-delivery-reasons";

describe("brief-delivery-reasons", () => {
  it("builds mixed add modify remove reasons and a non-generic toast", () => {
    const reasons = buildDeliveryReasons({
      entitiesAdded: ["FACT-002"],
      entitiesModified: ["REQ-001"],
      entitiesRemoved: ["TEST-003"],
      relationshipsChanged: 0,
      validationCount: 0,
    });

    expect(reasons).toBeDefined();
    expect(reasons?.items.map((item) => item.kind)).toEqual([
      "entity_modified",
      "entity_added",
      "entity_removed",
    ]);
    expect(reasons?.items.map((item) => item.text)).toEqual([
      "Updated requirement REQ-001",
      "Added fact FACT-002",
      "Removed test TEST-003",
    ]);
    expect(reasons?.toast.summary).toBe("Updated requirement REQ-001, Added fact FACT-002");
    expect(reasons?.toast.whyItMatters).not.toBe(
      "This update changes how the project knowledge should be interpreted and applied.",
    );
  });

  it("builds a relationship-only reason item", () => {
    const reasons = buildDeliveryReasons({
      entitiesAdded: [],
      entitiesModified: [],
      entitiesRemoved: [],
      relationshipsChanged: 2,
      validationCount: 0,
    });

    expect(reasons?.items).toEqual([
      {
        kind: "relationship_changed",
        text: "Updated 2 relationships",
        entityIds: [],
      },
    ]);
  });

  it("puts validation issues before entity reasons", () => {
    const reasons = buildDeliveryReasons({
      entitiesAdded: ["REQ-002"],
      entitiesModified: [],
      entitiesRemoved: [],
      relationshipsChanged: 0,
      validationCount: 2,
    });

    expect(reasons?.items.map((item) => item.kind)).toEqual([
      "validation_issue",
      "entity_added",
    ]);
  });

  it("puts conflict reasons first", () => {
    const reasons = buildDeliveryReasons({
      entitiesAdded: ["REQ-002"],
      entitiesModified: [],
      entitiesRemoved: [],
      relationshipsChanged: 0,
      validationCount: 1,
      conflictReasons: ["REQ-002 conflicts with existing requirement"],
    });

    expect(reasons?.items[0]).toMatchObject({
      kind: "conflict_detected",
      text: "REQ-002 conflicts with existing requirement",
    });
  });

  it("returns undefined when all inputs are empty", () => {
    expect(
      buildDeliveryReasons({
        entitiesAdded: [],
        entitiesModified: [],
        entitiesRemoved: [],
        relationshipsChanged: 0,
        validationCount: 0,
      }),
    ).toBeUndefined();
  });

  it("renders full brief markdown with both sections", () => {
    const reasons = buildDeliveryReasons({
      entitiesAdded: ["REQ-001"],
      entitiesModified: [],
      entitiesRemoved: [],
      relationshipsChanged: 0,
      validationCount: 0,
    });

    expect(reasons).toBeDefined();
    if (!reasons) return;
    expect(renderFullBriefReasons(reasons)).toContain("## What changed");
    expect(renderFullBriefReasons(reasons)).toContain("## Why it matters");
  });

  it("never uses the generic fallback whyItMatters string", () => {
    const reasons = buildDeliveryReasons({
      entitiesAdded: ["REQ-001"],
      entitiesModified: [],
      entitiesRemoved: [],
      relationshipsChanged: 0,
      validationCount: 0,
    });

    expect(reasons).toBeDefined();
    if (!reasons) return;
    expect(renderToastSummary(reasons).whyItMatters).not.toBe(
      "This update changes how the project knowledge should be interpreted and applied.",
    );
  });

  it("rejects generic operational-only toast summaries", () => {
    const genericReasons = {
      version: 1 as const,
      items: [
        {
          kind: "entity_modified" as const,
          text: "Modified fact boulder.json: boulder.json",
          entityIds: ["FACT-boulder.json"],
        },
      ],
      toast: {
        title: "Kibi Knowledge Update",
        summary: "Modified fact boulder.json: boulder.json",
        whyItMatters: "This update changes how the project knowledge should be interpreted and applied.",
      },
    };

    expect(renderToastSummary(genericReasons).summary).not.toContain("boulder.json");
  });
});
