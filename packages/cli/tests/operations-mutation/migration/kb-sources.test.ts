import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, readdirSync, symlinkSync } from "node:fs";
import path from "node:path";
import {
  listLaneMarkdownFiles,
  listLaneMarkdownSources,
  readText,
  readTopLevelField,
  sliceFrontmatter,
  withTopLevelField,
  withoutTopLevelField,
  writeFileAtomically,
} from "../../../src/operations/migration/kb-sources.js";
import * as sourceAuthoring from "../../../src/operations/mutation/source-authoring.js";
import { removeTempWorkspaces, tempWorkspace } from "../workspace.js";

afterEach(removeTempWorkspaces);

const doc = (frontmatter: string, body = "Body.\n") =>
  `---\n${frontmatter}---\n${body}`;

describe("listLaneMarkdownFiles", () => {
  test("lists entity Markdown files lane by lane, sorted", () => {
    const names = Array.from({ length: 24 }, (_, i) => `f${(i * 7) % 24}`);
    const files: Record<string, string> = {
      ".kb/tests/T.md": "t",
      ".kb/requirements/README.md": "readme",
      ".kb/requirements/notes.txt": "x",
      ".kb/requirements/sub/deep/C.md": "c",
      ".kb/requirements/sub/README.md.bak": "x",
      ".kb/requirements/sub/A.MD": "x",
      ".kb/requirements/B.md": "b",
      "requirements/Outside.md": "x",
    };
    for (const name of names) files[`.kb/facts/${name}.md`] = name;
    const root = tempWorkspace(files);
    mkdirSync(path.join(root, ".kb/requirements/dir.md"));
    symlinkSync(
      path.join(root, ".kb/requirements/B.md"),
      path.join(root, ".kb/requirements/link.md"),
    );
    const listed = listLaneMarkdownFiles(root);
    const facts = [...names].sort().map((name) => ({
      lane: "facts",
      absolutePath: path.join(root, `.kb/facts/${name}.md`),
      relativePath: `.kb/facts/${name}.md`,
    }));
    expect(listed).toStrictEqual([
      {
        lane: "requirements",
        absolutePath: path.join(root, ".kb/requirements/B.md"),
        relativePath: ".kb/requirements/B.md",
      },
      {
        lane: "requirements",
        absolutePath: path.join(root, ".kb/requirements/sub/deep/C.md"),
        relativePath: ".kb/requirements/sub/deep/C.md",
      },
      {
        lane: "tests",
        absolutePath: path.join(root, ".kb/tests/T.md"),
        relativePath: ".kb/tests/T.md",
      },
      ...facts,
    ] as typeof listed);
    // The directory order is not already sorted, so the sort is observable.
    expect(readdirSync(path.join(root, ".kb/facts")).join()).not.toBe(
      [...names.map((name) => `${name}.md`)].sort().join(),
    );
    expect(
      listLaneMarkdownFiles(root, ["tests"]).map((file) => file.relativePath),
    ).toStrictEqual([".kb/tests/T.md"]);
  });

  test("lists nothing in a lane that is not a directory", () => {
    const root = tempWorkspace({ ".kb/requirements": "a file" });
    expect(listLaneMarkdownFiles(root)).toStrictEqual([]);
  });
});

describe("listLaneMarkdownSources", () => {
  test("adds each file's text", () => {
    const root = tempWorkspace({
      ".kb/adr/A.md": "a",
      ".kb/flags/F.md": "f",
    });
    expect(listLaneMarkdownSources(root)).toStrictEqual([
      {
        lane: "adr",
        absolutePath: path.join(root, ".kb/adr/A.md"),
        relativePath: ".kb/adr/A.md",
        content: "a",
      },
      {
        lane: "flags",
        absolutePath: path.join(root, ".kb/flags/F.md"),
        relativePath: ".kb/flags/F.md",
        content: "f",
      },
    ] as ReturnType<typeof listLaneMarkdownSources>);
    expect(
      listLaneMarkdownSources(root, ["flags"]).map((file) => file.content),
    ).toStrictEqual(["f"]);
  });
});

