import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import * as discovery from "../../../src/commands/sync/discovery.js";
import * as extraction from "../../../src/commands/sync/extraction.js";
import { collectSourceRelationshipParityViolations } from "../../../src/public/operations/source-relationship-parity.js";
import type { PrologPort } from "../../../src/public/operations/runtime-types.js";
import {
  createGitWorkspace,
  isolateKibiEnv,
  removeTempDir,
} from "../../helpers/in-process-workspace.js";

const spies: Array<{ mockRestore: () => void }> = [];
const restores: Array<() => void> = [];
const roots: string[] = [];

afterEach(() => {
  for (const spy of spies.splice(0)) spy.mockRestore();
  for (const restore of restores.splice(0)) restore();
  for (const root of roots.splice(0)) removeTempDir(root);
});

function prolog(rows: (goal: string) => string): PrologPort {
  return {
    query: async (goal: string) => ({
      success: true,
      bindings: { Rows: rows(goal) },
    }),
    nextSolution: async () => null,
    save: async () => ({ success: true, bindings: {} }),
  };
}

function workspace(): string {
  restores.push(isolateKibiEnv());
  const root = createGitWorkspace();
  roots.push(root);
  return root;
}

describe("source discovery failures", () => {
  test("name the receipt repair that applies", async () => {
    const root = workspace();
    const suggestions: string[] = [];
    for (const message of [
      "Pending source hash drift for .kb/a.md",
      "Pending source is missing: .kb/b.md",
    ]) {
      const spy = spyOn(discovery, "discoverSourceFiles").mockRejectedValue(
        new Error(message),
      );
      const [violation] = await collectSourceRelationshipParityViolations(
        root,
        prolog(() => "[]"),
      );
      spy.mockRestore();
      suggestions.push(String(violation?.suggestion));
    }
    expect(suggestions).toStrictEqual([
      "A pending-source receipt no longer matches its untracked file. Rewrite that entity with kb_upsert (its current title and status are enough) so the receipt is republished against the file's current bytes, or 'git add' the file to retire the receipt; then rerun kb_check. Do not ignore missing authored inputs.",
      "A pending-source receipt binds an untracked file that no longer exists. If the file was deleted on purpose, run 'kibi branch recover --apply' to rebuild the branch KB from the sources that remain; otherwise restore the file (or rewrite the entity with kb_upsert); then rerun kb_check.",
    ]);
  });
});

describe("untracked endpoints", () => {
  test("a missing relationship names the untracked file that declares it", async () => {
    const root = workspace();
    mkdirSync(path.join(root, ".kb", "requirements"), { recursive: true });
    writeFileSync(
      path.join(root, ".kb", "requirements", "REQ-1.md"),
      "---\nid: REQ-1\ntitle: One\n---\n",
    );
    spies.push(
      spyOn(discovery, "discoverSourceFiles").mockResolvedValue({
        markdownFiles: [],
        manifestFiles: [],
        pendingReceipts: [],
      } as never),
    );
    const entity = (id: string) => ({
      id,
      type: "req",
      title: id,
      status: "open",
      created_at: "2026-09-05T00:00:00Z",
      updated_at: "2026-09-05T00:00:00Z",
      source: `docs/${id}.md`,
    });
    spies.push(
      spyOn(extraction, "processExtractions").mockResolvedValue({
        results: [
          {
            entity: entity("REQ-1"),
            relationships: [{ type: "depends_on", from: "REQ-1", to: "REQ-2" }],
          },
          {
            entity: entity("REQ-3"),
            relationships: [{ type: "depends_on", from: "REQ-3", to: "REQ-4" }],
          },
        ],
        failedCacheKeys: new Set(),
        errors: [],
        failures: [],
      } as never),
    );
    const violations = await collectSourceRelationshipParityViolations(
      root,
      prolog((goal) =>
        goal.includes("kb_relationship(relates_to,")
          ? "[['REQ-8','REQ-9','docs/REQ-8.md']]"
          : "[]",
      ),
    );
    const byFrom = Object.fromEntries(
      violations.map((violation) => [violation.entityId, violation]),
    );
    expect(byFrom["REQ-1"]?.suggestion).toBe(
      "REQ-1 is declared in .kb/requirements/REQ-1.md, which Git does not track and no pending-source receipt covers, so sync never compiles it. Run 'git add .kb/requirements/REQ-1.md' (staging is enough) or rewrite the entity with kb_upsert, then run kibi sync and rerun kb_check.",
    );
    expect(byFrom["REQ-1"]?.evidence).toStrictEqual({
      direction: "authored_to_compiled",
      relationship: { type: "depends_on", from: "REQ-1", to: "REQ-2" },
      untrackedSources: [
        { entityId: "REQ-1", file: ".kb/requirements/REQ-1.md" },
      ],
    });
    expect(byFrom["REQ-3"]?.suggestion).toStartWith("Run kibi sync");
    expect(byFrom["REQ-8"]?.evidence).toStrictEqual({
      direction: "compiled_to_authored",
      relationship: { type: "relates_to", from: "REQ-8", to: "REQ-9" },
    });
  });
});
