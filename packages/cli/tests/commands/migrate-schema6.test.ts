import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { load as loadYaml } from "js-yaml";
import type {
  MigrationAction,
  MigrationPlan,
} from "../../src/public/operations/migration-plan.js";
import { spawnSync } from "../helpers/isolated-env.js";
import {
  UPLOAD_TEXT,
  writeCurrentRequirement,
  writeDriftedRequirement,
  writeManifest,
  writeUnapprovedException,
} from "../helpers/schema6-fixture.js";

const kibiCliEntry = path.resolve(__dirname, "../../src/cli.ts");
const TIMEOUT_MS = 180_000;

function runKibi(args: string[], cwd: string) {
  const result = spawnSync("bun", [kibiCliEntry, ...args], {
    cwd,
    encoding: "utf8",
    timeout: TIMEOUT_MS,
  });
  return {
    status: result.status,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

function git(cwd: string, ...args: string[]): void {
  spawnSync("git", args, { cwd, encoding: "utf8" });
}

function readPlan(cwd: string): MigrationPlan {
  const result = runKibi(["migrate", "--format", "json"], cwd);
  expect(result.status, result.stderr).toBe(0);
  return JSON.parse(result.stdout) as MigrationPlan;
}

function action(plan: MigrationPlan, id: string): MigrationAction | undefined {
  return plan.actions.find((candidate) => candidate.id === id);
}

function frontmatter(file: string): Record<string, unknown> {
  return loadYaml(readFileSync(file, "utf8").split("---")[1] ?? "") as Record<
    string,
    unknown
  >;
}

const SCHEMA6_CODES = new Set([
  "entity_origin_backfill",
  "semantic_inventory_rederive",
  "semantic_inventory_review",
  "migration_sync",
]);

describe("kibi migrate to schema 6", () => {
  let root: string;

  beforeEach(() => {
    root = realpathSync.native(
      mkdtempSync(path.join(os.tmpdir(), "kibi-test-schema6-")),
    );
    git(root, "init", "-b", "main");
    git(root, "config", "user.email", "test@example.com");
    git(root, "config", "user.name", "Kibi Test");
    git(root, "commit", "--allow-empty", "-m", "init");
    expect(runKibi(["init", "--no-hooks"], root).status).toBe(0);
  });

  afterEach(() => {
    runKibi(["engine", "stop"], root);
    if (existsSync(root)) rmSync(root, { recursive: true, force: true });
  });

  test("kibi init starts new knowledge bases at schema 8", () => {
    expect(
      JSON.parse(readFileSync(path.join(root, ".kb/manifest.json"), "utf8"))
        .schemaVersion,
    ).toBe(8);
    const result = runKibi(["migrate", "--yes"], root);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("No migration needed");
  });

  test(
    "plans origin backfill, inventory re-derivation and the manual reviews for a schema 5 KB",
    () => {
      writeManifest(root, 5);
      writeDriftedRequirement(root, "REQ-upload-resume", 0);
      writeDriftedRequirement(root, "REQ-upload-unsafe", 1);
      writeUnapprovedException(
        root,
        "REQ-upload-exception",
        "REQ-upload-resume",
      );
      git(root, "add", "--all");

      const plan = readPlan(root);

      const backfill = action(plan, "entity-origin-backfill");
      expect(backfill).toMatchObject({
        code: "entity_origin_backfill",
        safety: "automatic",
        autoApplicable: true,
      });
      expect(backfill?.evidence).toMatchObject({
        count: 5,
        byType: { req: 3, fact: 2 },
      });
      expect(
        action(plan, "semantic-inventory-rederive-REQ-upload-resume"),
      ).toMatchObject({ safety: "automatic", autoApplicable: true });
      const review = action(
        plan,
        "semantic-inventory-review-REQ-upload-unsafe",
      );
      expect(review?.safety).toBe("review");
      expect(
        review?.invocation.kind === "review"
          ? review.invocation.instruction
          : "",
      ).toContain('kibi model --input -` with {"mode":"analyze"');
      expect(
        action(plan, "review-exception-unapproved-REQ-upload-exception"),
      ).toMatchObject({ safety: "review", dispositionRequired: true });
      expect(action(plan, "schema-config-upgrade")?.dependsOn).toEqual(
        expect.arrayContaining([
          "entity-origin-backfill",
          "semantic-inventory-rederive-REQ-upload-resume",
        ]),
      );
      // Sync would still reject the unsafe requirement, so no sync is planned.
      expect(action(plan, "migration-sync")).toBeUndefined();
      expect(plan.diagnostics.join("\n")).toContain("need a manual fix");
      // Planning is read-only.
      expect(
        frontmatter(path.join(root, ".kb/requirements/REQ-upload-resume.md"))
          .origin,
      ).toBeUndefined();
    },
    TIMEOUT_MS,
  );

  test(
    "applies the approved plan, after which sync and check run and a second plan has nothing left to migrate",
    () => {
      writeManifest(root, 5);
      const { propositions } = writeDriftedRequirement(
        root,
        "REQ-upload-resume",
        0,
      );
      writeCurrentRequirement(root, "REQ-upload-base", UPLOAD_TEXT);
      writeUnapprovedException(root, "REQ-upload-exception", "REQ-upload-base");
      git(root, "add", "--all");

      const plan = readPlan(root);
      expect(action(plan, "migration-sync")?.dependsOn).toEqual(
        expect.arrayContaining([
          "entity-origin-backfill",
          "schema-config-upgrade",
          "semantic-inventory-rederive-REQ-upload-resume",
        ]),
      );
      const applied = runKibi(
        ["migrate", "--apply-safe", "--approved-plan-hash", plan.planHash],
        root,
      );
      expect(applied.status, `${applied.stdout}\n${applied.stderr}`).toBe(0);
      expect(applied.stdout).toContain('"outcome": "applied"');

      expect(
        JSON.parse(readFileSync(path.join(root, ".kb/manifest.json"), "utf8"))
          .schemaVersion,
      ).toBe(8);
      const requirement = frontmatter(
        path.join(root, ".kb/requirements/REQ-upload-resume.md"),
      );
      expect(requirement.origin).toMatchObject({
        kind: "migration",
        ref: "kibi migrate v5->v6",
      });
      const inventory = requirement.semantic_inventory as Array<
        Record<string, unknown>
      >;
      expect(inventory.map((entry) => [entry.role, entry.status])).toEqual([
        ["normative", "modeled"],
        ["normative", inventory[1]?.status],
        ["descriptive", "missing"],
      ]);
      expect(inventory[1]?.status).not.toBe("modeled");
      expect(requirement.logic_claims).toContain(propositions[1]?.claim_key);
      expect(
        frontmatter(
          path.join(root, ".kb/facts/FACT-upload-resume-GROUNDING.md"),
        ).origin,
      ).toMatchObject({ kind: "migration" });

      const sync = runKibi(["sync"], root);
      expect(sync.status, sync.stderr).toBe(0);
      const check = runKibi(["check", "--format", "json"], root);
      expect(check.stderr).not.toContain("Check execution failed");

      const next = readPlan(root);
      expect(
        next.actions.filter((candidate) => SCHEMA6_CODES.has(candidate.code)),
      ).toEqual([]);
      expect(action(next, "schema-config-upgrade")).toBeUndefined();
      // The exception review now comes from kibi check, under the same id.
      expect(
        action(next, "review-exception-unapproved-REQ-upload-exception"),
      ).toBeDefined();
      const again = runKibi(["migrate", "--yes"], root);
      expect(again.stdout).toContain("No migration needed");
    },
    TIMEOUT_MS,
  );

  test(
    "kibi migrate --yes upgrades directly and records the backfill in the audit",
    () => {
      writeManifest(root, 5);
      writeDriftedRequirement(root, "REQ-upload-resume", 0);
      writeDriftedRequirement(root, "REQ-upload-unsafe", 1);
      git(root, "add", "--all");

      const dry = runKibi(["migrate", "--dry-run"], root);
      expect(dry.stdout).toContain(
        "would record origin {kind: migration} on 4 authored entit(ies)",
      );
      expect(dry.stdout).toContain(
        "would re-derive the semantic inventory of REQ-upload-resume",
      );

      const result = runKibi(["migrate", "--yes"], root);
      expect(result.status, result.stderr).toBe(0);
      expect(result.stdout).toContain(
        "Re-derived the semantic inventory of REQ-upload-resume",
      );
      expect(result.stdout).toContain(
        "REQ-upload-unsafe (.kb/requirements/REQ-upload-unsafe.md) no longer matches the current semantic advisor and needs a manual fix",
      );
      const audit = JSON.parse(
        readFileSync(path.join(root, ".kb/migrations/main.json"), "utf8"),
      );
      expect(audit).toMatchObject({
        fromVersion: 5,
        toVersion: 8,
        entityOriginBackfill: 4,
        steps: ["entity-origin-v6", "polarity-values-v7", "entity-body-context-v8"],
      });

      // The unsafe requirement still blocks sync, with every failure listed.
      const sync = runKibi(["sync"], root);
      expect(sync.status).not.toBe(0);
      const output = `${sync.stdout}${sync.stderr}`;
      expect(output).toContain(
        "1 requirement(s) failed proposition-complete ingestion",
      );
      expect(output).toContain(".kb/requirements/REQ-upload-unsafe.md");
      expect(output).toContain("Run 'kibi migrate'");
    },
    TIMEOUT_MS,
  );

  test(
    "kibi sync lists every drifted requirement in one run",
    () => {
      writeDriftedRequirement(root, "REQ-upload-resume", 0);
      writeDriftedRequirement(root, "REQ-upload-unsafe", 1);
      git(root, "add", "--all");

      const sync = runKibi(["sync"], root);

      expect(sync.status).not.toBe(0);
      const output = `${sync.stdout}${sync.stderr}`;
      expect(output).toContain(
        "2 requirement(s) failed proposition-complete ingestion",
      );
      expect(output).toContain(
        ".kb/requirements/REQ-upload-resume.md: proposition-complete ingestion failed",
      );
      expect(output).toContain(
        ".kb/requirements/REQ-upload-unsafe.md: proposition-complete ingestion failed",
      );
      expect(output).toContain("Run 'kibi migrate'");
    },
    TIMEOUT_MS,
  );
});
