import { afterEach, describe, expect, test } from "bun:test";
import {
  type ConsumerWorkspace,
  type Json,
  createConsumerWorkspace,
  doc,
} from "./workspace.js";

/**
 * Consumer view of closed requirements in `kibi search`: a closed
 * requirement ranks and governs below a current one that matches as well,
 * and a replacement is pulled in only for a predecessor that matched about as
 * well as the best candidate.
 */

let workspace: ConsumerWorkspace | undefined;

afterEach(() => {
  workspace?.cleanup();
  workspace = undefined;
});

type Ranked = {
  entity: { id: string };
  reasons: string[];
  score: number;
  folded?: string[];
};
type Governing = { id: string; via?: string };
type NotGoverning = { id: string; supersededBy?: string };

function requirement(
  ws: ConsumerWorkspace,
  id: string,
  title: string,
  status: string,
  links = "",
): void {
  ws.write(
    `.kb/requirements/${id}.md`,
    doc(
      `
id: ${id}
title: ${title}
type: req
status: ${status}
priority: must
${links}`,
      `${title}.`,
    ),
  );
}

function search(ws: ConsumerWorkspace, query: string, fields?: "full") {
  const data = ws.json(["search"], { query, ...(fields ? { fields } : {}) })
    .data as Json;
  const answer = data.answer as Json;
  return {
    results: data.results as Ranked[],
    governing: answer.governing as Governing[],
    notGoverning: answer.notGoverning as NotGoverning[],
  };
}

describe("closed requirements in kibi search", () => {
  test("a closed requirement ranks and governs below a current one that matches as well", () => {
    const ws = createConsumerWorkspace("kibi-search-closed-");
    workspace = ws;
    // The same words: only the status tells them apart.
    requirement(ws, "REQ-EXPORT-DONE", "Invoice export writes a CSV", "closed");
    requirement(ws, "REQ-EXPORT-LIVE", "Invoice export writes a CSV", "open");
    // Words every requirement uses would tell none of them apart.
    requirement(ws, "REQ-PAYMENTS", "Payments settle daily", "open");
    requirement(ws, "REQ-REFUNDS", "Refunds reach the card", "open");
    requirement(ws, "REQ-LOGIN", "Staff sign in with a passkey", "open");
    ws.sync();

    const { results, governing } = search(ws, "invoice export csv");
    // Near-identical decisions share one card: the current one leads it and
    // the closed one is listed on it. The answer quotes the card's
    // statement, so the summary row is its identity; the full row keeps the
    // folded decision.
    expect(results[0]?.entity.id).toBe("REQ-EXPORT-LIVE");
    expect(search(ws, "invoice export csv", "full").results[0]?.folded).toEqual(
      ["REQ-EXPORT-DONE"],
    );
    expect(results.map((row) => row.entity.id)).not.toContain(
      "REQ-EXPORT-DONE",
    );
    // Closed is not retired: the requirement still governs, after the
    // current one.
    expect(governing.map((req) => req.id)).toEqual([
      "REQ-EXPORT-LIVE",
      "REQ-EXPORT-DONE",
    ]);

    // Told apart by their words, the closed one ranks below a current one
    // that matches as well.
    const apart = createConsumerWorkspace("kibi-search-closed-apart-");
    workspace = apart;
    ws.cleanup();
    requirement(
      apart,
      "REQ-EXPORT-DONE",
      "Invoice export writes a CSV",
      "closed",
    );
    requirement(
      apart,
      "REQ-EXPORT-LIVE",
      "Invoice export writes a CSV file per customer",
      "open",
    );
    requirement(apart, "REQ-PAYMENTS", "Payments settle daily", "open");
    requirement(apart, "REQ-LOGIN", "Staff sign in with a passkey", "open");
    apart.sync();
    const ranked = search(apart, "invoice export csv").results;
    const ids = ranked.map((row) => row.entity.id);
    expect(ids.indexOf("REQ-EXPORT-LIVE")).toBeGreaterThanOrEqual(0);
    expect(ids.indexOf("REQ-EXPORT-LIVE")).toBeLessThan(
      ids.indexOf("REQ-EXPORT-DONE"),
    );
    expect(
      ranked.find((row) => row.entity.id === "REQ-EXPORT-DONE")?.reasons,
    ).toContain("closed");
  }, 120_000);

  test("a weak match on a superseded requirement does not pull its replacement into the answer", () => {
    const ws = createConsumerWorkspace("kibi-search-closed-successor-");
    workspace = ws;
    requirement(
      ws,
      "REQ-EXPORT",
      "Invoice export writes one file per customer",
      "open",
    );
    requirement(
      ws,
      "REQ-ARCHIVE-OLD",
      "Invoice archive keeps every document for a year",
      "closed",
    );
    requirement(
      ws,
      "REQ-ARCHIVE-NEW",
      "Stored documents are deleted after ninety days",
      "open",
      "links:\n  - type: supersedes\n    target: REQ-ARCHIVE-OLD\n",
    );
    ws.sync();

    // The old requirement matches, but well below the export requirement;
    // it is listed on the card of the requirement that replaced it.
    const weak = search(ws, "invoice archive every year export file");
    expect(weak.results.map((row) => row.entity.id)).toEqual([
      "REQ-EXPORT",
      "REQ-ARCHIVE-NEW",
    ]);
    expect(weak.results[1]?.folded).toEqual(["REQ-ARCHIVE-OLD"]);
    expect(weak.governing.map((req) => req.id)).toEqual(["REQ-EXPORT"]);
    expect(weak.notGoverning).toEqual([
      expect.objectContaining({
        id: "REQ-ARCHIVE-OLD",
        supersededBy: "REQ-ARCHIVE-NEW",
      }),
    ]);

    const strong = search(ws, "invoice archive keeps every document");
    expect(strong.governing).toContainEqual(
      expect.objectContaining({
        id: "REQ-ARCHIVE-NEW",
        via: "supersedes REQ-ARCHIVE-OLD",
      }),
    );
    expect(strong.notGoverning).toContainEqual(
      expect.objectContaining({
        id: "REQ-ARCHIVE-OLD",
        supersededBy: "REQ-ARCHIVE-NEW",
      }),
    );
  }, 120_000);
});
