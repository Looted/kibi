/*
 * Kibi — repo-local, per-branch, queryable long-term memory for software projects
 * Copyright (C) 2026 Piotr Franczyk
 */

// At level test the commit gate reports, and does not refuse, a requirement
// the commit adds below its floor; at level remember the floor is not run.
import { describe, expect, test } from "bun:test";
import type { Violation } from "../../src/public/check-types.js";
import {
  addedRequirementIds,
  partitionStagedFloorFindings,
  stagedRequirementProofRules,
} from "../../src/traceability/staged-evidence-floor.js";
import { requirementDoc } from "./workspace.js";

const finding = (rule: string, entityId: string): Violation => ({
  rule,
  entityId,
  description: `${entityId} finding`,
});

describe("staged evidence floor by Kibi level", () => {
  test("the requirements a commit adds are the current ones with no base version", () => {
    const base: Record<string, string> = {
      ".kb/requirements/REQ-old.md": requirementDoc("REQ-old"),
    };
    const added = addedRequirementIds(
      [
        {
          path: ".kb/requirements/REQ-old.md",
          content: requirementDoc("REQ-old", { required_evidence: "tested" }),
        },
        {
          path: ".kb/requirements/REQ-new.md",
          content: requirementDoc("REQ-new", { required_evidence: "tested" }),
        },
        {
          path: ".kb/requirements/REQ-gone.md",
          content: requirementDoc("REQ-gone", { status: "retired" }),
        },
        { path: ".kb/requirements/REQ-deleted.md" },
        {
          path: ".kb/scenarios/SCEN-new.md",
          content:
            "---\nid: SCEN-new\ntitle: s\ntype: scenario\nstatus: active\n---\n\ns\n",
        },
        { path: ".kb/requirements/notes.md", content: "no front matter" },
      ],
      (file) => base[file] ?? null,
    );
    expect([...added]).toEqual(["REQ-new"]);
  });

  test("a floor finding on an added requirement is reported; every other finding blocks", () => {
    const findings = [
      finding("evidence-floor", "REQ-new"),
      finding("evidence-floor", "REQ-old"),
      finding("agent-requirement-unapproved-implemented", "REQ-new"),
    ];
    expect(
      partitionStagedFloorFindings(findings, new Set(["REQ-new"])),
    ).toEqual({
      blocking: [findings[1], findings[2]],
      reported: [findings[0]],
    });
    expect(partitionStagedFloorFindings(findings, new Set())).toEqual({
      blocking: findings,
      reported: [],
    });
  });

  test("the floor runs at test only; the unapproved-requirement rule at every level", () => {
    expect([...stagedRequirementProofRules("test")]).toEqual([
      "evidence-floor",
      "agent-requirement-unapproved-implemented",
    ]);
    expect([...stagedRequirementProofRules("remember")]).toEqual([
      "agent-requirement-unapproved-implemented",
    ]);
  });
});
