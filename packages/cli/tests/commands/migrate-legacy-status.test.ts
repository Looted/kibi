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
import { spawnSync } from "../helpers/isolated-env.js";

// implements REQ-cli-migrate-legacy-requirement-status, REQ-kibi-uncompiled-source-visibility

const kibiCliEntry = path.resolve(__dirname, "../../src/cli.ts");
const TIMEOUT_MS = 240_000;

function runKibi(args: string[], cwd: string, input?: string) {
  const result = spawnSync("bun", [kibiCliEntry, ...args], {
    cwd,
    encoding: "utf8",
    timeout: TIMEOUT_MS,
    ...(input === undefined ? {} : { input }),
  });
  return {
    status: result.status,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

function vcs(cwd: string, ...args: string[]): void {
  spawnSync("git", args, { cwd, encoding: "utf8" });
}

function writeManifest(root: string, schemaVersion: number): void {
  writeFileSync(
    path.join(root, ".kb/manifest.json"),
    `${JSON.stringify({ manifestVersion: 1, schemaVersion, semanticAdvisorBackfill: "completed" }, null, 2)}\n`,
  );
}

const TABLE_BODY = [
  "The editor must save a draft every 30 seconds.",
  "",
  "| Field | Value |",
  "| ----- | ----- |",
  "| interval | 30s |",
  "| storage | local |",
].join("\n");

/** A legacy requirement as an older Kibi wrote it: a status and a table body. */
function writeLegacyRequirement(
  root: string,
  id: string,
  status: string,
  extra: string[] = [],
): string {
  const file = path.join(root, `.kb/requirements/${id}.md`);
  writeFileSync(
    file,
    [
      "---",
      `id: ${id}`,
      "title: Editor saves drafts",
      "type: req",
      `status: ${status}`,
      "priority: must",
      ...extra,
      "---",
      "",
      TABLE_BODY,
      "",
    ].join("\n"),
  );
  return file;
}

function writeOpenRequirement(root: string): void {
  writeFileSync(
    path.join(root, ".kb/requirements/REQ-EDITOR-001.md"),
    "---\nid: REQ-EDITOR-001\ntitle: Editor opens files\ntype: req\nstatus: open\n---\n\nThe editor opens files.\n",
  );
}

function frontmatter(file: string): Record<string, unknown> {
  return loadYaml(readFileSync(file, "utf8").split("---")[1] ?? "") as Record<
    string,
    unknown
  >;
}

function queryEntity(root: string, id: string): Record<string, unknown> {
  const result = runKibi(
    ["query", "--input", "-"],
    root,
    JSON.stringify({ id }),
  );
  expect(result.status, result.stderr).toBe(0);
  const parsed = JSON.parse(result.stdout) as {
    entities?: Record<string, unknown>[];
    data?: { entities?: Record<string, unknown>[] };
  };
  const entities = parsed.entities ?? parsed.data?.entities ?? [];
  return entities[0] ?? {};
}

function statusJson(root: string): {
  syncState: string;
  staleReasons: Record<string, unknown>[];
} {
  const result = runKibi(["status", "--format", "json"], root);
  expect(result.status, result.stderr).toBe(0);
  const parsed = JSON.parse(result.stdout) as Record<string, unknown>;
  return ((parsed.structuredContent as Record<string, unknown> | undefined) ??
    (parsed.data as Record<string, unknown> | undefined) ??
    parsed) as { syncState: string; staleReasons: Record<string, unknown>[] };
}

describe("legacy requirement statuses and uncompiled sources", () => {
  let root: string;

  beforeEach(() => {
    root = realpathSync.native(
      mkdtempSync(path.join(os.tmpdir(), "kibi-legacy-status-")),
    );
    vcs(root, "init", "-b", "main");
    vcs(root, "config", "user.email", "test@example.com");
    vcs(root, "config", "user.name", "Kibi Test");
    vcs(root, "commit", "--allow-empty", "-m", "init");
    expect(runKibi(["init", "--no-hooks"], root).status).toBe(0);
  });

  afterEach(() => {
    runKibi(["engine", "stop"], root);
    if (existsSync(root)) rmSync(root, { recursive: true, force: true });
  });

  test(
    "kibi migrate --yes maps a delivered status to closed with the tag implemented, and sync compiles it",
    () => {
      writeManifest(root, 7);
      writeOpenRequirement(root);
      const file = writeLegacyRequirement(
        root,
        "REQ-EDITOR-004",
        "implemented",
      );
      writeLegacyRequirement(root, "REQ-EDITOR-005", "done");
      vcs(root, "add", "--all");
      vcs(root, "commit", "-m", "legacy");

      const dry = runKibi(["migrate", "--dry-run"], root);
      expect(dry.stdout).toContain(
        "dry run: would map legacy status implemented -> closed (tag implemented) on 1 requirement(s): REQ-EDITOR-004",
      );
      expect(frontmatter(file).status).toBe("implemented");

      const migrated = runKibi(["migrate", "--yes"], root);
      expect(migrated.status, migrated.stderr).toBe(0);
      expect(migrated.stdout).toContain(
        "Mapped legacy status implemented -> closed (tag implemented) on 1 requirement(s): REQ-EDITOR-004; legacy status done -> closed (tag implemented) on 1 requirement(s): REQ-EDITOR-005.",
      );
      expect(migrated.stdout).toContain(
        "Migration complete. Future 'kibi migrate' runs will be a no-op.",
      );
      expect(frontmatter(file)).toMatchObject({
        status: "closed",
        tags: expect.arrayContaining(["implemented"]),
      });
      // Only the status and the tags changed; the table body is untouched.
      expect(readFileSync(file, "utf8")).toContain(TABLE_BODY);
      const audit = JSON.parse(
        readFileSync(path.join(root, ".kb/migrations/main.json"), "utf8"),
      );
      expect(audit.legacyStatusesMapped).toBe(2);

      const synced = runKibi(["sync"], root);
      expect(synced.status, `${synced.stdout}\n${synced.stderr}`).toBe(0);
      expect(synced.stderr).not.toContain("Failed to extract");
      expect(queryEntity(root, "REQ-EDITOR-004")).toMatchObject({
        status: "closed",
        tags: expect.arrayContaining(["implemented"]),
      });
      // A delivered must requirement still owes coverage.
      const check = runKibi(["check", "--format", "json"], root);
      expect(check.stdout).toContain('"rule":"must-priority-coverage"');
      expect(check.stdout).toContain('"entityId":"REQ-EDITOR-004"');
      expect(statusJson(root).syncState).toBe("fresh");
    },
    TIMEOUT_MS,
  );

  test(
    "a delivered status that failed the store's first sync keeps the legacy baseline once migrate maps it",
    () => {
      writeManifest(root, 10);
      writeOpenRequirement(root);
      writeLegacyRequirement(root, "REQ-EDITOR-004", "implemented", [
        `semantic_text: ${JSON.stringify(TABLE_BODY)}`,
      ]);
      vcs(root, "add", "--all");
      vcs(root, "commit", "-m", "legacy");
      // The first sync compiles REQ-EDITOR-001 and cannot extract REQ-EDITOR-004.
      const first = runKibi(["sync"], root);
      expect(first.status, first.stderr).toBe(0);

      const migrated = runKibi(["migrate", "--yes"], root);
      expect(migrated.status, migrated.stderr).toBe(0);
      expect(migrated.stdout).toContain(
        "Mapped legacy status implemented -> closed (tag implemented) on 1 requirement(s): REQ-EDITOR-004.",
      );
      expect(migrated.stdout).not.toContain("Migration incomplete");

      const synced = runKibi(["sync"], root);
      expect(synced.status, `${synced.stdout}\n${synced.stderr}`).toBe(0);
      expect(queryEntity(root, "REQ-EDITOR-004").status).toBe("closed");
    },
    TIMEOUT_MS,
  );

  test(
    "an unknown status leaves the migration incomplete, and kb_check and kb_status name the uncompiled file",
    () => {
      writeManifest(root, 7);
      writeOpenRequirement(root);
      writeLegacyRequirement(root, "REQ-EDITOR-006", "wip");
      vcs(root, "add", "--all");
      vcs(root, "commit", "-m", "legacy");

      const migrated = runKibi(["migrate", "--yes"], root);
      expect(migrated.status, migrated.stderr).toBe(0);
      expect(migrated.stdout).not.toContain("Migration complete");
      expect(migrated.stdout).toContain(
        "Migration incomplete: 1 requirement(s) are not compiled",
      );
      expect(migrated.stdout).toContain(
        "REQ-EDITOR-006 (.kb/requirements/REQ-EDITOR-006.md): status wip is not a status Kibi knows, so kibi sync cannot compile it",
      );

      const synced = runKibi(["sync"], root);
      expect(synced.status, synced.stderr).toBe(0);

      const check = runKibi(["check", "--format", "json"], root);
      expect(check.status).not.toBe(0);
      const violations = (
        JSON.parse(check.stdout) as {
          structuredContent: { violations: Record<string, unknown>[] };
        }
      ).structuredContent.violations;
      expect(violations).toContainEqual(
        expect.objectContaining({
          rule: "source-relationship-parity",
          source: ".kb/requirements/REQ-EDITOR-006.md",
          description: expect.stringContaining(
            ".kb/requirements/REQ-EDITOR-006.md cannot be compiled, so the entities and relationships it declares are missing from the KB: Entity validation failed: /status",
          ),
          suggestion: expect.stringContaining("kibi migrate --yes"),
        }),
      );

      const status = statusJson(root);
      expect(status.syncState).toBe("stale");
      expect(status.staleReasons).toContainEqual(
        expect.objectContaining({
          code: "source_extraction_failed",
          path: ".kb/requirements/REQ-EDITOR-006.md",
          blocking: true,
        }),
      );

      // At the latest schema the next run still reports it, not "no migration needed".
      const again = runKibi(["migrate", "--yes"], root);
      expect(again.stdout).not.toContain("No migration needed");
      expect(again.stdout).toContain("Migration incomplete");

      // Fixing the file clears the finding.
      const file = path.join(root, ".kb/requirements/REQ-EDITOR-006.md");
      writeFileSync(
        file,
        readFileSync(file, "utf8").replace("status: wip", "status: open"),
      );
      expect(runKibi(["sync"], root).status).toBe(0);
      expect(statusJson(root).syncState).toBe("fresh");
    },
    TIMEOUT_MS,
  );

  test(
    "kb_upsert on an uncompiled requirement file is judged as the next sync judges that file",
    () => {
      writeManifest(root, 10);
      writeOpenRequirement(root);
      const file = writeLegacyRequirement(
        root,
        "REQ-EDITOR-004",
        "implemented",
        [
          `semantic_text: ${JSON.stringify(TABLE_BODY)}`,
          "origin:",
          "  kind: migration",
          "  ref: kibi migrate v5->v6",
        ],
      );
      vcs(root, "add", "--all");
      vcs(root, "commit", "-m", "legacy");
      expect(runKibi(["sync"], root).status).toBe(0);

      // It failed the store's first compilation, so it is legacy content sync
      // accepts without an inventory once it compiles: closing it is allowed.
      const closed = runKibi(
        ["upsert", "--input", "-"],
        root,
        JSON.stringify({
          id: "REQ-EDITOR-004",
          type: "req",
          properties: { title: "Editor saves drafts", status: "closed" },
        }),
      );
      expect(closed.status, `${closed.stdout}${closed.stderr}`).toBe(0);
      expect(readFileSync(file, "utf8")).toContain("\nstatus: closed\n");
      const synced = runKibi(["sync"], root);
      expect(synced.status, `${synced.stdout}${synced.stderr}`).toBe(0);
      expect(queryEntity(root, "REQ-EDITOR-004").status).toBe("closed");

      // One written after the first compilation is new authoring: closing it
      // would leave a current requirement without an inventory.
      const later = writeLegacyRequirement(root, "REQ-EDITOR-008", "wip", [
        `semantic_text: ${JSON.stringify(TABLE_BODY)}`,
      ]);
      expect(runKibi(["sync"], root).status).toBe(0);
      const before = readFileSync(later, "utf8");
      const refusedClose = runKibi(
        ["upsert", "--input", "-"],
        root,
        JSON.stringify({
          id: "REQ-EDITOR-008",
          type: "req",
          properties: { title: "Editor saves drafts", status: "closed" },
        }),
      );
      expect(refusedClose.status).not.toBe(0);
      expect(`${refusedClose.stdout}${refusedClose.stderr}`).toContain(
        "Proposition-complete ingestion failed: REQ-EDITOR-008 would be written as a current requirement without a complete proposition inventory",
      );
      expect(readFileSync(later, "utf8")).toBe(before);

      // A write that leaves the file uncompilable is refused, naming the file.
      const broken = path.join(root, ".kb/requirements/REQ-EDITOR-007.md");
      writeFileSync(
        broken,
        "---\nid: REQ-EDITOR-007\ntitle: Editor exports files\ntype: req\nstatus: wip\npriority: 5\n---\n\nEditor exports files.\n",
      );
      const brokenBefore = readFileSync(broken, "utf8");
      const refused = runKibi(
        ["upsert", "--input", "-"],
        root,
        JSON.stringify({
          id: "REQ-EDITOR-007",
          type: "req",
          properties: { title: "Editor exports files", status: "deprecated" },
        }),
      );
      expect(refused.status).not.toBe(0);
      expect(`${refused.stdout}${refused.stderr}`).toContain(
        "REQ-EDITOR-007 exists in .kb/requirements/REQ-EDITOR-007.md but is not compiled",
      );
      expect(`${refused.stdout}${refused.stderr}`).toContain(
        "this write would leave the file uncompilable: Entity validation failed: /priority",
      );
      expect(readFileSync(broken, "utf8")).toBe(brokenBefore);
    },
    TIMEOUT_MS,
  );

  test(
    "kb_upsert that repairs an uncompiled file updates it in place and keeps its origin",
    () => {
      writeManifest(root, 10);
      writeOpenRequirement(root);
      const file = path.join(root, ".kb/adr/ADR-editor-autosave.md");
      writeFileSync(
        file,
        "---\nid: ADR-editor-autosave\ntitle: Autosave drafts locally\ntype: adr\nstatus: wip\norigin:\n  kind: migration\n  ref: kibi migrate v5->v6\n---\n\nDrafts are saved to local storage because the editor works offline.\n",
      );
      vcs(root, "add", "--all");
      vcs(root, "commit", "-m", "legacy");
      expect(runKibi(["sync"], root).status).toBe(0);

      const repaired = runKibi(
        ["upsert", "--input", "-"],
        root,
        JSON.stringify({
          id: "ADR-editor-autosave",
          type: "adr",
          properties: { title: "Autosave drafts locally", status: "accepted" },
        }),
      );
      expect(repaired.status, `${repaired.stdout}${repaired.stderr}`).toBe(0);
      const result = JSON.parse(repaired.stdout) as {
        data: { warnings: string[]; sourceWrites: { created: boolean }[] };
      };
      expect(result.data.sourceWrites[0]?.created).toBe(false);
      expect(result.data.warnings).toContainEqual(
        expect.stringContaining(
          "ADR-editor-autosave was not in the compiled KB; this write updated its authored file .kb/adr/ADR-editor-autosave.md",
        ),
      );
      expect(frontmatter(file)).toMatchObject({
        status: "accepted",
        origin: { kind: "migration", ref: "kibi migrate v5->v6" },
      });
      expect(readFileSync(file, "utf8")).toContain(
        "Drafts are saved to local storage because the editor works offline.",
      );
      expect(runKibi(["sync"], root).status).toBe(0);
      expect(queryEntity(root, "ADR-editor-autosave").status).toBe("accepted");
    },
    TIMEOUT_MS,
  );
  test(
    "a requirement that once failed to compile keeps its legacy treatment while its prose is unchanged",
    () => {
      writeManifest(root, 7);
      writeOpenRequirement(root);
      const file = writeLegacyRequirement(
        root,
        "REQ-EDITOR-004",
        "implemented",
      );
      vcs(root, "add", "--all");
      vcs(root, "commit", "-m", "legacy");
      expect(runKibi(["migrate", "--yes"], root).status).toBe(0);
      const first = runKibi(["sync"], root);
      expect(first.status, `${first.stdout}${first.stderr}`).toBe(0);
      vcs(root, "add", "--all");
      vcs(root, "commit", "-m", "migrate");
      const committed = readFileSync(file, "utf8");
      const toWip = () =>
        writeFileSync(file, committed.replace("status: closed", "status: wip"));
      const syncOk = (label: string) => {
        const synced = runKibi(["sync"], root);
        expect(
          synced.status,
          `${label}\n${synced.stdout}${synced.stderr}`,
        ).toBe(0);
        expect(synced.stderr).not.toContain("proposition-complete ingestion");
      };

      // A status sync cannot compile is reported, then restoring the
      // committed file syncs cleanly again.
      toWip();
      const failed = runKibi(["sync"], root);
      expect(failed.status).toBe(0);
      expect(failed.stderr).toContain("Failed to extract");
      expect(statusJson(root).staleReasons).toContainEqual(
        expect.objectContaining({ code: "source_extraction_failed" }),
      );
      vcs(root, "checkout", "--", ".kb/requirements/REQ-EDITOR-004.md");
      syncOk("restored");
      expect(statusJson(root).syncState).toBe("fresh");
      // It keeps the treatment through more than one failed sync.
      toWip();
      expect(runKibi(["sync"], root).status).toBe(0);
      expect(runKibi(["sync"], root).status).toBe(0);
      vcs(root, "checkout", "--", ".kb/requirements/REQ-EDITOR-004.md");
      syncOk("restored after two failures");

      // A status-only kb_upsert the write guard accepts compiles at the next
      // sync, whether the store still holds the entity or not.
      for (const args of [["sync"], ["sync", "--rebuild"]]) {
        toWip();
        expect(runKibi(args, root).status).toBe(0);
        const upserted = runKibi(
          ["upsert", "--input", "-"],
          root,
          JSON.stringify({
            id: "REQ-EDITOR-004",
            type: "req",
            properties: { title: "Editor saves drafts", status: "closed" },
          }),
        );
        expect(upserted.status, `${upserted.stdout}${upserted.stderr}`).toBe(0);
        syncOk(`upsert after ${args.join(" ")}`);
        expect(queryEntity(root, "REQ-EDITOR-004").status).toBe("closed");
      }

      // Changed prose is new authoring and still needs the inventory.
      toWip();
      expect(runKibi(["sync"], root).status).toBe(0);
      writeFileSync(
        file,
        committed.replaceAll("every 30 seconds", "every 10 seconds"),
      );
      const changed = runKibi(["sync"], root);
      expect(changed.status).not.toBe(0);
      expect(`${changed.stdout}${changed.stderr}`).toContain(
        "REQ-EDITOR-004.md: proposition-complete ingestion failed",
      );
    },
    TIMEOUT_MS,
  );
});
