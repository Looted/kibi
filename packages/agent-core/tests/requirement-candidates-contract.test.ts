// implements REQ-kb-unowned-file-candidates, REQ-claude-request-topic-candidates
import { afterEach, describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  MAX_REQUIREMENT_CANDIDATES,
  pathTopicWords,
  rankRequirementCandidates,
  requestTopicWords,
  requirementCandidatesForPath,
} from "../src/requirement-candidates";

// The stop lists are part of the contract: each word must stay filtered.
const LAYOUT_WORDS = [
  "src",
  "app",
  "apps",
  "lib",
  "libs",
  "source",
  "page",
  "component",
  "view",
  "screen",
  "package",
  "main",
  "index",
  "shared",
  "common",
  "core",
  "util",
  "helper",
  "public",
  "static",
  "asset",
  "web",
  "client",
  "server",
  "frontend",
  "backend",
  "module",
  "feature",
  "internal",
  "service",
  "test",
  "spec",
  "dist",
  "build",
  "html",
  "htm",
  "tsx",
  "jsx",
  "mjs",
  "cjs",
  "vue",
  "svelte",
  "css",
  "scss",
  "less",
  "json",
  "yaml",
  "yml",
  "java",
  "swift",
  "php",
];
const FILLER_WORDS = [
  "the",
  "and",
  "for",
  "with",
  "must",
  "should",
  "shall",
  "may",
  "can",
  "are",
  "its",
  "their",
  "that",
  "this",
  "from",
  "into",
  "when",
  "each",
  "every",
  "all",
  "not",
  "req",
  "auto",
];
const REQUEST_FILLER_WORDS = [
  "please",
  "could",
  "would",
  "you",
  "your",
  "our",
  "have",
  "has",
  "make",
  "sure",
  "change",
  "update",
  "add",
  "fix",
  "now",
  "need",
  "want",
  "like",
  "also",
  "just",
  "then",
  "than",
  "there",
  "here",
  "what",
  "which",
  "why",
  "how",
  "will",
  "use",
  "using",
  "new",
  "file",
  "code",
  "never",
  "always",
  "only",
  "any",
  "but",
  "they",
  "them",
  "was",
  "were",
  "been",
  "being",
  "does",
  "don",
  "doesn",
  "let",
  "get",
  "set",
  "one",
  "out",
  "about",
  "over",
  "same",
  "still",
  "too",
  "very",
];

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

function requirementsDir(files: Record<string, string>): string {
  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), "kibi-candidates-contract-"),
  );
  roots.push(root);
  const directory = path.join(root, ".kb", "requirements");
  fs.mkdirSync(directory, { recursive: true });
  for (const [name, content] of Object.entries(files)) {
    fs.writeFileSync(path.join(directory, name), content);
  }
  return root;
}

const head = (id: string, title: string, status?: string) => ({
  id,
  title,
  ...(status !== undefined ? { status } : {}),
});

describe("topic words", () => {
  test("every layout and filler word is dropped from paths", () => {
    for (const word of [...LAYOUT_WORDS, ...FILLER_WORDS]) {
      expect([word, pathTopicWords(`${word}/x.${word}`)]).toEqual([word, []]);
    }
  });

  test("every filler word is dropped from requests", () => {
    for (const word of [...FILLER_WORDS, ...REQUEST_FILLER_WORDS]) {
      expect([word, requestTopicWords(word)]).toEqual([word, []]);
    }
  });

  test("words split on case, separators and digits, and lose plural s", () => {
    expect(pathTopicWords("billing/InvoiceLines/order-items.v2.tsx")).toEqual([
      "billing",
      "invoice",
      "line",
      "order",
      "item",
    ]);
    expect(pathTopicWords("a\\coaches\\class.ts")).toEqual(["coache", "class"]);
    expect(pathTopicWords("bus/gas/news/x1y.ts")).toEqual([
      "bus",
      "gas",
      "news",
    ]);
    expect(pathTopicWords("")).toEqual([]);
    expect(pathTopicWords("...")).toEqual([]);
    expect(requestTopicWords("Owners owners: keep the OWNER list")).toEqual([
      "owner",
      "keep",
      "list",
    ]);
  });

  test("request words are capped", () => {
    expect(requestTopicWords("alpha bravo charlie delta", 2)).toEqual([
      "alpha",
      "bravo",
    ]);
    const many = Array.from(
      { length: 45 },
      (_, i) =>
        String.fromCharCode(97 + (i % 26)).repeat(3) +
        String.fromCharCode(97 + Math.floor(i / 26)).repeat(2),
    ).join(" ");
    expect(requestTopicWords(many)).toHaveLength(40);
  });
});

