import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { execFileSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import * as kbSources from "../../../src/operations/migration/kb-sources.js";
import {
  DECISION_FIRMNESS_RULES,
  DECISION_FIRM_EDITED_RULE,
  DECISION_FIRM_SUPERSEDED_RULE,
  DECISION_FIRM_UNREFERENCED_RULE,
  SUPERSEDES_REASON_ACKNOWLEDGED_RULE,
  SUPERSEDES_REASON_MISSING_RULE,
  authoredSupersedes,
  collectDecisionFirmnessViolations,
  evaluateDecisionFirmness,
  evaluateFirmDecisionEdits,
  implicitFirmSupersedes,
  listDecisionEntities,
  supersedeAcknowledgements,
} from "../../../src/public/operations/decision-firmness.js";
import {
  type AuthoredEntity,
  readAuthoredEntity,
} from "../../../src/public/operations/entity-context.js";
import { expectGolden } from "../helpers/golden.js";

const roots: string[] = [];
const spies: { mockRestore: () => void }[] = [];
afterEach(() => {
  for (const spy of spies.splice(0)) spy.mockRestore();
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

function workspace(files: Record<string, string>, withGit = false) {
  const root = realpathSync(mkdtempSync(join(tmpdir(), "kibi-firmness-")));
  roots.push(root);
  const write = (more: Record<string, string>) => {
    for (const [file, content] of Object.entries(more)) {
      mkdirSync(dirname(join(root, file)), { recursive: true });
      writeFileSync(join(root, file), content);
    }
  };
  const git = (...args: string[]) =>
    execFileSync("git", args, { cwd: root, stdio: "pipe" });
  write(files);
  if (withGit) {
    git("init", "-q");
    git("config", "user.name", "Kibi test");
    git("config", "user.email", "kibi-test@example.invalid");
    git("config", "commit.gpgsign", "false");
    git("add", ".");
    git("commit", "-q", "-m", "baseline");
  }
  return { root, write, git };
}

const entity = (
  id: string,
  data: Record<string, unknown> = {},
  body = "Statement.\n",
  type = id.startsWith("ADR") ? "adr" : "req",
): AuthoredEntity => ({
  id,
  type,
  path: `.kb/${type === "adr" ? "adr" : "requirements"}/${id}.md`,
  data: { status: "open", ...data },
  body,
});

const edgesOf = (pairs: Record<string, string[]>) =>
  new Map(Object.entries(pairs).map(([from, to]) => [from, new Set(to)]));

const FIRM = { firmness: "firm", origin: { kind: "human", ref: "msg-1" } };
const AGENT = { origin: { kind: "agent" } };
const WHY =
  "Statement.\n\n## Why this changed\n\nThe load test failed at two hundred requests per second last week.\n";

const doc = (frontmatter: string, body = "Statement.\n") =>
  `---\n${frontmatter}---\n${body}`;

describe("rule names", () => {
  test("are the published identifiers", () => {
    expect(DECISION_FIRMNESS_RULES).toEqual([
      "decision-firm-unreferenced",
      "decision-firm-superseded",
      "decision-firm-edited",
      "supersedes-reason-missing",
      "supersedes-reason-acknowledged",
    ]);
  });
});

describe("authored decisions", () => {
  test("lists requirements and ADRs and their supersedes", () => {
    const { root } = workspace({
      ".kb/requirements/REQ-a.md": doc(
        "id: REQ-a\nlinks:\n  - null\n  - REQ-text\n  - type: supersedes\n    target: 5\n  - type: relates_to\n    target: REQ-x\n  - type: supersedes\n    target: REQ-b\n",
      ),
      ".kb/requirements/REQ-b.md": doc("id: REQ-b\nlinks: REQ-z\n"),
      ".kb/requirements/SCEN-x.md": doc("id: SCEN-x\ntype: scenario\n"),
      ".kb/requirements/plain.md": "no front matter\n",
      ".kb/adr/ADR-1.md": doc("id: ADR-1\n"),
      ".kb/relationships/a.yaml": [
        "relationships:",
        ...[
          ["supersedes", "ADR-1", "REQ-c"],
          ["relates_to", "ADR-1", "REQ-d"],
          ["supersedes", "REQ-ghost", "REQ-e"],
        ].flatMap(([type, from, to], index) => [
          `  - id: r${index}`,
          `    type: ${type}`,
          `    from: ${from}`,
          `    to: ${to}`,
          `    created_at: "2026-01-01T00:00:00Z"`,
          "    created_by: test",
          "    source: test",
        ]),
        "",
      ].join("\n"),
    });
    const listed = listDecisionEntities(root);
    expect(listed.map((row) => `${row.id} ${row.type}`)).toEqual([
      "REQ-a req",
      "REQ-b req",
      "ADR-1 adr",
    ]);
    expect(
      [...authoredSupersedes(root, listed)].map(([from, to]) => [
        from,
        [...to],
      ]),
    ).toEqual([
      ["REQ-a", ["REQ-b"]],
      ["ADR-1", ["REQ-c"]],
    ]);
    writeFileSync(join(root, ".kb/relationships/a.yaml"), "other: 1\n");
    expect([...authoredSupersedes(root, listed).keys()]).toEqual(["REQ-a"]);
  });

  test("skips a document that cannot be read", () => {
    const { root } = workspace({
      ".kb/requirements/REQ-a.md": doc("id: REQ-a\n"),
      ".kb/requirements/REQ-b.md": doc("id: REQ-b\n"),
    });
    const real = kbSources.readText;
    spies.push(
      spyOn(kbSources, "readText").mockImplementation((file: string) =>
        file.endsWith("REQ-a.md") ? null : real(file),
      ),
    );
    expect(listDecisionEntities(root).map((row) => row.id)).toEqual(["REQ-b"]);
  });
});

describe("supersede acknowledgements", () => {
  test("names each edge in order", () => {
    const edges = edgesOf({ "REQ-a": ["REQ-z", "REQ-b"] });
    expect(supersedeAcknowledgements("REQ-a", edges)).toEqual([
      "REQ-a -> REQ-b",
      "REQ-a -> REQ-z",
    ]);
    expect(supersedeAcknowledgements("REQ-none", edges)).toEqual([]);
  });

  test("finds supersedes of decisions firm only by origin", () => {
    const entities = [
      entity("REQ-src-2", AGENT),
      entity("REQ-src", AGENT),
      entity("REQ-firm-src", FIRM),
      entity("REQ-implicit", { origin: { kind: "human" } }),
      entity("REQ-explicit", FIRM),
      entity("REQ-agent", AGENT),
    ];
    expect(
      implicitFirmSupersedes(
        entities,
        edgesOf({
          "REQ-src-2": ["REQ-implicit"],
          "REQ-src": [
            "REQ-explicit",
            "REQ-agent",
            "REQ-unknown",
            "REQ-implicit",
          ],
          "REQ-firm-src": ["REQ-implicit"],
          "REQ-ghost": ["REQ-implicit"],
        }),
      ),
    ).toEqual(["REQ-src -> REQ-implicit", "REQ-src-2 -> REQ-implicit"]);
  });
});

describe("evaluateDecisionFirmness", () => {
  const entities = [
    entity("REQ-firm-noref", { firmness: "firm" }),
    entity("ADR-firm-noref", { firmness: "firm" }),
    entity("REQ-firm-ref", FIRM),
    entity("REQ-implicit", { origin: { kind: "human" } }),
    entity("REQ-implicit-acked", { origin: { kind: "human" } }),
    entity("REQ-agent", AGENT),
    entity("REQ-two", AGENT),
    entity("REQ-mixed", AGENT),
    entity("REQ-one", AGENT),
    entity("REQ-acked", AGENT),
    entity("REQ-retired", { ...AGENT, status: "deprecated" }),
    entity("REQ-old-firm", FIRM),
    entity("REQ-explained", AGENT, WHY),
    entity("REQ-firm-sup", FIRM, WHY),
    entity("REQ-old-firm-2", FIRM),
  ];
  const edges = edgesOf({
    "REQ-two": ["REQ-implicit", "REQ-firm-ref"],
    "REQ-mixed": ["REQ-unknown", "REQ-agent"],
    "REQ-one": ["REQ-firm-ref"],
    "REQ-acked": ["REQ-implicit-acked"],
    "REQ-retired": ["REQ-old-firm"],
    "REQ-explained": ["REQ-agent"],
    "REQ-firm-sup": ["REQ-old-firm-2"],
  });
  const acknowledged = new Set([
    "REQ-acked -> REQ-implicit-acked",
    "REQ-mixed -> REQ-agent",
  ]);
  const firmSupersedeAcknowledged = new Set([
    "REQ-acked -> REQ-implicit-acked",
  ]);

  test("reports every firmness rule", () => {
    expectGolden(
      "decision-firmness-findings",
      evaluateDecisionFirmness(entities, edges, undefined, acknowledged, {
        schemaVersion: 8,
        firmSupersedeAcknowledged,
      }),
    );
  });

  test("adds the upgrade notes only to an older schema", () => {
    const suggestions = (schemaVersion: number | null) =>
      evaluateDecisionFirmness(entities, edges, undefined, acknowledged, {
        schemaVersion,
        firmSupersedeAcknowledged,
      }).map((row) => `${row.rule} ${row.entityId} ${row.suggestion}`);
    const notes = (schemaVersion: number | null) =>
      suggestions(schemaVersion).filter((row) =>
        row.includes("kibi migrate --yes"),
      ).length;
    expect([notes(8), notes(9), notes(10), notes(null)]).toEqual([4, 1, 0, 0]);
    expect(
      suggestions(10).find((row) =>
        row.startsWith("supersedes-reason-missing REQ-one "),
      ),
    ).toEndWith("propose it instead of superseding.");
    expect(
      evaluateDecisionFirmness(entities, edges).map(
        (row) => `${row.rule} ${row.entityId}`,
      ),
    ).toContain("decision-firm-superseded REQ-acked");
  });

  test("keeps to the selected rules", () => {
    const only = (rule: string) =>
      evaluateDecisionFirmness(entities, edges, new Set([rule]), acknowledged)
        .map((row) => row.rule)
        .every((name) => name === rule);
    for (const rule of DECISION_FIRMNESS_RULES) expect(only(rule)).toBe(true);
  });

  test("counts acknowledged supersedes and lists at most 25", () => {
    const many = Array.from({ length: 26 }, (_, index) =>
      entity(`REQ-${String(index).padStart(2, "0")}`, AGENT),
    );
    const manyEdges = edgesOf(
      Object.fromEntries(many.map((row) => [row.id, ["REQ-target"]])),
    );
    const acked = new Set(many.map((row) => `${row.id} -> REQ-target`));
    const [summary] = evaluateDecisionFirmness(
      many,
      manyEdges,
      new Set([SUPERSEDES_REASON_ACKNOWLEDGED_RULE]),
      acked,
    );
    expectGolden("decision-firmness-acknowledged", summary);
  });
});

describe("evaluateFirmDecisionEdits", () => {
  test("reports firm claims changed since HEAD", () => {
    const firmDoc = (id: string, body: string, type = "req") =>
      doc(
        `id: ${id}\ntitle: ${id} title\ntype: ${type}\nfirmness: firm\norigin:\n  kind: human\n  ref: msg-1\n`,
        body,
      );
    const edited = (id: string, extra: Record<string, unknown> = {}) =>
      entity(id, { ...FIRM, title: `${id} title`, ...extra }, "New claim.\n");
    const renamed = edited("REQ-z", { title: "Renamed" });
    const committed: Record<string, string | null> = {
      ".kb/requirements/REQ-z.md": firmDoc("REQ-z", "Old claim.\n"),
      ".kb/requirements/REQ-a.md": firmDoc("REQ-a", "Old claim.\n"),
      ".kb/requirements/REQ-old.md": firmDoc("REQ-old", "Old claim.\n"),
      ".kb/requirements/REQ-new.md": null,
      ".kb/requirements/REQ-broken.md": "no front matter\n",
      ".kb/requirements/REQ-retyped.md": firmDoc(
        "REQ-retyped",
        "Old.\n",
        "adr",
      ),
      ".kb/requirements/REQ-same.md": firmDoc("REQ-same", "New claim.\n"),
      ".kb/requirements/REQ-unchanged.md": firmDoc("REQ-unchanged", "Old.\n"),
    };
    const entities = [
      renamed,
      edited("REQ-a"),
      edited("REQ-old"),
      edited("REQ-new"),
      edited("REQ-broken"),
      edited("REQ-retyped"),
      edited("REQ-same"),
      edited("REQ-unchanged"),
    ];
    const changed = new Set(
      entities
        .filter((row) => row.id !== "REQ-unchanged")
        .map((row) => row.path),
    );
    const findings = evaluateFirmDecisionEdits(
      entities,
      edgesOf({ "REQ-other": ["REQ-old"] }),
      changed,
      (file) => committed[file] ?? null,
    );
    expectGolden("decision-firmness-edits", findings);
    expect(
      readAuthoredEntity(committed[".kb/requirements/REQ-a.md"] as string, "x")
        ?.type,
    ).toBe("req");
  });
});

describe("collectDecisionFirmnessViolations", () => {
  const manifest = JSON.stringify({
    manifestVersion: 1,
    schemaVersion: 10,
    semanticAdvisorBackfill: "not_applicable",
    supersedesReasonAcknowledged: ["REQ-agent -> REQ-human"],
    firmSupersedeAcknowledged: ["REQ-agent -> REQ-human"],
  });
  const files = {
    ".kb/manifest.json": manifest,
    ".kb/requirements/REQ-firm.md": doc(
      "id: REQ-firm\ntitle: Firm\nstatus: open\nfirmness: firm\norigin:\n  kind: human\n  ref: msg-1\n",
      "Exports keep their names.\n",
    ),
    ".kb/requirements/REQ-human.md": doc(
      "id: REQ-human\ntitle: Human\nstatus: open\norigin:\n  kind: human\n",
    ),
    ".kb/requirements/REQ-with-a-rather-long-file-name-for-the-diff.md": doc(
      "id: REQ-long\ntitle: Long\nstatus: open\nfirmness: firm\norigin:\n  kind: human\n  ref: msg-3\n",
      "Long names stay.\n",
    ),
    ".kb/requirements/REQ-agent.md": doc(
      "id: REQ-agent\ntitle: Agent\nstatus: open\norigin:\n  kind: agent\nlinks:\n  - type: supersedes\n    target: REQ-human\n",
    ),
  };
  const rulesOf = (rules: readonly string[], root: string) =>
    collectDecisionFirmnessViolations(new Set(rules), root).map(
      (row) => `${row.rule} ${row.entityId}`,
    );

  test("does nothing without a firmness rule", () => {
    const { root } = workspace(files);
    const list = spyOn(kbSources, "listLaneMarkdownFiles");
    spies.push(list);
    expect(rulesOf(["other"], root)).toEqual([]);
    expect(list).not.toHaveBeenCalled();
  });

  test("reads the manifest acknowledgements and the edits since HEAD", () => {
    const { root, write, git } = workspace(files, true);
    write({
      ".kb/requirements/REQ-firm.md": doc(
        "id: REQ-firm\ntitle: Firm\nstatus: open\nfirmness: firm\norigin:\n  kind: human\n  ref: msg-1\n",
        "Exports drop their names.\n",
      ),
      ".kb/requirements/REQ-with-a-rather-long-file-name-for-the-diff.md": doc(
        "id: REQ-long\ntitle: Long\nstatus: open\nfirmness: firm\norigin:\n  kind: human\n  ref: msg-4\n",
        "Long names change.\n",
      ),
      ".kb/requirements/REQ-new.md": doc(
        "id: REQ-new\ntitle: New\nstatus: open\nfirmness: firm\norigin:\n  kind: human\n  ref: msg-2\n",
      ),
    });
    git("add", ".kb/requirements/REQ-new.md");
    expect(rulesOf(DECISION_FIRMNESS_RULES, root)).toEqual([
      "decision-firm-edited REQ-firm",
      "supersedes-reason-acknowledged workspace",
    ]);
    expect(
      rulesOf(
        [DECISION_FIRM_SUPERSEDED_RULE, SUPERSEDES_REASON_MISSING_RULE],
        root,
      ),
    ).toEqual([]);
    expect(rulesOf([DECISION_FIRM_UNREFERENCED_RULE], root)).toEqual([]);
    expect(rulesOf([DECISION_FIRM_EDITED_RULE], root)).toEqual([
      "decision-firm-edited REQ-firm",
    ]);
  });

  test("judges no edit outside a work tree", () => {
    const { root } = workspace({
      ...files,
      ".kb/manifest.json": "{}",
    });
    expect(rulesOf([DECISION_FIRM_EDITED_RULE], root)).toEqual([]);
    expect(rulesOf(DECISION_FIRMNESS_RULES, root)).toEqual([
      "decision-firm-superseded REQ-agent",
      "supersedes-reason-missing REQ-agent",
    ]);
    const older = workspace({
      ...files,
      ".kb/manifest.json": JSON.stringify({
        manifestVersion: 1,
        schemaVersion: 8,
        semanticAdvisorBackfill: "not_applicable",
      }),
    });
    expect(
      collectDecisionFirmnessViolations(
        new Set([SUPERSEDES_REASON_MISSING_RULE]),
        older.root,
      ).map((row) => row.suggestion?.includes("kibi migrate --yes")),
    ).toEqual([true]);
  });
});
