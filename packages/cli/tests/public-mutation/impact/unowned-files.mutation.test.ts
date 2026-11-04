import { afterEach, describe, expect, test } from "bun:test";
import {
  mkdirSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createUnownedFileDiagnostics,
  pathTopicWords,
  rankRequirementCandidates,
} from "../../../src/public/impact/unowned-files.js";

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

const LAYOUT =
  "src app apps lib libs source page pages component components view views screen screens package packages main index shared common core util utils helper helpers public static asset assets web client server frontend backend module modules feature features internal service services test tests spec specs dist build html htm tsx jsx mjs cjs vue svelte css scss less json yaml yml java swift php";
const FILLER =
  "the and for with must should shall may can are its their that this from into when each every all not req auto";

describe("pathTopicWords", () => {
  test("drops every layout and filler word", () => {
    expect(pathTopicWords(LAYOUT.split(" ").join("/"))).toStrictEqual([]);
    expect(pathTopicWords(FILLER.split(" ").join("-"))).toStrictEqual([]);
  });

  test("keeps topic words split from paths, camel case and extensions", () => {
    expect(
      pathTopicWords("src/app/pages/coach-dashboard/coach-dashboard.html"),
    ).toStrictEqual(["coach", "dashboard"]);
    expect(pathTopicWords("lib\\UploadQueue2Retry.ts")).toStrictEqual([
      "upload",
      "retry",
    ]);
  });

  test("filters short words, digits and stems plurals", () => {
    expect(
      pathTopicWords("ab/abc/v2x/dogs/boxes/glass/bus/tools"),
    ).toStrictEqual(["abc", "dogs", "boxe", "glass", "bus", "tool"]);
  });

  test("handles empty paths", () => {
    expect(pathTopicWords("")).toStrictEqual([]);
    expect(pathTopicWords("/")).toStrictEqual([]);
  });
});

describe("rankRequirementCandidates", () => {
  const req = (id: string, title: string, status?: string) =>
    status === undefined ? { id, title } : { id, title, status };

  test("ranks by shared words, then uses, then id", () => {
    const ranked = rankRequirementCandidates("src/upload/retry-queue.ts", [
      req("REQ-d", "Retry"),
      req("REQ-c", "Upload retry retry"),
      req("REQ-b", "Upload retry"),
      req("REQ-a", "Upload retry"),
      req("REQ-e", "Unrelated"),
      req("REQ-f", "Upload retry queue", "superseded"),
    ]);
    expect(ranked.map((r) => r.id)).toStrictEqual(["REQ-c", "REQ-a", "REQ-b"]);
    expect(
      rankRequirementCandidates(
        "upload-retry",
        [
          req("REQ-b", "Upload"),
          req("REQ-a", "Retry"),
          req("REQ-c", "Upload retry"),
        ],
        10,
      ).map((r) => r.id),
    ).toStrictEqual(["REQ-c", "REQ-a", "REQ-b"]);
  });

  test.each([
    "superseded",
    "Deprecated",
    "rejected",
    "obsolete",
    "retired",
    "archived",
    "removed",
  ])("skips a %s requirement", (status) => {
    expect(
      rankRequirementCandidates("upload.ts", [req("REQ-a", "Upload", status)]),
    ).toStrictEqual([]);
  });

  test("keeps open and status-less requirements", () => {
    expect(
      rankRequirementCandidates("upload.ts", [
        req("REQ-a", "Upload", "open"),
        req("REQ-b", "Upload"),
      ]),
    ).toStrictEqual([req("REQ-a", "Upload", "open"), req("REQ-b", "Upload")]);
  });

  test("leaves out titles that share no topic word", () => {
    expect(
      rankRequirementCandidates(
        "upload.ts",
        [req("REQ-a", "Many unrelated words here"), req("REQ-b", "Upload")],
        10,
      ),
    ).toStrictEqual([req("REQ-b", "Upload")]);
  });

  test("returns nothing for a path without topic words", () => {
    expect(
      rankRequirementCandidates("src/index.ts", [req("REQ-a", "Index src")]),
    ).toStrictEqual([]);
  });
});

function workspace(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), "kibi-unowned-"));
  roots.push(root);
  for (const [file, content] of Object.entries(files)) {
    mkdirSync(join(root, file, ".."), { recursive: true });
    writeFileSync(join(root, file), content);
  }
  return root;
}

const RECORD =
  "If none does and the change adds behavior, record a requirement with a scenario and link it with implements as part of this change; if behavior is unchanged, say so in the final report.";
const LEAD = (file: string) =>
  `No symbol in ${file} is linked to a requirement, so this check finds no owner for it; that does not mean no recorded rule covers the behavior it implements.`;

