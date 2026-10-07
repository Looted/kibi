import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { load as loadYaml } from "js-yaml";
import { migrateCommand } from "../../../src/commands/migrate.js";
import { legacyRequirementSemanticText } from "../../../src/extractors/markdown.js";
import { sliceFrontmatter } from "../../../src/operations/migration/kb-sources.js";
import {
  captureIo,
  createGitWorkspace,
  isolateKibiEnv,
  removeTempDir,
  restoreWorkspaceCwd,
} from "../../helpers/in-process-workspace.js";
import {
  writeDriftedRequirement,
  writeManifest,
} from "../../helpers/schema6-fixture.js";

// implements REQ-kb-entity-body-context

const roots: string[] = [];
const restores: Array<() => void> = [];

afterEach(() => {
  for (const restore of restores.splice(0)) restore();
  restoreWorkspaceCwd();
  for (const root of roots.splice(0)) removeTempDir(root);
});

const LANES = ["requirements", "scenarios", "tests", "adr", "facts"] as const;

function write(root: string, relative: string, content: string): void {
  const absolute = path.join(root, relative);
  mkdirSync(path.dirname(absolute), { recursive: true });
  writeFileSync(absolute, content, "utf8");
}

function doc(front: string, body: string): string {
  return `---\n${front}---\n${body}`;
}

/** Every authored entity file in the context lanes, by relative path. */
function snapshot(root: string): Map<string, string> {
  const files = new Map<string, string>();
  for (const lane of LANES) {
    const directory = path.join(root, ".kb", lane);
    let names: string[] = [];
    try {
      names = readdirSync(directory);
    } catch {
      continue;
    }
    for (const name of names.filter((entry) => entry.endsWith(".md"))) {
      files.set(
        `.kb/${lane}/${name}`,
        readFileSync(path.join(directory, name), "utf8"),
      );
    }
  }
  return files;
}

function bodyOf(content: string): string {
  const slice = sliceFrontmatter(content);
  if (slice === null) throw new Error("fixture has no front matter");
  return slice.suffix.slice(slice.suffix.indexOf("\n") + 1);
}

function frontmatterOf(content: string): Record<string, unknown> {
  const slice = sliceFrontmatter(content);
  return loadYaml(slice?.text ?? "") as Record<string, unknown>;
}

const SECTIONED =
  "\nThe exporter must sign every file.\n\n## Context\n\nSecurity asked for this after an audit found unsigned exports in two regions.\n\n## Source\n\n> Sign every export.\n\nSource: audit - AUD-7\n\n### Notes\n\n- one\n- two\n\n  \n\ttrailing tabs\t\n";

/**
 * A schema 5 KB with multi-section bodies in every context lane, shaped so
 * the schema 6 (origin, superseded closure, source repair, inventory
 * re-derivation), schema 7 (polarity encoding) and schema 8 (semantic_text
 * pin, context tag) migration actions all have work to do.
 */
function writeFixture(root: string): void {
  writeManifest(root, 5);
  write(
    root,
    ".kb/requirements/REQ-sections.md",
    doc("id: REQ-sections\ntitle: Signed exports\nstatus: open\n", SECTIONED),
  );
  write(
    root,
    ".kb/requirements/REQ-pinned.md",
    doc(
      "id: REQ-pinned\ntitle: Pinned\nstatus: open\nsemantic_text: Pinned meaning.\n",
      SECTIONED,
    ),
  );
  write(
    root,
    ".kb/requirements/REQ-old.md",
    doc("id: REQ-old\ntitle: Old\nstatus: open\n", SECTIONED),
  );
  write(
    root,
    ".kb/requirements/REQ-new.md",
    doc(
      "id: REQ-new\ntitle: New\nstatus: open\nlinks:\n  - type: supersedes\n    target: REQ-old\n",
      SECTIONED,
    ),
  );
  write(
    root,
    ".kb/scenarios/SCEN-thin.md",
    doc(
      "id: SCEN-thin\ntitle: Thin\nstatus: draft\n",
      "\nGiven a file\n\n## Then\n\nIt is signed.\n",
    ),
  );
  write(
    root,
    ".kb/tests/TEST-thin.md",
    doc("id: TEST-thin\ntitle: Thin test\nstatus: pending\n", SECTIONED),
  );
  write(
    root,
    ".kb/adr/ADR-sections.md",
    doc(
      "id: ADR-sections\ntitle: Sections\nstatus: accepted\nsource: documentation/adr/ADR-sections.md\n",
      SECTIONED,
    ),
  );
  write(
    root,
    ".kb/facts/FACT-obs.md",
    doc(
      "id: FACT-obs\ntitle: Obs\ntype: fact\nstatus: active\nfact_kind: observation\n",
      SECTIONED,
    ),
  );
  write(
    root,
    ".kb/facts/FACT-polarity.md",
    doc(
      "id: FACT-polarity\ntitle: Polarity\ntype: fact\nstatus: active\nfact_kind: property_value\nsubject_key: exports\nproperty_key: signed\npolarity: require\n",
      SECTIONED,
    ),
  );
  writeDriftedRequirement(root, "REQ-drift", 0);
}

