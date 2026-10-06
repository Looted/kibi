import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import type {
  MigrationAction,
  MigrationPlan,
} from "../../src/public/operations/migration-plan.js";
import { spawnSync } from "../helpers/isolated-env.js";
import {
  EXCEPTION_TEXT,
  UPLOAD_TEXT,
  writeCurrentRequirement,
  writeManifest,
} from "../helpers/schema6-fixture.js";

// implements REQ-cli-schema-migration, REQ-core-validation-rules, REQ-kibi-schema6-migration, REQ-kibi-kb-lifecycle-integrity

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

function write(root: string, relative: string, content: string): void {
  const absolute = path.join(root, relative);
  mkdirSync(path.dirname(absolute), { recursive: true });
  writeFileSync(absolute, content, "utf8");
}

function read(root: string, relative: string): string {
  return readFileSync(path.join(root, relative), "utf8");
}

const OLD = ".kb/requirements/REQ-upload-old.md";
const ADR = ".kb/adr/ADR-upload-chunks.md";
const FACT = ".kb/facts/FACT-upload-notes.md";
const CHUNK = ".kb/facts/FACT-upload-chunk-size.md";
const SELF = ".kb/facts/FACT-upload-self.md";
const MULTI = ".kb/facts/FACT-upload-legacy.md";
const REFUSED =
  "the source field spans several lines, or editing it would change other frontmatter fields";

function observation(id: string, sourceLines: string): string {
  return `---\nid: ${id}\ntitle: ${id}\ntype: fact\nstatus: active\nfact_kind: observation\n${sourceLines}---\n\nNotes.\n`;
}

/**
 * A schema 6 KB with every lifecycle finding kibi migrate repairs: a
 * superseded requirement still open, two requirements that supersede each
 * other, and source fields that are dead data: one naming its own file by
 * the retired documentation/ path, one naming its own file under .kb/, one
 * naming another moved file, one naming a file that never existed, and one
 * spanning several lines that Kibi cannot edit safely. Valid sources (a path
 * with an anchor, an entity id, a URL) must be left alone.
 */
function writeLifecycleFixture(root: string): void {
  writeCurrentRequirement(root, "REQ-upload-old", UPLOAD_TEXT, {
    source: "docs/upload-spec.md#resume",
  });
  writeCurrentRequirement(root, "REQ-upload-new", UPLOAD_TEXT, {
    source: "https://example.com/upload-spec",
    links: [{ type: "supersedes", target: "REQ-upload-old" }],
  });
  writeCurrentRequirement(root, "REQ-upload-loop-a", EXCEPTION_TEXT, {
    source: "REQ-upload-old",
    links: [{ type: "supersedes", target: "REQ-upload-loop-b" }],
  });
  writeCurrentRequirement(root, "REQ-upload-loop-b", EXCEPTION_TEXT, {
    links: [{ type: "supersedes", target: "REQ-upload-loop-a" }],
  });
  write(root, "docs/upload-spec.md", "# Upload spec\n\n## Resume\n");
  write(
    root,
    ADR,
    "---\nid: ADR-upload-chunks\ntitle: Upload in chunks\ntype: adr\nstatus: accepted\nsource: documentation/adr/ADR-upload-chunks.md\nlinks:\n  - type: relates_to\n    target: REQ-upload-new\n---\n\nUploads are split into chunks.\n",
  );
  write(
    root,
    FACT,
    observation("FACT-upload-notes", "source: memory-bank/techContext.md\n"),
  );
  write(
    root,
    CHUNK,
    observation(
      "FACT-upload-chunk-size",
      "source: documentation/adr/ADR-upload-chunks.md#decision\n",
    ),
  );
  write(root, SELF, observation("FACT-upload-self", `source: ${SELF}\n`));
  write(
    root,
    MULTI,
    observation("FACT-upload-legacy", "source:\n  - memory-bank/a.md\n"),
  );
}