describe("sliceFrontmatter", () => {
  test("splits around the frontmatter", () => {
    expect(sliceFrontmatter("---\na: 1\n---\nBody\n")).toStrictEqual({
      prefix: "---\n",
      text: "a: 1\n",
      suffix: "---\nBody\n",
      eol: "\n",
    });
    expect(sliceFrontmatter(" \n\t---  \na: 1\n--- \t\n")).toStrictEqual({
      prefix: " \n\t---  \n",
      text: "a: 1\n",
      suffix: "--- \t\n",
      eol: "\n",
    });
    expect(sliceFrontmatter("---\n---")).toStrictEqual({
      prefix: "---\n",
      text: "",
      suffix: "---",
      eol: "\n",
    });
  });

  test("detects CRLF from the text or the opening line", () => {
    expect(sliceFrontmatter("---\r\na: 1\r\n---\r\n")).toStrictEqual({
      prefix: "---\r\n",
      text: "a: 1\r\n",
      suffix: "---\r\n",
      eol: "\r\n",
    });
    expect(sliceFrontmatter("---\r\n---\r\n")?.eol).toBe("\r\n");
    expect(sliceFrontmatter("---\na: 1\n---\r\n")?.eol).toBe("\n");
    expect(sliceFrontmatter("---\na\r\n---\n")?.eol).toBe("\r\n");
  });

  test("closes only on a whole --- line", () => {
    expect(sliceFrontmatter("---\na: '| --- |'\n----\nb: 1\n---\n")?.text).toBe(
      "a: '| --- |'\n----\nb: 1\n",
    );
    expect(sliceFrontmatter("---\na: 1\n---x\n")).toBeNull();
    expect(sliceFrontmatter("---\na: 1\n x---\n")).toBeNull();
  });

  test("needs an opening line", () => {
    for (const content of [
      "a\n---\n---\n",
      "--- x\n---\n",
      "---",
      "----\n---\n",
      "x---\n---\n",
    ])
      expect(sliceFrontmatter(content)).toBeNull();
  });
});

describe("readTopLevelField", () => {
  test("reads a key from its own line", () => {
    expect(readTopLevelField("a: 1\nstatus: open\n", "status")).toBe("open");
    expect(readTopLevelField("status : open\n", "status")).toBe("open");
    expect(readTopLevelField("status:\topen\r\nb: 2\r\n", "status")).toBe(
      "open",
    );
    expect(readTopLevelField("a: 1\n", "status")).toBeUndefined();
    expect(readTopLevelField("  status: open\n", "status")).toBeUndefined();
    expect(readTopLevelField("xstatus: open\n", "status")).toBeUndefined();
    expect(readTopLevelField("statusx: open\n", "status")).toBeUndefined();
  });

  test("parses the whole frontmatter for a value on later lines", () => {
    expect(readTopLevelField("tags:\n  - a\n  - b\n", "tags")).toStrictEqual([
      "a",
      "b",
    ]);
    expect(readTopLevelField("tags:\r\n\t- a\r\n", "tags")).toBeUndefined();
    expect(readTopLevelField("tags:\r\n  - a\r\n", "tags")).toStrictEqual([
      "a",
    ]);
    expect(readTopLevelField("tags:\n\n  - a\n", "tags")).toBeNull();
    expect(readTopLevelField("tags:\n- a\n- b\n", "tags")).toStrictEqual([
      "a",
      "b",
    ]);
    expect(readTopLevelField("tags:\r\n-\tc\r\n", "tags")).toStrictEqual(["c"]);
    expect(readTopLevelField("tags:\n-\n", "tags")).toStrictEqual([null]);
    expect(readTopLevelField("tags:\n-x: 1\n", "tags")).toBeNull();
  });

  test("falls back to the whole frontmatter when the line is not a mapping", () => {
    expect(readTopLevelField("a :x\n", "a")).toBeUndefined();
    expect(readTopLevelField("a: |\n  x\n", "a")).toBe("x\n");
  });

  test("returns undefined when the frontmatter does not parse", () => {
    expect(readTopLevelField("a: [\n", "a")).toBeUndefined();
    expect(readTopLevelField("a:\n  - x\n y: [\n", "a")).toBeUndefined();
    expect(readTopLevelField("- a\na:\n  - x\n", "a")).toBeUndefined();
  });
});

