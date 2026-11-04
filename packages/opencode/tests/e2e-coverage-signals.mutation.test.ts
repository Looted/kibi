import { afterEach, describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { getE2eCoverageSignal } from "../src/e2e-coverage-signals";

const EXACT =
  "- This file has existing e2e coverage. Check whether the e2e tests and linked TEST entities need updates.";
const HEURISTIC =
  "- This file may have related e2e coverage. Check the linked e2e tests if this change affects behavior.";

const dirs: string[] = [];
afterEach(() => {
  for (const dir of dirs.splice(0))
    fs.rmSync(dir, { recursive: true, force: true });
});

function write(file: string, content: string): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

/** A worktree where `sourceFile` links to `targets` through `relType`. */
function worktree(
  sourceFile: string,
  targets: string[],
  docs: Record<string, string>,
  relType = "covered_by",
): string {
  const root = fs.realpathSync.native(
    fs.mkdtempSync(path.join(os.tmpdir(), "kibi-oc-e2e-")),
  );
  dirs.push(root);
  write(
    path.join(root, ".kb", "symbols.yaml"),
    [
      "symbols:",
      "  - id: SYM-x",
      "    title: x",
      `    sourceFile: ${sourceFile}`,
      "    relationships:",
      ...targets.flatMap((target) => [
        `      - type: ${relType}`,
        `        target: ${target}`,
      ]),
      "",
    ].join("\n"),
  );
  for (const [name, content] of Object.entries(docs)) {
    write(path.join(root, ".kb", "tests", name), content);
  }
  return root;
}

function signal(root: string, rel: string) {
  return getE2eCoverageSignal(root, path.join(root, rel));
}

const NONE = { level: "none" as const, evidence: [], reminderText: null };

describe("e2e evidence from TEST docs", () => {
  test("an e2e tag is exact evidence", () => {
    const root = worktree("src/a.ts", ["TEST-a"], {
      "TEST-a.md":
        "---\ntitle: A\ntags:\n  - unit\n    - e2e\nstatus: x\n---\nbody\n",
    });
    expect(signal(root, "src/a.ts")).toStrictEqual({
      level: "exact",
      evidence: ["TEST-a"],
      reminderText: EXACT,
    });
  });

  test("a lowercase doc file name is found", () => {
    const root = worktree("src/a.ts", ["TEST-A"], {
      "test-a.md": "---\ntags:\n  - e2e\n---\n",
    });
    expect(signal(root, "src/a.ts").level).toBe("exact");
  });

  test.each([
    ["no tags line", "---\nother:\n  - e2e\n---\n"],
    [
      "tags after another key's list",
      "---\nlist:\n  - e2e\ntags:\n  - unit\n---\n",
    ],
    ["a later key's list", "---\ntags:\n  - unit\nsources:\n  - e2e\n---\n"],
    ["a key ending in tags", "---\nmytags:\n  - e2e\n---\n"],
    ["an inline tags value", "---\ntags: inline\n  - e2e\n---\n"],
    ["a tags value glued on", "---\ntags:x\n  - e2e\n---\n"],
    ["an unindented item", "---\ntags:\nfoo - e2e\n---\n"],
    ["a list item before any tags line", "---\n  - e2e\n---\n"],
    ["frontmatter not at the start", "x\n---\ntags:\n  - e2e\n---\n"],
    ["an empty item", "---\ntags:\n  - \n---\n"],
  ])("%s is no e2e tag", (_name, doc) => {
    const root = worktree("src/a.ts", ["TEST-a"], { "TEST-a.md": doc });
    expect(signal(root, "src/a.ts")).toStrictEqual(NONE);
  });

  test("deeper indentation still lists tags", () => {
    const root = worktree("src/a.ts", ["TEST-a"], {
      "TEST-a.md": "---\ntags:\n    - e2e\n---\n",
    });
    expect(signal(root, "src/a.ts").level).toBe("exact");
  });

  test.each([
    "source: documentation/tests/e2e/a.test.ts",
    "source:documentation/tests/e2e/packed/a.test.ts",
  ])("%s is exact evidence", (line) => {
    const root = worktree("src/a.ts", ["TEST-a"], {
      "TEST-a.md": `---\n${line}\n---\n`,
    });
    expect(signal(root, "src/a.ts").level).toBe("exact");
  });

  test.each([
    "xsource: documentation/tests/e2e/a.test.ts",
    "source: other/documentation/tests/e2e/a.test.ts",
  ])("%s is no e2e source", (line) => {
    const root = worktree("src/a.ts", ["TEST-a"], {
      "TEST-a.md": `---\n${line}\n---\n`,
    });
    expect(signal(root, "src/a.ts")).toStrictEqual(NONE);
  });

  test("only TEST targets are read", () => {
    const root = worktree("src/a.ts", ["REQ-a"], {
      "REQ-a.md": "---\ntags:\n  - e2e\n---\n",
    });
    expect(signal(root, "src/a.ts")).toStrictEqual(NONE);
  });

  test("a missing doc is skipped", () => {
    const root = worktree("src/a.ts", ["TEST-missing"], {});
    expect(signal(root, "src/a.ts")).toStrictEqual(NONE);
  });
});

describe("heuristic evidence", () => {
  test("a doc body naming the file is heuristic", () => {
    const root = worktree("src/a.ts", ["TEST-a"], {
      "TEST-a.md": "---\ntitle: A\n---\nCovers src/a.ts.\n",
    });
    expect(signal(root, "src/a.ts")).toStrictEqual({
      level: "heuristic",
      evidence: ["TEST-a (doc names path: src/a.ts)"],
      reminderText: HEURISTIC,
    });
  });

  test("a doc without frontmatter is all body", () => {
    const root = worktree("src/a.ts", ["TEST-a"], {
      "TEST-a.md": "Covers src/a.ts.\n",
    });
    expect(signal(root, "src/a.ts").level).toBe("heuristic");
  });

  test("the path only in frontmatter does not count", () => {
    const root = worktree("src/a.ts", ["TEST-a"], {
      "TEST-a.md": "---\nsource: src/a.ts\n---\nnothing here, not even null\n",
    });
    expect(signal(root, "src/a.ts")).toStrictEqual(NONE);
  });

  test("an umbrella doc is heuristic at most", () => {
    const root = worktree("src/a.ts", ["TEST-opencode-kibi-plugin-v1"], {
      "TEST-opencode-kibi-plugin-v1.md": "---\ntags:\n  - e2e\n---\nsrc/a.ts\n",
    });
    expect(signal(root, "src/a.ts")).toStrictEqual({
      level: "heuristic",
      evidence: [
        "TEST-opencode-kibi-plugin-v1 (umbrella doc names path: src/a.ts)",
      ],
      reminderText: HEURISTIC,
    });
  });

  test("an umbrella doc not naming the path gives nothing", () => {
    const root = worktree("src/a.ts", ["TEST-opencode-kibi-plugin-v1"], {
      "TEST-opencode-kibi-plugin-v1.md": "---\ntags:\n  - e2e\n---\nother\n",
    });
    expect(signal(root, "src/a.ts")).toStrictEqual(NONE);
  });

  test.each([
    "TEST-opencode-kibi-plugin-v12-extra",
    "TEST-opencode-kibi-plugin-v12",
  ])("%s is umbrella only with digits at the end", (id) => {
    const root = worktree("src/a.ts", [id], {
      [`${id}.md`]: "---\ntags:\n  - e2e\n---\n",
    });
    expect(signal(root, "src/a.ts").level).toBe(
      id.endsWith("extra") ? "exact" : "none",
    );
  });
});

describe("dist files", () => {
  test("a dist file uses the links and path of its src file", () => {
    const root = worktree(
      "packages/opencode/src/toast.ts",
      ["TEST-toast"],
      { "TEST-toast.md": "---\n---\nsee packages/opencode/src/toast.ts\n" },
      "executable_for",
    );
    expect(signal(root, "packages/opencode/dist/toast.js")).toStrictEqual({
      level: "heuristic",
      evidence: [
        "TEST-toast (doc names path: packages/opencode/dist/toast.js)",
      ],
      reminderText: HEURISTIC,
    });
  });

  test("only a trailing .js is mapped to .ts", () => {
    const root = worktree("packages/opencode/dist/a.js.map", ["TEST-a"], {
      "TEST-a.md": "---\n---\npackages/opencode/src/a.js.map\n",
    });
    expect(signal(root, "packages/opencode/dist/a.js.map").level).toBe(
      "heuristic",
    );
  });

  test("files outside dist get no src mapping", () => {
    const root = worktree("lib/a.ts", ["TEST-a"], {
      "TEST-a.md": "---\n---\nmentions packages/opencode/src/ and null\n",
    });
    expect(signal(root, "lib/a.ts")).toStrictEqual(NONE);
  });

  test("a dist file's own links are kept", () => {
    const root = worktree("packages/opencode/dist/b.js", ["TEST-b"], {
      "TEST-b.md": "---\ntags:\n  - e2e\n---\n",
    });
    expect(signal(root, "packages/opencode/dist/b.js").level).toBe("exact");
  });
});