describe("migrations never touch entity bodies", () => {
  test("schema 6, 7 and 8 actions over multi-section bodies leave every body byte-identical", async () => {
    restores.push(isolateKibiEnv());
    const root = createGitWorkspace();
    roots.push(root);
    writeFixture(root);
    const before = snapshot(root);
    const io = captureIo();
    restores.push(io.restore);

    const result = await migrateCommand({ yes: true, workspaceRoot: root });
    expect(result.exitCode).toBe(0);
    expect(io.logText()).toContain("Migrated the KB");

    const after = snapshot(root);
    expect([...after.keys()].sort()).toEqual([...before.keys()].sort());
    for (const [file, content] of before) {
      expect(bodyOf(after.get(file) ?? ""), `${file} body`).toBe(
        bodyOf(content),
      );
    }

    // The actions of every schema step ran: the preservation claim is not
    // vacuous.
    const changed = [...before.keys()].filter(
      (file) => before.get(file) !== after.get(file),
    );
    expect(changed.length).toBeGreaterThanOrEqual(8);
    const front = (file: string) => frontmatterOf(after.get(file) ?? "");
    expect(front(".kb/requirements/REQ-old.md").status).toBe("closed");
    expect(front(".kb/facts/FACT-polarity.md")).toMatchObject({
      operator: "eq",
      value_bool: true,
    });
    expect(front(".kb/requirements/REQ-sections.md").semantic_text).toBe(
      legacyRequirementSemanticText(
        bodyOf(before.get(".kb/requirements/REQ-sections.md") ?? ""),
      ),
    );
    expect(front(".kb/requirements/REQ-pinned.md").semantic_text).toBe(
      "Pinned meaning.",
    );
    expect(front(".kb/scenarios/SCEN-thin.md").tags).toEqual([
      "review:context-missing",
    ]);
    expect(front(".kb/requirements/REQ-sections.md").tags).toBeUndefined();
    expect(front(".kb/adr/ADR-sections.md").source).toBeUndefined();

    // Idempotent: a second run changes nothing.
    const settled = snapshot(root);
    const again = await migrateCommand({ yes: true, workspaceRoot: root });
    expect(again.exitCode).toBe(0);
    expect(io.logText()).toContain("No migration needed");
    expect(snapshot(root)).toEqual(settled);
  });

  test("a dry run reports the schema 8 counts and writes nothing", async () => {
    restores.push(isolateKibiEnv());
    const root = createGitWorkspace();
    roots.push(root);
    writeFixture(root);
    const before = snapshot(root);
    const io = captureIo();
    restores.push(io.restore);

    const result = await migrateCommand({ dryRun: true, workspaceRoot: root });
    expect(result.exitCode).toBe(0);
    expect(io.logText()).toMatch(
      /would pin semantic_text on \d+ requirement\(s\) that lack it/,
    );
    expect(io.logText()).toMatch(
      /would tag \d+ current entit\(ies\) without body context review:context-missing \(.*scenario.*\)/,
    );
    expect(snapshot(root)).toEqual(before);
  });
});