describe("kibi migrate lifecycle repairs", () => {
  let root: string;

  beforeEach(() => {
    root = realpathSync.native(
      mkdtempSync(path.join(os.tmpdir(), "kibi-test-lifecycle-")),
    );
    git(root, "init", "-b", "main");
    git(root, "config", "user.email", "test@example.com");
    git(root, "config", "user.name", "Kibi Test");
    git(root, "commit", "--allow-empty", "-m", "init");
    expect(runKibi(["init", "--no-hooks"], root).status).toBe(0);
    writeLifecycleFixture(root);
    git(root, "add", "--all");
  });

  afterEach(() => {
    runKibi(["engine", "stop"], root);
    if (existsSync(root)) rmSync(root, { recursive: true, force: true });
  });

  test(
    "plans and applies the lifecycle repairs on a schema 6 KB, leaving cycles and unsafe source edits for review",
    () => {
      const plan = readPlan(root);

      expect(action(plan, "close-superseded-requirements")).toMatchObject({
        code: "close_superseded_requirements",
        safety: "automatic",
        autoApplicable: true,
        affectedEntityIds: ["REQ-upload-old"],
        affectedFiles: [OLD],
      });
      expect(action(plan, "source-path-rewrite")).toMatchObject({
        code: "source_path_rewrite",
        safety: "automatic",
        autoApplicable: true,
        affectedEntityIds: [
          "ADR-upload-chunks",
          "FACT-upload-chunk-size",
          "FACT-upload-notes",
          "FACT-upload-self",
        ],
        evidence: {
          rewrites: [
            {
              entityId: "FACT-upload-chunk-size",
              file: CHUNK,
              from: "documentation/adr/ADR-upload-chunks.md#decision",
              to: `${ADR}#decision`,
            },
          ],
          removals: [
            {
              entityId: "ADR-upload-chunks",
              file: ADR,
              from: "documentation/adr/ADR-upload-chunks.md",
              reason: "self",
            },
            {
              entityId: "FACT-upload-notes",
              file: FACT,
              from: "memory-bank/techContext.md",
              reason: "dangling",
            },
            {
              entityId: "FACT-upload-self",
              file: SELF,
              from: SELF,
              reason: "self",
            },
          ],
        },
      });
      const cycle = action(
        plan,
        "review-supersession-cycle-REQ-upload-loop-a-REQ-upload-loop-b",
      );
      expect(cycle).toMatchObject({
        code: "review_supersession_cycle",
        safety: "review",
        affectedEntityIds: ["REQ-upload-loop-a", "REQ-upload-loop-b"],
      });
      expect(
        cycle?.invocation.kind === "review" ? cycle.invocation.instruction : "",
      ).toContain(
        "REQ-upload-loop-a supersedes REQ-upload-loop-b; REQ-upload-loop-b supersedes REQ-upload-loop-a",
      );
      expect(
        action(plan, "review-source-path-dangling-FACT-upload-legacy"),
      ).toMatchObject({
        code: "review_source_path_dangling",
        safety: "review",
        affectedFiles: [MULTI],
        evidence: { refused: REFUSED },
      });
      expect(action(plan, "migration-sync")?.dependsOn).toEqual(
        expect.arrayContaining([
          "close-superseded-requirements",
          "source-path-rewrite",
        ]),
      );
      // Valid sources produce nothing; only the unsafe edit needs a person.
      const reviewed = plan.actions
        .filter((candidate) => candidate.code === "review_source_path_dangling")
        .map((candidate) => candidate.id);
      expect(reviewed).toEqual([
        "review-source-path-dangling-FACT-upload-legacy",
      ]);

      const oldBefore = read(root, OLD);
      const loopBefore = read(root, ".kb/requirements/REQ-upload-loop-a.md");
      const adrBefore = read(root, ADR);
      const factBefore = read(root, FACT);
      const selfBefore = read(root, SELF);
      const multiBefore = read(root, MULTI);
      const applied = runKibi(
        ["migrate", "--apply-safe", "--approved-plan-hash", plan.planHash],
        root,
      );
      expect(applied.status, `${applied.stdout}\n${applied.stderr}`).toBe(0);
      expect(applied.stdout).toContain('"outcome": "applied"');

      expect(read(root, OLD)).toBe(
        oldBefore.replace("status: open\n", "status: closed\n"),
      );
      // Only the source line changes.
      expect(read(root, ADR)).toBe(
        adrBefore.replace(
          "source: documentation/adr/ADR-upload-chunks.md\n",
          "",
        ),
      );
      expect(read(root, FACT)).toBe(
        factBefore.replace("source: memory-bank/techContext.md\n", ""),
      );
      expect(read(root, SELF)).toBe(
        selfBefore.replace(`source: ${SELF}\n`, ""),
      );
      expect(read(root, CHUNK)).toContain(`\nsource: ${ADR}#decision\n`);
      expect(read(root, MULTI)).toBe(multiBefore);
      expect(read(root, ".kb/requirements/REQ-upload-loop-a.md")).toBe(
        loopBefore,
      );

      const check = runKibi(
        [
          "check",
          "--rules",
          "superseded-requirement-open,source-path-dangling",
          "--format",
          "json",
        ],
        root,
      );
      const violations = (
        JSON.parse(check.stdout) as {
          structuredContent: {
            violations: Array<{ rule: string; entityId: string }>;
          };
        }
      ).structuredContent.violations;
      expect(
        violations.map((violation) => [violation.rule, violation.entityId]),
      ).toEqual([
        ["superseded-requirement-open", "REQ-upload-loop-a"],
        ["source-path-dangling", "FACT-upload-legacy"],
      ]);

      const next = readPlan(root);
      expect(action(next, "close-superseded-requirements")).toBeUndefined();
      expect(action(next, "source-path-rewrite")).toBeUndefined();
      expect(
        action(
          next,
          "review-supersession-cycle-REQ-upload-loop-a-REQ-upload-loop-b",
        ),
      ).toBeDefined();
      expect(
        action(next, "review-source-path-dangling-FACT-upload-legacy"),
      ).toBeDefined();
    },
    TIMEOUT_MS,
  );

  test(
    "kibi migrate --yes repairs a schema 6 KB directly and warns about what needs a person",
    () => {
      const dry = runKibi(["migrate", "--dry-run"], root);
      expect(dry.status, dry.stderr).toBe(0);
      expect(dry.stdout).toContain(
        "dry run: would close 1 superseded requirement(s): REQ-upload-old.",
      );
      expect(dry.stdout).toContain(
        "dry run: would point 1 pre-canonical source path(s) at their .kb/ files.",
      );
      expect(dry.stdout).toContain(
        "dry run: would remove 3 redundant or dead source field(s); the compiled source is always the entity's own file.",
      );
      expect(dry.stdout).toContain(
        `Source field of ${MULTI} not repaired: ${REFUSED}`,
      );
      expect(read(root, OLD)).toContain("status: open\n");
      expect(read(root, SELF)).toContain(`source: ${SELF}\n`);

      const result = runKibi(["migrate", "--yes"], root);
      expect(result.status, result.stderr).toBe(0);
      const output = `${result.stdout}${result.stderr}`;
      expect(output).toContain(
        "Closed 1 superseded requirement(s): REQ-upload-old.",
      );
      expect(output).toContain(
        "Pointed 1 pre-canonical source path(s) at their .kb/ files.",
      );
      expect(output).toContain(
        "Removed 3 redundant or dead source field(s); the compiled source is always the entity's own file.",
      );
      expect(output).toContain(
        "Requirements REQ-upload-loop-a, REQ-upload-loop-b supersede each other",
      );
      expect(output).toContain(
        `Source field of ${MULTI} not repaired: ${REFUSED}`,
      );
      expect(output).toContain(
        "Run 'kibi sync' to recompile the rewritten sources.",
      );
      expect(read(root, OLD)).toContain("status: closed\n");
      expect(read(root, SELF)).not.toContain("source:");

      const again = runKibi(["migrate", "--yes"], root);
      expect(again.stdout).not.toContain("Closed ");
      expect(again.stdout).not.toContain("Pointed ");
      expect(again.stdout).not.toContain("Removed ");
    },
    TIMEOUT_MS,
  );

  test(
    "a schema upgrade records the source repairs in the migration audit",
    () => {
      writeManifest(root, 5);
      git(root, "add", "--all");

      const result = runKibi(["migrate", "--yes"], root);
      expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0);
      const audit = JSON.parse(read(root, ".kb/migrations/main.json"));
      expect(audit).toMatchObject({
        fromVersion: 5,
        toVersion: 8,
        supersededRequirementsClosed: 1,
        sourcePathsRewritten: 1,
        sourcePathsRemoved: 3,
      });
      expect(read(root, FACT)).not.toContain("source:");
      expect(read(root, CHUNK)).toContain(`\nsource: ${ADR}#decision\n`);
    },
    TIMEOUT_MS,
  );
});