describe("ranking", () => {
  test("nothing to match means no candidates", () => {
    expect(
      rankRequirementCandidates("src/index.ts", [head("a", "Index src")]),
    ).toEqual([]);
    expect(
      rankRequirementCandidates("src/index.ts", [head("a", "Coach inbox")], 3, [
        "coach",
        "inbox",
      ]),
    ).toEqual([head("a", "Coach inbox")]);
  });

  test("retired requirements are skipped; current ones stay", () => {
    const heads = [
      head("a", "Coach one", "superseded"),
      head("b", "Coach two", "deprecated"),
      head("c", "Coach three", "rejected"),
      head("d", "Coach four", "obsolete"),
      head("e", "Coach five", "retired"),
      head("f", "Coach six", "Archived"),
      head("g", "Coach seven", "removed"),
      head("h", "Coach eight", "active"),
      head("i", "Coach nine"),
    ];
    expect(
      rankRequirementCandidates("coach.ts", heads, 10).map((h) => h.id),
    ).toEqual(["h", "i"]);
  });

  test("request-only matches need two words", () => {
    const heads = [head("a", "Inbox lists"), head("b", "Inbox owner lists")];
    expect(
      rankRequirementCandidates("x.ts", heads, 3, ["inbox", "owner"]).map(
        (h) => h.id,
      ),
    ).toEqual(["b"]);
  });

  test("order: path words, then request words, then uses, then id", () => {
    const heads = [
      head("z", "Coach inbox"),
      head("b", "Dashboard inbox"),
      head("c", "Coach dashboard"),
      head("d", "Coach coach"),
      head("e", "Coach"),
    ];
    expect(
      rankRequirementCandidates("coach-dashboard.ts", heads, 10, [
        "coach",
        "inbox",
      ]).map((h) => h.id),
    ).toEqual(["c", "b", "z", "d", "e"]);
    expect(
      rankRequirementCandidates("coach-dashboard.ts", heads, 2).map(
        (h) => h.id,
      ),
    ).toEqual(["c", "d"]);
    // Request words add up with path words in the use count.
    expect(
      rankRequirementCandidates(
        "coach.ts",
        [head("a", "Coach alpha"), head("b", "Coach alpha alpha beta")],
        10,
        ["alpha", "beta"],
      ).map((h) => h.id),
    ).toEqual(["b", "a"]);
    expect(
      rankRequirementCandidates(
        "coach.ts",
        [head("a", "Coach alpha beta"), head("b", "Coach alpha alpha beta")],
        10,
        ["alpha", "beta"],
      ).map((h) => h.id),
    ).toEqual(["b", "a"]);
    expect(
      rankRequirementCandidates(
        "coach.ts",
        [head("a", "Coach coach alpha beta"), head("b", "Coach alpha beta")],
        10,
        ["alpha", "beta"],
      ).map((h) => h.id),
    ).toEqual(["a", "b"]);
    expect(MAX_REQUIREMENT_CANDIDATES).toBe(3);
    expect(
      rankRequirementCandidates(
        "coach.ts",
        ["a", "b", "c", "d"].map((id) => head(id, "Coach")),
      ),
    ).toHaveLength(3);
  });
});