describe("createUnownedFileDiagnostics", () => {
  test("names candidate requirements read from their frontmatter", () => {
    const longTitle = `Upload ${"x".repeat(120)}`;
    const root = workspace({
      ".kb/requirements/REQ-a.md":
        '---\nid: REQ-a\ntitle: "Upload retries"\nstatus: open\n---\nBody\n',
      ".kb/requirements/REQ-b.md": `---\r\nid: 'REQ-b'\r\ntitle: ${longTitle}\r\n---\r\n`,
      ".kb/requirements/REQ-c.md":
        "---\nid: REQ-c\ntitle: Upload old\nstatus: retired\n---\n",
      ".kb/requirements/REQ-d.md": "---\nid: REQ-d\n---\ntitle: Upload\n",
      ".kb/requirements/REQ-e.md": "no frontmatter\ntitle: Upload\n",
      ".kb/requirements/REQ-f.md": "---\ntitle: Upload no id\n---\n",
      ".kb/requirements/REQ-g.md": `---\nid: REQ-g\n${"#".repeat(5000)}\ntitle: Upload late\n---\n`,
      ".kb/requirements/REQ-h.md":
        "---\nid: REQ-h\ntitle: Upload\nstatus: ''\n---\n",
      ".kb/requirements/notes.txt": "---\nid: REQ-0\ntitle: Upload\n---\n",
      ".kb/requirements/REQ-i.md": "intro\nid: REQ-0i\ntitle: Upload\n",
      ".kb/requirements/REQ-j.md": "---\nid: REQ-0j\n---  \ntitle: Upload\n",
    });
    mkdirSync(join(root, ".kb", "requirements", "dir.md"));
    const diagnostics = createUnownedFileDiagnostics({
      workspaceRoot: root,
      requestedFiles: ["src/upload.ts", "src/upload.ts"],
      linkedSourceFiles: new Set(),
    });
    const truncated = `${longTitle.slice(0, 99)}…`;
    expect(diagnostics).toStrictEqual([
      {
        id: "source_file_unowned",
        severity: "info",
        blocking: false,
        category: "requirement",
        files: ["src/upload.ts"],
        docs: ["docs/symbol-traceability-taxonomy.md"],
        message: `${LEAD("src/upload.ts")} Requirements whose titles share its path words: REQ-a (Upload retries); REQ-b (${truncated}); REQ-h (Upload).`,
        suggestion: `kb_query each candidate to see whether it describes the changed behavior; when one does, link the symbol that implements it (for markup, the component that renders it) with implements and name the requirement in the final report. ${RECORD}`,
        evidence: {
          candidates: [
            { id: "REQ-a", title: "Upload retries" },
            { id: "REQ-b", title: longTitle },
            { id: "REQ-h", title: "Upload" },
          ],
        },
      },
    ]);
  });

  test("reads trimmed, unquoted frontmatter values", () => {
    const root = workspace({
      ".kb/requirements/REQ-a.md":
        '--- \nid:REQ-a\ntitle: "Upload one" \nsubtitle: Zzz\n---\n',
      ".kb/requirements/REQ-b.md": '---\nid: REQ-b\ntitle: Upload "two"\n---\n',
      ".kb/requirements/REQ-c.md":
        '---\nid: REQ-c\ntitle: "Upload" three\n---\n',
    });
    const [diagnostic] = createUnownedFileDiagnostics({
      workspaceRoot: root,
      requestedFiles: ["upload.ts"],
      linkedSourceFiles: new Set(),
    });
    expect(diagnostic?.evidence).toStrictEqual({
      candidates: [
        { id: "REQ-a", title: "Upload one" },
        { id: "REQ-b", title: 'Upload "two"' },
        { id: "REQ-c", title: '"Upload" three' },
      ],
    });
  });

  test("closes every requirement file it opens", () => {
    const files: Record<string, string> = {};
    for (let index = 0; index < 20; index += 1)
      files[`.kb/requirements/REQ-${index}.md`] =
        `---\nid: REQ-${index}\ntitle: Upload\n---\n`;
    const root = workspace(files);
    const before = readdirSync("/proc/self/fd").length;
    createUnownedFileDiagnostics({
      workspaceRoot: root,
      requestedFiles: ["upload.ts"],
      linkedSourceFiles: new Set(),
    });
    expect(readdirSync("/proc/self/fd").length).toBeLessThan(before + 5);
  });

  test("keeps a title of exactly 100 characters", () => {
    const title = `Upload ${"y".repeat(93)}`;
    const root = workspace({
      ".kb/requirements/REQ-a.md": `---\nid: REQ-a\ntitle: ${title}\n---\n`,
    });
    const [diagnostic] = createUnownedFileDiagnostics({
      workspaceRoot: root,
      requestedFiles: ["upload.ts"],
      linkedSourceFiles: new Set(),
    });
    expect(diagnostic?.message).toBe(
      `${LEAD("upload.ts")} Requirements whose titles share its path words: REQ-a (${title}).`,
    );
  });

  test("points to kb_search without candidates", () => {
    const [diagnostic] = createUnownedFileDiagnostics({
      workspaceRoot: workspace({}),
      requestedFiles: ['src/"odd".ts'],
      linkedSourceFiles: new Set(),
    });
    expect(diagnostic?.message).toBe(LEAD('src/"odd".ts'));
    expect(diagnostic?.suggestion).toBe(
      `kb_search({query:"<the behavior>", sourceLocations:[{path:"src/\\"odd\\".ts"}]}) for a requirement that already describes it. ${RECORD}`,
    );
    expect(diagnostic?.evidence).toStrictEqual({ candidates: [] });
  });

  test("skips linked, knowledge and prose files", () => {
    expect(
      createUnownedFileDiagnostics({
        workspaceRoot: "/nonexistent-kibi-root",
        requestedFiles: [
          "src/a.ts",
          ".kb/config.json",
          ".kb/requirements/REQ-a.md",
          "docs/guide.md",
          "docs/page.MDX",
        ],
        linkedSourceFiles: new Set(["src/a.ts"]),
      }),
    ).toStrictEqual([]);
    expect(
      createUnownedFileDiagnostics({
        workspaceRoot: "/nonexistent-kibi-root",
        requestedFiles: ["docs/a.mdx.ts", "x.kb/a.ts"],
        linkedSourceFiles: new Set(),
      }).map((d) => d.files),
    ).toStrictEqual([["docs/a.mdx.ts"], ["x.kb/a.ts"]]);
  });
});
