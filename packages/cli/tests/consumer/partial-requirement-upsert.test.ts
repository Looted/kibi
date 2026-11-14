import { afterEach, describe, expect, test } from "bun:test";
import {
  type ConsumerWorkspace,
  type Json,
  adviseProse,
  checkViolations,
  createConsumerWorkspace,
  doc,
  semanticFrontMatter,
} from "./workspace.js";

/**
 * Consumer view of a partial requirement update: an agent renames a
 * requirement or changes its status through `kibi upsert` with only those
 * fields. The proposition ledger the authored file keeps (its claims and the
 * subjects they are about) must stay in the store too, so `kibi check` gives
 * the same answer before and after the next `kibi sync`.
 */

const PROSE =
  "The clamp function must return a value between the lower and upper bound.";

let workspace: ConsumerWorkspace | undefined;

afterEach(() => {
  workspace?.cleanup();
  workspace = undefined;
});

type Stored = Json & {
  title?: string;
  semantic_inventory?: Array<{ claim_key: string; subjects?: string[] }>;
};

function stored(ws: ConsumerWorkspace): Stored | undefined {
  const result = ws.json(["query"], { type: "req", id: "REQ-clamp-bounds" });
  return ((result.data as Json).entities as Stored[])[0];
}

function subjectFindings(ws: ConsumerWorkspace): string[] {
  return checkViolations(ws, "must-positive-scenario").map(
    (violation) => violation.description,
  );
}

describe("partial requirement upsert through the kibi CLI", () => {
  test("keeps the stored claims and their subjects without a sync", () => {
    const ws = createConsumerWorkspace("kibi-partial-req-upsert-");
    workspace = ws;
    const { contract, propositions } = adviseProse(ws, PROSE);
    const entries = propositions.map((proposition) => ({
      ...proposition,
      status: proposition.status === "modeled" ? "missing" : proposition.status,
      subjects: ["math.clamp"],
    }));
    ws.write(
      ".kb/requirements/REQ-clamp-bounds.md",
      doc(
        `
id: REQ-clamp-bounds
title: Clamp keeps values within bounds
type: req
status: open
priority: must
origin:
  kind: agent
${semanticFrontMatter(PROSE, contract, entries)}`,
        PROSE,
      ),
    );
    ws.stage();
    ws.sync();
    const before = stored(ws);
    expect(before?.semantic_inventory?.[0]?.subjects).toEqual(["math.clamp"]);
    const findingsBefore = subjectFindings(ws);
    // The must requirement owes a success scenario, but it is about a subject.
    expect(findingsBefore).toHaveLength(1);
    expect(findingsBefore[0]).not.toContain("is about no subject");

    for (const properties of [
      { title: "Clamp keeps values within the bounds", status: "open" },
      { title: "Clamp keeps values within the bounds", status: "in_progress" },
    ]) {
      expect(
        ws.json(["upsert"], {
          type: "req",
          id: "REQ-clamp-bounds",
          properties,
        }),
      ).toMatchObject({ status: "success" });
      // No sync: the store alone answers.
      const after = stored(ws);
      expect(after?.title).toBe("Clamp keeps values within the bounds");
      expect(after?.semantic_inventory).toEqual(before?.semantic_inventory);
      expect(after?.semantic_source_hash).toBe(before?.semantic_source_hash);
      expect(subjectFindings(ws)).toEqual(findingsBefore);
    }

    // The next sync reads the same requirement back from the file.
    ws.stage();
    ws.sync();
    expect(stored(ws)?.semantic_inventory).toEqual(before?.semantic_inventory);
    expect(subjectFindings(ws)).toEqual(findingsBefore);
  }, 240_000);
});