describe("reading requirement documents", () => {
  test("front matter fields are read, unquoted and trimmed", () => {
    const root = requirementsDir({
      "a.md": '---\nid: REQ-a\ntitle: "Coach inbox"  \nstatus: active\n---\n',
      "b.md":
        "--- \r\nid:REQ-b\r\ntitle: 'Coach list'\r\n---  \r\ntitle: ignored\n",
      "c.md": '---\nid: REQ-c\ntitle: x "Coach"\n---\n',
      "d.md": '---\nid: REQ-d\ntitle: "Coach" tail\n---\n',
      "e.md": "---\nid: REQ-e\ntitle: \"Coach x'\n---\n",
      "f.md": '---\nid: REQ-f\ntitle: ""\n---\n',
      "g.md": "---\nid: REQ-g\ntitle: kcoachk\nxtitle: Coach\n---\n",
      "h.md": "---\nid: REQ-h\ntitle: Coach\n",
    });
    expect(requirementCandidatesForPath(root, "coach.ts", 10)).toStrictEqual([
      { id: "REQ-a", title: "Coach inbox", status: "active" },
      { id: "REQ-b", title: "Coach list" },
      { id: "REQ-c", title: 'x "Coach"' },
      { id: "REQ-d", title: '"Coach" tail' },
      { id: "REQ-e", title: "\"Coach x'" },
      { id: "REQ-h", title: "Coach" },
    ]);
  });

  test("documents without front matter, id or title are skipped", () => {
    const root = requirementsDir({
      "a.md": "x\nid: REQ-a\ntitle: Coach\n",
      "b.md": "---\ntitle: Coach\n---\n",
      "c.md": "---\nid: REQ-c\n---\ntitle: Coach\n",
      "d.md": "---\nid: REQ-d\ntitle: Coach\n---\n",
      "e.txt": "---\nid: REQ-e\ntitle: Coach\n---\n",
    });
    fs.mkdirSync(path.join(root, ".kb", "requirements", "dir.md"));
    expect(requirementCandidatesForPath(root, "coach.ts", 10)).toStrictEqual([
      { id: "REQ-d", title: "Coach" },
    ]);
  });

  test("only the head of each document is read, and files are closed", () => {
    const root = requirementsDir({
      "a.md": `---\nid: REQ-a\n${"x: y\n".repeat(1000)}title: Coach\n---\n`,
      "b.md": "---\nid: REQ-b\ntitle: Coach\n---\n",
    });
    const before = fs.readdirSync("/proc/self/fd").length;
    for (let i = 0; i < 20; i++) requirementCandidatesForPath(root, "coach.ts");
    expect(fs.readdirSync("/proc/self/fd").length).toBeLessThanOrEqual(
      before + 2,
    );
    expect(requirementCandidatesForPath(root, "coach.ts")).toStrictEqual([
      { id: "REQ-b", title: "Coach" },
    ]);
  });

  test("a path without topic words needs two request words", () => {
    const root = requirementsDir({
      "a.md": "---\nid: REQ-a\ntitle: Coach inbox\n---\n",
    });
    expect(
      requirementCandidatesForPath(root, "src/index.ts", 3, ["coach"]),
    ).toEqual([]);
    expect(requirementCandidatesForPath(root, "src/index.ts")).toEqual([]);
    expect(
      requirementCandidatesForPath(root, "src/index.ts", 3, ["coach", "inbox"]),
    ).toStrictEqual([{ id: "REQ-a", title: "Coach inbox" }]);
    expect(requirementCandidatesForPath(root, "coach.ts")).toStrictEqual([
      { id: "REQ-a", title: "Coach inbox" },
    ]);
  });

  test("a missing directory or an oversized KB yields nothing", () => {
    const empty = fs.mkdtempSync(
      path.join(os.tmpdir(), "kibi-candidates-none-"),
    );
    roots.push(empty);
    expect(requirementCandidatesForPath(empty, "coach.ts")).toEqual([]);
    const files: Record<string, string> = {};
    for (let i = 0; i < 2000; i++) files[`r${i}.md`] = "";
    files["r0.md"] = "---\nid: REQ-0\ntitle: Coach\n---\n";
    files["note.txt"] = "";
    const root = requirementsDir(files);
    expect(requirementCandidatesForPath(root, "coach.ts")).toStrictEqual([
      { id: "REQ-0", title: "Coach" },
    ]);
    fs.writeFileSync(path.join(root, ".kb", "requirements", "r2000.md"), "");
    expect(requirementCandidatesForPath(root, "coach.ts")).toEqual([]);
  });
});