describe("withTopLevelField", () => {
  const set = (frontmatter: string, value: string, key = "status") =>
    withTopLevelField(doc(frontmatter), key, value);

  test("replaces the key's line in place", () => {
    expect(set("id: A\nstatus: open # why\ntags: [a]\n", "closed")).toBe(
      doc("id: A\nstatus: closed\ntags: [a]\n"),
    );
    expect(
      withTopLevelField("---\r\nstatus: open\r\n---\r\n", "status", "closed"),
    ).toBe("---\r\nstatus: closed\r\n---\r\n");
  });

  test("appends a missing key as the last one", () => {
    expect(set("id: A\n", "closed")).toBe(doc("id: A\nstatus: closed\n"));
    expect(
      withTopLevelField("---\r\nid: A\r\n---\r\n", "status", "closed"),
    ).toBe("---\r\nid: A\r\nstatus: closed\r\n---\r\n");
  });

  test("keeps the authored quote style", () => {
    expect(set("status: 'open'\n", "it's")).toBe(doc("status: 'it''s'\n"));
    expect(set('status: "open"\n', "x")).toBe(doc('status: "x"\n'));
    expect(set("status: 'open' # c\n", "x")).toBe(doc("status: 'x'\n"));
    expect(set('status: "open" # c\n', "x")).toBe(doc('status: "x"\n'));
    expect(set("status: open\n", "a: b")).toBe(doc('status: "a: b"\n'));
    expect(set("status: open\n", "true")).toBe(doc('status: "true"\n'));
    expect(set("status: open\n", "[x")).toBe(doc('status: "[x"\n'));
    expect(set("id: A\n", "")).toBe(doc('id: A\nstatus: ""\n'));
  });

  test("never writes a run of three dashes", () => {
    expect(set("id: A\n", "a---b")).toBe(doc('id: A\nstatus: "a-\\x2D-b"\n'));
    expect(set("status: 'x'\n", "-----")).toBe(
      doc('status: "-\\x2D-\\x2D-"\n'),
    );
    expect(set("status: x\n", "a--b")).toBe(doc("status: a--b\n"));
  });

  test("refuses what it cannot edit in place", () => {
    expect(withTopLevelField("status: open\n", "status", "x")).toBeNull();
    expect(set("status:\n  open\n", "x")).toBeNull();
    expect(set("status:\r\n  open\r\n", "x")).toBeNull();
    expect(set("", "x")).toBeNull();
    expect(set("- a\n", "x")).toBeNull();
    expect(set("a: [\n", "x")).toBeNull();
    expect(set("<<: {status: open}\nstatus: open\n", "x")).toBe(
      doc("<<: {status: open}\nstatus: x\n"),
    );
    expect(set("<<: {id: B}\nid: A\nstatus: open\n", "x")).toBe(
      doc("<<: {id: B}\nid: A\nstatus: x\n"),
    );
    expect(set("<<: {status: y}\n", "x")).toBe(
      doc("<<: {status: y}\nstatus: x\n"),
    );
    expect(set("status: open\nother: &s open\n", "x")).toBe(
      doc("status: x\nother: &s open\n"),
    );
    expect(set("status: &s open\nother: *s\n", "x")).toBeNull();
  });

  test("refuses an edit that moves the closing delimiter", () => {
    expect(
      withTopLevelField("---\nid: A\n---\n---\nlater\n", "status", "x"),
    ).toBe("---\nid: A\nstatus: x\n---\n---\nlater\n");
    expect(withTopLevelField("---\nid: A\n--- \n", "status", "x")).toBe(
      "---\nid: A\nstatus: x\n--- \n",
    );
  });
});

