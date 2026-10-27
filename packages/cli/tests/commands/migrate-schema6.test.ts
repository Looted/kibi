import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { load as loadYaml } from "js-yaml";
import { prepareOperationInput } from "../../src/cli-validate.js";
import type {
  MigrationAction,
  MigrationPlan,
} from "../../src/public/operations/migration-plan.js";
import { modelSpec } from "../../src/public/operations/specs/composite.js";
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

  test("kibi init starts new knowledge bases at the latest schema", () => {
    expect(
      JSON.parse(readFileSync(path.join(root, ".kb/manifest.json"), "utf8"))
        .schemaVersion,
    ).toBe(13);
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
      const instruction =
        review?.invocation.kind === "review"
          ? review.invocation.instruction
          : "";
      // The suggested kb_model input must pass the public contract.
      const suggested = instruction
        .slice(instruction.indexOf('{"mode":"analyze"'))
        .replace(/<[^>]+>\}\.$/, '"The upload must resume."}');
      expect(
        prepareOperationInput(
          JSON.parse(suggested),
          modelSpec.businessInputSchema,
        ),
      ).toEqual(expect.objectContaining({ valid: true }));
      // The store cannot see the rejected requirement, so the fix names the
      // file and carries the re-derived contract to write there.
      expect(instruction).toContain("store-backed tools");
      expect(review?.evidence).toMatchObject({
        contract: expect.objectContaining({
          semantic_inventory: expect.any(Array),
        }),
        contractHash: expect.stringMatching(/^[0-9a-f]{64}$/),
      });
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
      expect(applied.stdout).toContain("Outcome: applied");

      expect(
        JSON.parse(readFileSync(path.join(root, ".kb/manifest.json"), "utf8"))
          .schemaVersion,
      ).toBe(13);
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
    "re-derives a drifted inventory before resyncing a schema 8 store",
    () => {
      writeCurrentRequirement(root, "REQ-upload-base", UPLOAD_TEXT);
      git(root, "add", "--all");
      git(root, "commit", "-m", "base");
      expect(runKibi(["sync"], root).status).toBe(0);
      writeDriftedRequirement(root, "REQ-upload-resume", 0);
      git(root, "add", "--all");
      git(root, "commit", "-m", "drift");

      const plan = readPlan(root);
      const rederive = "semantic-inventory-rederive-REQ-upload-resume";
      const syncs = plan.actions.filter(
        (candidate) =>
          candidate.id === "freshness-resync" ||
          candidate.id === "branch-store-compile",
      );
      expect(syncs.length).toBeGreaterThan(0);
      for (const sync of syncs) expect(sync.dependsOn).toContain(rederive);

      const applied = runKibi(
        ["migrate", "--apply-safe", "--approved-plan-hash", plan.planHash],
        root,
      );
      expect(applied.status, `${applied.stdout}\n${applied.stderr}`).toBe(0);
      expect(applied.stdout).toContain("Outcome: applied");
    },
    TIMEOUT_MS,
  );

  test(
    "withholds the store resync while a requirement needs a manual inventory review",
    () => {
      writeCurrentRequirement(root, "REQ-upload-base", UPLOAD_TEXT);
      git(root, "add", "--all");
      git(root, "commit", "-m", "base");
      expect(runKibi(["sync"], root).status).toBe(0);
      writeDriftedRequirement(root, "REQ-upload-unsafe", 1);
      git(root, "add", "--all");
      git(root, "commit", "-m", "drift");

      const plan = readPlan(root);
      for (const sync of plan.actions.filter(
        (candidate) =>
          candidate.id === "freshness-resync" ||
          candidate.id === "branch-store-compile",
      )) {
        expect(sync).toMatchObject({ state: "blocked", autoApplicable: false });
        expect(sync.evidence.blockedBy).toEqual([
          "semantic-inventory-review-REQ-upload-unsafe",
        ]);
      }
    },
    TIMEOUT_MS,
  );

  test(
    "drops orphaned grounding only when the review action is approved by id",
    () => {
      writeCurrentRequirement(root, "REQ-upload-base", UPLOAD_TEXT);
      git(root, "add", "--all");
      git(root, "commit", "-m", "base");
      expect(runKibi(["sync"], root).status).toBe(0);
      const { factId } = writeDriftedRequirement(root, "REQ-upload-unsafe", 1);
      git(root, "add", "--all");
      git(root, "commit", "-m", "drift");
      const file = path.join(root, ".kb/requirements/REQ-upload-unsafe.md");
      const before = readFileSync(file, "utf8");

      const plan = readPlan(root);
      const id = "semantic-inventory-rederive-drop-grounding-REQ-upload-unsafe";
      expect(action(plan, id)).toMatchObject({
        code: "semantic_inventory_rederive_drop_grounding",
        safety: "review",
        state: "ready",
        autoApplicable: false,
        invocation: { kind: "cli" },
        evidence: {
          droppedGrounding: [
            expect.objectContaining({
              type: "requires_predicate",
              target: factId,
            }),
          ],
          contractHash: expect.stringMatching(/^[0-9a-f]{64}$/),
        },
      });

      // --apply-safe alone never selects a review action.
      const unattended = runKibi(
        ["migrate", "--apply-safe", "--approved-plan-hash", plan.planHash],
        root,
      );
      expect(unattended.status, unattended.stderr).toBe(0);
      expect(readFileSync(file, "utf8")).toBe(before);

      const approved = runKibi(
        [
          "migrate",
          "--apply-safe",
          "--approved-plan-hash",
          plan.planHash,
          "--approved-action",
          id,
        ],
        root,
      );
      expect(approved.status, `${approved.stdout}\n${approved.stderr}`).toBe(0);
      expect(approved.stdout).toContain(`- applied ${id}`);
      expect(frontmatter(file).links).toBeUndefined();
      // Sync stays fail-closed, and now accepts the requirement.
      const synced = runKibi(["sync"], root);
      expect(synced.status, `${synced.stdout}\n${synced.stderr}`).toBe(0);
    },
    TIMEOUT_MS,
  );

  test(
    "maps a legacy requirement status and re-derives the drift it was hiding, in order, once both are approved",
    () => {
      writeCurrentRequirement(root, "REQ-upload-base", UPLOAD_TEXT);
      writeDriftedRequirement(root, "REQ-upload-resume", 0);
      const file = path.join(root, ".kb/requirements/REQ-upload-resume.md");
      writeFileSync(
        file,
        readFileSync(file, "utf8").replace("status: open", "status: accepted"),
      );
      git(root, "add", "--all");
      git(root, "commit", "-m", "accepted");
      // An `accepted` requirement is not validated, so its drift is hidden.
      expect(runKibi(["sync"], root).status).toBe(0);
      git(root, "add", "--all");
      git(root, "commit", "-m", "synced", "--allow-empty");

      const plan = readPlan(root);
      const map = "req-status-vocabulary-map-REQ-upload-resume";
      const rederive = "semantic-inventory-rederive-REQ-upload-resume";
      expect(action(plan, map)).toMatchObject({
        code: "req_status_vocabulary_map",
        safety: "review",
        autoApplicable: false,
        invocation: { kind: "cli" },
        evidence: {
          status: "accepted",
          suggestedStatus: "open",
          latentDrift: expect.objectContaining({
            safe: true,
            rederiveAction: rederive,
            ingestionErrors: expect.arrayContaining([expect.any(String)]),
          }),
        },
      });
      expect(action(plan, rederive)).toMatchObject({
        safety: "review",
        autoApplicable: false,
        dependsOn: [map],
        evidence: { afterStatus: "open" },
      });
      expect(
        plan.actions.some((candidate) =>
          candidate.code.startsWith("check_req-status-vocabulary"),
        ),
      ).toBe(false);

      // Neither runs unattended, and the re-derivation needs its mapping.
      const before = readFileSync(file, "utf8");
      expect(
        runKibi(
          ["migrate", "--apply-safe", "--approved-plan-hash", plan.planHash],
          root,
        ).status,
      ).toBe(0);
      expect(readFileSync(file, "utf8")).toBe(before);
      const alone = runKibi(
        [
          "migrate",
          "--apply-safe",
          "--approved-plan-hash",
          plan.planHash,
          "--approved-action",
          rederive,
        ],
        root,
      );
      expect(`${alone.stdout}\n${alone.stderr}`).toContain(
        `requires approved dependency '${map}'`,
      );
      expect(readFileSync(file, "utf8")).toBe(before);

      const applied = runKibi(
        [
          "migrate",
          "--apply-safe",
          "--approved-plan-hash",
          plan.planHash,
          "--approved-action",
          `${rederive},${map}`,
        ],
        root,
      );
      expect(applied.status, `${applied.stdout}\n${applied.stderr}`).toBe(0);
      expect(applied.stdout).toMatch(
        new RegExp(`- applied ${map}[\\s\\S]*- applied ${rederive}`),
      );
      expect(frontmatter(file).status).toBe("open");
      const synced = runKibi(["sync"], root);
      expect(synced.status, `${synced.stdout}\n${synced.stderr}`).toBe(0);
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
        toVersion: 13,
        entityOriginBackfill: 4,
        steps: [
          "entity-origin-v6",
          "polarity-values-v7",
          "entity-body-context-v8",
          "decision-firmness-v9",
          "firmness-from-origin-v10",
          "evidence-floor-v11",
          "claim-bound-proofs-v12",
          "derived-symbol-coordinates-v13",
        ],
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

  test(
    "plans one sync after a schema upgrade that rewrites no sources, as kb_status does",
    () => {
      // A stated floor leaves the schema 11 step nothing to record.
      writeCurrentRequirement(root, "REQ-upload-base", UPLOAD_TEXT, {
        required_evidence: "asserted",
      });
      writeManifest(root, 9);
      git(root, "add", "--all");
      const syncs = (plan: MigrationPlan) =>
        plan.actions
          .filter(
            (candidate) =>
              candidate.invocation.kind === "cli" &&
              candidate.invocation.command_argv.join(" ") === "kibi sync",
          )
          .map((candidate) => candidate.id);

      // Never compiled: the status plan already compiles after the upgrade.
      expect(syncs(readPlan(root))).toEqual(["branch-store-compile"]);

      // Compiled at schema 9: only the migration sync recompiles it.
      expect(runKibi(["sync"], root).status).toBe(0);
      writeManifest(root, 9);
      expect(syncs(readPlan(root))).toEqual(["migration-sync"]);
    },
    TIMEOUT_MS,
  );
});
