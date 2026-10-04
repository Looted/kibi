import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { extractFromMarkdown } from "../../../src/extractors/markdown.js";
import {
  applyOriginBackfill,
  planOriginBackfill,
  withBackfilledOrigin,
} from "../../../src/operations/migration/origin-backfill.js";

const RECORDED_AT = "2026-10-01T12:00:00.000Z";

function write(root: string, relative: string, content: string): string {
  const absolute = path.join(root, relative);
  mkdirSync(path.dirname(absolute), { recursive: true });
  writeFileSync(absolute, content, "utf8");
  return absolute;
}

describe("schema 6 origin backfill", () => {
  let root: string;

  beforeEach(() => {
    root = mkdtempSync(path.join(os.tmpdir(), "kibi-origin-backfill-"));
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  test("stamps entities without origin and leaves the rest of the file unchanged", () => {
    const requirement = write(
      root,
      ".kb/requirements/REQ-one.md",
      "---\nid: REQ-one\ntitle: One\ntype: req\nstatus: open\n# authored comment\ntags: [a, b]\n---\n\nBody text.\n",
    );
    const fact = write(
      root,
      ".kb/facts/FACT-one.md",
      "---\r\nid: FACT-one\r\ntitle: One\r\nstatus: active\r\n---\r\n\r\nFact body.\r\n",
    );

    const result = applyOriginBackfill(root, RECORDED_AT);

    expect(result.written.map((target) => target.id).sort()).toEqual([
      "FACT-one",
      "REQ-one",
    ]);
    expect(readFileSync(requirement, "utf8")).toBe(
      "---\nid: REQ-one\ntitle: One\ntype: req\nstatus: open\n# authored comment\ntags: [a, b]\norigin:\n  kind: migration\n  ref: kibi migrate v5->v6\n  recorded_at: '2026-10-01T12:00:00.000Z'\n---\n\nBody text.\n",
    );
    expect(readFileSync(fact, "utf8")).toContain(
      "status: active\r\norigin:\r\n  kind: migration\r\n",
    );
    expect(extractFromMarkdown(requirement).entity.origin).toEqual({
      kind: "migration",
      ref: "kibi migrate v5->v6",
      recorded_at: RECORDED_AT,
    });
  });

  test("never overwrites an existing origin and is idempotent", () => {
    const human = write(
      root,
      ".kb/requirements/REQ-human.md",
      "---\nid: REQ-human\ntitle: Human\nstatus: open\norigin:\n  kind: human\n  ref: ticket-12\n---\n\nBody.\n",
    );
    write(
      root,
      ".kb/requirements/REQ-legacy.md",
      "---\nid: REQ-legacy\ntitle: Legacy\nstatus: open\n---\n\nBody.\n",
    );
    const humanBefore = readFileSync(human, "utf8");

    expect(planOriginBackfill(root).targets.map((target) => target.id)).toEqual(
      ["REQ-legacy"],
    );
    const first = applyOriginBackfill(root, RECORDED_AT);
    const legacyOnce = readFileSync(
      path.join(root, ".kb/requirements/REQ-legacy.md"),
      "utf8",
    );
    const second = applyOriginBackfill(root, "2027-01-01T00:00:00.000Z");

    expect(first.written).toHaveLength(1);
    expect(second.written).toHaveLength(0);
    expect(second.previouslyStamped).toBe(1);
    expect(readFileSync(human, "utf8")).toBe(humanBefore);
    expect(
      readFileSync(path.join(root, ".kb/requirements/REQ-legacy.md"), "utf8"),
    ).toBe(legacyOnce);
    expect(planOriginBackfill(root).targets).toEqual([]);
  });

  test("skips documents it cannot stamp without guessing", () => {
    write(root, ".kb/requirements/README.md", "# Lane readme\n");
    write(
      root,
      ".kb/requirements/REQ-open.md",
      "---\nid: REQ-open\ntitle: x\n",
    );
    write(
      root,
      ".kb/requirements/REQ-broken.md",
      "---\nid: [unclosed\ntitle: x\n---\n\nBody.\n",
    );

    const plan = planOriginBackfill(root);

    expect(plan.targets).toEqual([]);
    expect(plan.skipped.map((skip) => skip.path).sort()).toEqual([
      ".kb/requirements/REQ-broken.md",
      ".kb/requirements/REQ-open.md",
    ]);
  });

  test("reports, and does not write, a document the appended origin would not read back from", () => {
    // A flow-mapping frontmatter cannot take a block key after it.
    const content =
      "---\n{id: REQ-flow, title: Flow, status: open}\n---\n\nBody.\n";
    const file = write(root, ".kb/requirements/REQ-flow.md", content);

    expect(
      withBackfilledOrigin(content, {
        kind: "migration",
        recorded_at: RECORDED_AT,
      }),
    ).toBeNull();
    const result = applyOriginBackfill(root, RECORDED_AT);

    expect(result.written).toEqual([]);
    expect(result.skipped).toEqual([
      {
        path: ".kb/requirements/REQ-flow.md",
        reason: "origin could not be appended without changing other fields",
      },
    ]);
    expect(readFileSync(file, "utf8")).toBe(content);
  });
});
