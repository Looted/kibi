import { afterAll, describe, expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import type { ExtractionResult } from "../../src/extractors/markdown.js";
import { floorChangedRequirementIds } from "../../src/traceability/staged-evidence-floor.js";
import {
  STAGED_REQUIREMENT_RULE_SCHEMAS,
  readTreeManifest,
  selectStagedRequirementRules,
  stagedRequirementRules,
} from "../../src/traceability/staged-requirement-rules.js";

const roots: string[] = [];
afterAll(() => {
  for (const root of roots) rmSync(root, { recursive: true, force: true });
});

/** A Git repository committing `files`; answers its tree and readers. */
function repo(files: Record<string, string>) {
  const root = mkdtempSync(path.join(os.tmpdir(), "kibi-staged-req-rules-"));
  roots.push(root);
  const git = (...args: string[]) =>
    execFileSync("git", args, {
      cwd: root,
      maxBuffer: 1 << 26,
      stdio: ["ignore", "pipe", "pipe"],
    });
  git("init", "-q");
  for (const [file, content] of Object.entries(files)) {
    mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    writeFileSync(path.join(root, file), content);
  }
  git("add", "-A");
  const tree = git("write-tree").toString().trim();
  const readGit = (args: readonly string[]) => git(...args);
  const readBlobs = (oids: readonly string[]) =>
    new Map(oids.map((oid) => [oid, git("cat-file", "blob", oid)]));
  return { tree, snapshot: { headTree: tree, readGit, readBlobs } };
}

function manifest(schemaVersion: number, extra: Record<string, unknown> = {}) {
  return JSON.stringify({
    manifestVersion: 1,
    schemaVersion,
    semanticAdvisorBackfill: "not_applicable",
    ...extra,
  });
}

function entity(
  id: string,
  type: string,
  source: string,
  extra: Record<string, unknown> = {},
  relationships: ExtractionResult["relationships"] = [],
): ExtractionResult {
  return {
    entity: {
      id,
      type,
      title: id,
      status: "active",
      created_at: "t",
      updated_at: "t",
      source,
      ...extra,
    },
    relationships,
  } as ExtractionResult;
}

const SUBJECT_BODY =
  "Login is the product action by which a registered user proves their identity to obtain access; it is not registration.";

function subjectDoc(id: string, key: string, body: string): string {
  return `---\nid: ${id}\ntitle: ${key}\ntype: fact\nstatus: active\nfact_kind: subject\nsubject_key: ${key}\n---\n${body}\n`;
}

/** A Prolog port answering the positive-scenario query with `rows`. */
function prolog(rows: unknown[]) {
  const goals: string[] = [];
  return {
    goals,
    async query(goal: string) {
      goals.push(goal);
      return {
        success: true,
        bindings: { JsonString: JSON.stringify({ rows }) },
      };
    },
  };
}

describe("selectStagedRequirementRules", () => {
  test("enables each rule from the KB schema that blocks it", () => {
    expect(selectStagedRequirementRules(undefined)).toStrictEqual([]);
    expect(selectStagedRequirementRules(15)).toStrictEqual([]);
    expect(selectStagedRequirementRules(16)).toStrictEqual([
      "claim-subject-missing",
      "claim-subject-undefined",
      "subject-definition-missing",
    ]);
    expect(selectStagedRequirementRules(17)).toContain(
      "must-positive-scenario",
    );
    expect(selectStagedRequirementRules(17)).not.toContain(
      "related-requirement-unmodeled",
    );
    expect(selectStagedRequirementRules(18)).toStrictEqual(
      Object.keys(STAGED_REQUIREMENT_RULE_SCHEMAS),
    );
  });
});

describe("readTreeManifest", () => {
  test("reads the staged tree's manifest", () => {
    const { snapshot } = repo({ ".kb/manifest.json": manifest(17) });
    expect(readTreeManifest(snapshot)?.schemaVersion).toBe(17);
  });

  test("a tree without a readable manifest has none", () => {
    expect(readTreeManifest(repo({ "a.txt": "a" }).snapshot)).toBeNull();
    expect(
      readTreeManifest(repo({ ".kb/manifest.json": "{" }).snapshot),
    ).toBeNull();
  });
});

describe("stagedRequirementRules", () => {
  test("enables nothing below schema 16", () => {
    const { snapshot } = repo({ ".kb/manifest.json": manifest(15) });
    expect(
      stagedRequirementRules(snapshot, { stagedPaths: [], knowledge: [] }),
    ).toBeNull();
  });

  test("scopes to staged entities and pairs only unmodeled staged claims", () => {
    const { snapshot } = repo({ ".kb/manifest.json": manifest(18) });
    const modeled = entity("REQ-a", "req", ".kb/requirements/REQ-a.md", {
      semantic_inventory: [{ status: "modeled" }],
    });
    const gap = entity("REQ-b", "req", ".kb/requirements/REQ-b.md", {
      semantic_inventory: [{ status: "ontology_gap" }],
    });
    const knowledge = [modeled, gap, entity("REQ-c", "req", "c.md")];
    const onlyModeled = stagedRequirementRules(snapshot, {
      stagedPaths: [".kb/requirements/REQ-a.md"],
      knowledge,
    });
    expect(onlyModeled?.rules).toStrictEqual([
      "claim-subject-missing",
      "claim-subject-undefined",
    ]);
    expect(onlyModeled?.entityIds).toStrictEqual(new Set(["REQ-a"]));
    const withGap = stagedRequirementRules(snapshot, {
      stagedPaths: [".kb/requirements/REQ-a.md", ".kb/requirements/REQ-b.md"],
      knowledge,
    });
    expect(withGap?.rules).toContain("related-requirement-unmodeled");
    expect(withGap?.entityIds).toStrictEqual(new Set(["REQ-a", "REQ-b"]));
  });

  test("evaluates must-positive-scenario without the acknowledged requirements", async () => {
    const { tree, snapshot } = repo({
      ".kb/manifest.json": manifest(17, {
        positiveScenarioAcknowledged: ["REQ-old"],
      }),
    });
    const rules = stagedRequirementRules(snapshot, {
      stagedPaths: [],
      knowledge: [],
    });
    const port = prolog([
      {
        id: "REQ-old",
        reason: "no_success_scenario",
        subjects: ["a"],
        successScenarios: [],
      },
      {
        id: "REQ-new",
        reason: "no_success_scenario",
        subjects: ["a"],
        successScenarios: [],
      },
    ]);
    const found = await rules?.evaluate(port, tree, []);
    expect(found?.map((v) => [v.rule, v.entityId])).toStrictEqual([
      ["must-positive-scenario", "REQ-new"],
    ]);
    expect(port.goals.join("\n")).toContain("positive_scenario_gaps_json");
  });

  test("evaluates subject-definition-missing from the tree's subject bodies", async () => {
    const files = {
      ".kb/manifest.json": manifest(16),
      ".kb/facts/FACT-subject-login.md": subjectDoc(
        "FACT-subject-login",
        "auth.login",
        SUBJECT_BODY,
      ),
      ".kb/facts/FACT-subject-cart.md": subjectDoc(
        "FACT-subject-cart",
        "shop.cart",
        "The cart.",
      ),
      ".kb/facts/FACT-subject-old.md": subjectDoc(
        "FACT-subject-old",
        "shop.old",
        "Old.",
      ),
    };
    const { tree, snapshot } = repo(files);
    const knowledge = [
      entity("FACT-subject-login", "fact", ".kb/facts/FACT-subject-login.md", {
        fact_kind: "subject",
      }),
      entity("FACT-subject-cart", "fact", ".kb/facts/FACT-subject-cart.md", {
        fact_kind: "subject",
      }),
      entity("FACT-subject-old", "fact", ".kb/facts/FACT-subject-old.md", {
        fact_kind: "subject",
      }),
      // A subject whose document the tree lacks, or whose source names a
      // directory, has no body to judge.
      entity("FACT-subject-gone", "fact", ".kb/facts/FACT-subject-gone.md", {
        fact_kind: "subject",
      }),
      entity("FACT-subject-dir", "fact", ".kb/facts", {
        fact_kind: "subject",
      }),
      entity(
        "FACT-subject-new",
        "fact",
        "x.md",
        { fact_kind: "property_value" },
        [
          {
            type: "supersedes",
            from: "FACT-subject-new",
            to: "FACT-subject-old",
          },
        ],
      ),
    ];
    const rules = stagedRequirementRules(snapshot, {
      stagedPaths: [],
      knowledge,
    });
    const port = prolog([]);
    const found = await rules?.evaluate(port, tree, knowledge);
    // The superseded subject is out of the vocabulary; the positive
    // scenario rule needs schema 17.
    expect(found?.map((v) => [v.rule, v.entityId])).toStrictEqual([
      ["subject-definition-missing", "FACT-subject-cart"],
    ]);
    expect(port.goals).toStrictEqual([]);
    // Without subject facts there is nothing to read.
    expect(await rules?.evaluate(port, tree, [])).toStrictEqual([]);
  });
});

describe("floorChangedRequirementIds", () => {
  const req = (front: string, body = "The rule.") =>
    `---\nid: REQ-a\ntitle: A\ntype: req\nstatus: open\n${front}---\n${body}\n`;

  test("lists new requirements and those whose floor fields changed", () => {
    const base: Record<string, string> = {
      "same.md": req("priority: must\n"),
      "approved.md": req("origin:\n  kind: agent\n"),
      "body.md": req("priority: must\n"),
    };
    const staged = [
      { path: "new.md", content: req("") },
      { path: "same.md", content: req("priority: must\n") },
      {
        path: "approved.md",
        content: req("origin:\n  kind: agent\n  approved_by: pat\n"),
      },
      { path: "body.md", content: req("priority: must\n", "Other words.") },
      { path: "deleted.md" },
      {
        path: "fact.md",
        content: "---\nid: F\ntitle: F\ntype: fact\nstatus: active\n---\nF\n",
      },
      {
        path: "retired.md",
        content: req("").replace("status: open", "status: superseded"),
      },
    ];
    expect(
      floorChangedRequirementIds(staged, (file) => base[file] ?? null),
    ).toStrictEqual(["REQ-a", "REQ-a"]);
    expect(
      floorChangedRequirementIds(
        staged.filter((file) => file.path !== "new.md"),
        (file) => base[file] ?? null,
      ),
    ).toStrictEqual(["REQ-a"]);
  });
});
