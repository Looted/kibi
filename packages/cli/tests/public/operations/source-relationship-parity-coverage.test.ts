// implements REQ-014
import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import * as discovery from "../../../src/commands/sync/discovery.js";
import {
  collectSourceRelationshipParityViolations,
  compareRelationshipParity,
  parseCompiledRelationshipRows,
} from "../../../src/public/operations/source-relationship-parity.js";
import { appendRelationship } from "../../../src/relationships/shards.js";
import {
  createGitWorkspace,
  git,
  removeTempDir,
} from "../../helpers/in-process-workspace.js";

const workspaces: string[] = [];

afterEach(() => {
  while (workspaces.length > 0) {
    const dir = workspaces.pop();
    if (dir) removeTempDir(dir);
  }
});

describe("source relationship parity", () => {
  test("compareRelationshipParity reports authored and compiled gaps and skips runtime edges", () => {
    const violations = compareRelationshipParity(
      [
        { type: "verified_by", from: "REQ-1", to: "TEST-1", source: "docs/a.md" },
        { type: "specified_by", from: "REQ-1", to: "SCEN-1" },
      ],
      [
        { type: "specified_by", from: "REQ-1", to: "SCEN-1" },
        { type: "implements", from: "SYM-1", to: "REQ-1" },
        {
          type: "relates_to",
          from: "REQ-1",
          to: "REQ-2",
          ownership: "runtime",
          source: "mcp://kibi/upsert",
        },
      ],
    );
    expect(violations.map((row) => row.description).join(" ")).toContain(
      "missing from the compiled KB",
    );
    expect(violations.map((row) => row.description).join(" ")).toContain(
      "no authored Markdown",
    );
    expect(violations.some((row) => row.entityId === "REQ-1" && row.source === "docs/a.md")).toBe(
      true,
    );
    expect(violations.every((row) => !row.description.includes("REQ-2"))).toBe(true);
  });

  test("parseCompiledRelationshipRows marks protocol sources as runtime", () => {
    const rows = parseCompiledRelationshipRows(
      "verified_by",
      "[['REQ-1','TEST-1','mcp://kibi/upsert'],['REQ-2','TEST-2','docs/a.md'],['','TEST-3','']]",
    );
    expect(rows).toEqual([
      {
        type: "verified_by",
        from: "REQ-1",
        to: "TEST-1",
        source: "mcp://kibi/upsert",
        ownership: "runtime",
      },
      {
        type: "verified_by",
        from: "REQ-2",
        to: "TEST-2",
        source: "docs/a.md",
        ownership: "authored",
      },
    ]);
  });

  test("collectSourceRelationshipParityViolations returns empty outside git and compiled mismatches inside git", async () => {
    expect(
      await collectSourceRelationshipParityViolations("/tmp/not-a-git-workspace", {
        query: async () => ({ success: true, bindings: { Rows: "[]" } }),
        nextSolution: async () => null,
        save: async () => ({ success: true, bindings: {} }),
      }),
    ).toEqual([]);

    const root = createGitWorkspace();
    workspaces.push(root);
    mkdirSync(path.join(root, ".kb", "requirements"), { recursive: true });
    writeFileSync(
      path.join(root, ".kb", "requirements", "REQ-1.md"),
      [
        "---",
        "id: REQ-1",
        "type: req",
        "title: One",
        "status: open",
        "relationships:",
        "  - type: verified_by",
        "    target: TEST-1",
        "---",
        "",
        "body",
        "",
      ].join("\n"),
    );
    git(root, "add .kb/requirements/REQ-1.md");
    git(root, "commit --no-verify -m req");
    appendRelationship(path.join(root, ".kb"), {
      type: "verified_by",
      from: "REQ-1",
      to: "TEST-1",
      created_at: "2026-09-05T00:00:00Z",
      created_by: "test",
      source: "test://shard",
    });
    const violations = await collectSourceRelationshipParityViolations(root, {
      query: async (goal) => {
        if (String(goal).includes("kb_relationship(verified_by")) {
          return { success: true, bindings: { Rows: "[]" } };
        }
        return { success: true, bindings: { Rows: "[]" } };
      },
      nextSolution: async () => null,
      save: async () => ({ success: true, bindings: {} }),
    });
    expect(violations.some((row) => row.rule === "source-relationship-parity")).toBe(
      true,
    );

    await expect(
      collectSourceRelationshipParityViolations(root, {
        query: async () => ({ success: false, bindings: {}, error: "down" }),
        nextSolution: async () => null,
        save: async () => ({ success: true, bindings: {} }),
      }),
    ).rejects.toThrow(/Unable to inspect compiled/);
  });

  test("collectSourceRelationshipParityViolations maps discovery and extraction failures", async () => {
    const root = createGitWorkspace();
    workspaces.push(root);
    const spy = spyOn(discovery, "discoverSourceFiles").mockRejectedValue(
      new Error("pending receipt blocked"),
    );
    try {
      const discoveryFailures = await collectSourceRelationshipParityViolations(
        root,
        {
          query: async () => ({ success: true, bindings: { Rows: "[]" } }),
          nextSolution: async () => null,
          save: async () => ({ success: true, bindings: {} }),
        },
      );
      expect(discoveryFailures[0]?.entityId).toBe("source-discovery");
      expect(discoveryFailures[0]?.description).toContain("pending receipt blocked");
    } finally {
      spy.mockRestore();
    }

    mkdirSync(path.join(root, ".kb", "requirements"), { recursive: true });
    writeFileSync(
      path.join(root, ".kb", "requirements", "BROKEN.md"),
      ["---", "id: [unterminated", "---", ""].join("\n"),
    );
    git(root, "add .kb/requirements/BROKEN.md");
    git(root, "commit --no-verify -m broken");
    const extractionFailures = await collectSourceRelationshipParityViolations(
      root,
      {
        query: async () => ({ success: true, bindings: { Rows: "[]" } }),
        nextSolution: async () => null,
        save: async () => ({ success: true, bindings: {} }),
      },
    );
    expect(
      extractionFailures.some((row) =>
        row.description.includes("could not inspect source"),
      ),
    ).toBe(true);
  });
});