describe("withoutTopLevelField", () => {
  test("removes only the key's line", () => {
    expect(
      withoutTopLevelField(doc("id: A\nstatus: open\nb: 1\n"), "status"),
    ).toBe(doc("id: A\nb: 1\n"));
    expect(
      withoutTopLevelField("---\r\nstatus: open\r\nb: 1\r\n---\r\n", "status"),
    ).toBe("---\r\nb: 1\r\n---\r\n");
    expect(withoutTopLevelField(doc("status: open\n"), "status")).toBe(doc(""));
  });

  test("returns the content unchanged without the key", () => {
    const content = doc("id: A\n");
    expect(withoutTopLevelField(content, "status")).toBe(content);
    expect(withoutTopLevelField(doc(""), "status")).toBe(doc(""));
    expect(withoutTopLevelField(doc("~\n"), "status")).toBe(doc("~\n"));
  });

  test("refuses what it cannot edit in place", () => {
    expect(withoutTopLevelField("status: open\n", "status")).toBeNull();
    expect(withoutTopLevelField(doc("status:\n  open\n"), "status")).toBeNull();
    expect(withoutTopLevelField(doc("- a\n"), "status")).toBeNull();
    expect(withoutTopLevelField(doc("a: [\n"), "status")).toBeNull();
    expect(
      withoutTopLevelField(doc("<<: {status: x}\nstatus: open\n"), "status"),
    ).toBeNull();
    expect(
      withoutTopLevelField(doc("status: &s open\nother: *s\n"), "status"),
    ).toBeNull();
    expect(
      withoutTopLevelField(doc("status: open\n- a\n"), "status"),
    ).toBeNull();
  });
});

describe("writeFileAtomically", () => {
  test("replaces the file and rebinds a pending .kb source receipt", () => {
    const root = tempWorkspace({ ".kb/requirements/A.md": "old" });
    const republish = spyOn(
      sourceAuthoring,
      "republishPendingSourceReceipt",
    ).mockReturnValue(true);
    try {
      writeFileAtomically(path.join(root, ".kb/requirements/A.md"), "new é");
      writeFileAtomically(path.join(root, ".kb/new/dir/B.md"), "b");
      writeFileAtomically(path.join(root, "outside.md"), "o");
      writeFileAtomically(path.join(root, "x.kb/C.md"), "c");
      expect(republish.mock.calls).toStrictEqual([
        [
          root,
          ".kb/requirements/A.md",
          createHash("sha256").update("new é").digest("hex"),
        ],
        [
          root,
          ".kb/new/dir/B.md",
          createHash("sha256").update("b").digest("hex"),
        ],
      ]);
    } finally {
      republish.mockRestore();
    }
    expect(readFileSync(path.join(root, ".kb/requirements/A.md"), "utf8")).toBe(
      "new é",
    );
    expect(readFileSync(path.join(root, ".kb/new/dir/B.md"), "utf8")).toBe("b");
    expect(readFileSync(path.join(root, "outside.md"), "utf8")).toBe("o");
    expect(readdirSync(path.join(root, ".kb/requirements"))).toStrictEqual([
      "A.md",
    ]);
  });

  test("uses the innermost .kb directory", () => {
    const root = tempWorkspace();
    const republish = spyOn(
      sourceAuthoring,
      "republishPendingSourceReceipt",
    ).mockReturnValue(false);
    try {
      writeFileAtomically(path.join(root, ".kb/nested/.kb/A.md"), "a");
      expect(republish.mock.calls[0]?.slice(0, 2)).toStrictEqual([
        path.join(root, ".kb/nested"),
        ".kb/A.md",
      ]);
    } finally {
      republish.mockRestore();
    }
  });
});

describe("readText", () => {
  test("reads a file or returns null", () => {
    const root = tempWorkspace({ "a.txt": "é" });
    expect(readText(path.join(root, "a.txt"))).toBe("é");
    expect(readText(path.join(root, "missing.txt"))).toBeNull();
  });
});
