import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  CONTEXT_MISSING_TAG_CODE,
  SEMANTIC_TEXT_PIN_CODE,
  acknowledgedContextIds,
  applyContextMissingTags,
  applySemanticTextPins,
  countByType,
  planContextMissingTags,
  planSemanticTextPins,
  withAddedTag,
} from "../../../src/operations/migration/entity-body-context.js";
import * as kbSources from "../../../src/operations/migration/kb-sources.js";
import {
  defaultKbManifest,
  readKbManifest,
  writeKbManifest,
} from "../../../src/utils/kb-manifest.js";
import { removeTempWorkspaces, tempWorkspace } from "../workspace.js";

afterEach(removeTempWorkspaces);

const TAG = "review:context-missing";
const doc = (frontmatter: string, body = "Body.\n") =>
  `---\n${frontmatter}---\n${body}`;
const CONTEXT =
  "## Context\n\nSupport asked for this after the outage because customers could not tell which export was retained.\n";

describe("codes", () => {
  test("are stable", () => {
    expect(SEMANTIC_TEXT_PIN_CODE).toBe("semantic_text_pin");
    expect(CONTEXT_MISSING_TAG_CODE).toBe("context_missing_tag");
  });
});

describe("acknowledgedContextIds", () => {
  test("joins tagged targets and already tagged ids, once and sorted", () => {
    const target = (id: string) => ({
      id,
      type: "req",
      path: "p",
      before: "",
      after: "",
    });
    expect(
      acknowledgedContextIds({
        targets: [target("b"), target("a")],
        skipped: [],
        alreadyTagged: ["c", "a"],
      }),
    ).toStrictEqual(["a", "b", "c"]);
    expect(
      acknowledgedContextIds({ targets: [target("b")], skipped: [] }),
    ).toStrictEqual(["b"]);
  });
});

describe("countByType", () => {
  test("counts targets by type, sorted by type", () => {
    const counts = countByType([
      { type: "test" },
      { type: "adr" },
      { type: "test" },
      { type: "Req" },
    ]);
    expect(counts).toStrictEqual({ adr: 1, Req: 1, test: 2 });
    expect(Object.keys(counts)).toStrictEqual(["adr", "Req", "test"]);
  });
});

describe("withAddedTag", () => {
  const add = (frontmatter: string) => withAddedTag(doc(frontmatter), TAG);

  test("adds a tags list when there is none", () => {
    expect(add("id: A\n")).toBe(doc(`id: A\ntags:\n  - ${TAG}\n`));
    expect(withAddedTag("---\r\nid: A\r\n---\r\nBody.\r\n", TAG)).toBe(
      `---\r\nid: A\r\ntags:\r\n  - ${TAG}\r\n---\r\nBody.\r\n`,
    );
  });

  test("extends a one-line flow list", () => {
    expect(add("tags: []\nid: A\n")).toBe(doc(`tags: [${TAG}]\nid: A\n`));
    expect(add("tags : [ a ]\n")).toBe(doc(`tags : [a, ${TAG}]\n`));
  });

  test("extends a block list at its indentation", () => {
    expect(add("tags:\n    - a\n    - b\nid: A\n")).toBe(
      doc(`tags:\n    - a\n    - b\n    - ${TAG}\nid: A\n`),
    );
    expect(add("tags:\n- a\nid: A\n")).toBe(
      doc(`tags:\n- a\n- ${TAG}\nid: A\n`),
    );
    expect(add("tags:  \nid: A\n")).toBe(doc(`tags:  \n  - ${TAG}\nid: A\n`));
    expect(add("tags: null\n")).toBe(doc(`tags:\n  - ${TAG}\n`));
    expect(add("tags: ~\n")).toBe(doc(`tags:\n  - ${TAG}\n`));
  });

  test("finds the end of the list", () => {
    expect(add("tags:\n  -  a\nnote: x - y\n")).toBe(
      doc(`tags:\n  -  a\n  - ${TAG}\nnote: x - y\n`),
    );
  });

  test("takes the indentation of the first item", () => {
    expect(add("tags:\n- a\n  - b\n")).toBe(
      doc(`tags:\n- a\n  - b\n- ${TAG}\n`),
    );
  });

  test("refuses what it cannot edit in place", () => {
    for (const frontmatter of [
      "",
      "- a\n",
      "plain\n",
      "id: [\n",
      "tags: a\n",
      "tags: a]\n",
      "tags: [a,\n  b]\n",
      "tags: {a: 1}\n",
      "tags:\n  a: 1\n",
      "tags: [a] # c\n",
      "tags: '[a]'\n",
      "tags:\n  - a\n  # c\n  - b\n",
    ])
      expect(add(frontmatter)).toBeNull();
    expect(withAddedTag("id: A\n", TAG)).toBeNull();
  });

  test("edits only the top-level tags key", () => {
    expect(add("xtags: [b]\ntags: [a]\n")).toBe(
      doc(`xtags: [b]\ntags: [a, ${TAG}]\n`),
    );
  });

  test("refuses an edit that does not read back as one added tag", () => {
    expect(add('note: "first\ntags: [a]\nend"\n')).toBeNull();
    expect(add("<<: {tags: [x]}\nid: A\n")).toBeNull();
  });
});

describe("planSemanticTextPins", () => {
  test("pins the derived meaning of requirements without one", () => {
    const files = {
      ".kb/requirements/A.md": doc(
        "id: REQ-a\ntitle: A\n",
        "\n# H\n- Must do x.\n",
      ),
      ".kb/requirements/B.md": doc(
        "id: REQ-b\ntitle: B\nsemantic_text: kept\n",
        "Other.\n",
      ),
      ".kb/requirements/C.md": doc(
        "id: REQ-c\ntitle: C\nsemantic_text: '  '\n",
        "Must c.\n",
      ),
      ".kb/requirements/D.md": doc("id: REQ-d\ntitle: D\n", "\n"),
      ".kb/requirements/E.md": doc(
        "id: REQ-e\ntitle: E\ntype: scenario\n",
        "Must e.\n",
      ),
      ".kb/requirements/F.md": "no front matter\n",
      ".kb/requirements/G.md": doc(
        "id: REQ-g\ntitle: G\nsemantic_text:\n  - x\n",
        "Must g.\n",
      ),
      ".kb/requirements/H.md": doc(
        "id: REQ-h\ntitle: H\nsemantic_text: 5\n",
        "Must h.\n",
      ),
      ".kb/scenarios/S.md": doc("id: S\ntitle: S\ntype: req\n", "Must s.\n"),
    };
    const root = tempWorkspace(files);
    expect(planSemanticTextPins(root)).toStrictEqual({
      targets: [
        {
          id: "REQ-a",
          type: "req",
          path: ".kb/requirements/A.md",
          before: files[".kb/requirements/A.md"],
          after: doc(
            "id: REQ-a\ntitle: A\nsemantic_text: Must do x.\n",
            "\n# H\n- Must do x.\n",
          ),
        },
        {
          id: "REQ-c",
          type: "req",
          path: ".kb/requirements/C.md",
          before: files[".kb/requirements/C.md"],
          after: doc(
            "id: REQ-c\ntitle: C\nsemantic_text: 'Must c.'\n",
            "Must c.\n",
          ),
        },
        {
          id: "REQ-h",
          type: "req",
          path: ".kb/requirements/H.md",
          before: files[".kb/requirements/H.md"],
          after: doc(
            "id: REQ-h\ntitle: H\nsemantic_text: Must h.\n",
            "Must h.\n",
          ),
        },
      ],
      skipped: [
        {
          id: "REQ-g",
          path: ".kb/requirements/G.md",
          reason: "semantic_text could not be edited safely",
        },
      ],
    });
    expect(applySemanticTextPins(root)).toBe(3);
    expect(readFileSync(path.join(root, ".kb/requirements/A.md"), "utf8")).toBe(
      doc(
        "id: REQ-a\ntitle: A\nsemantic_text: Must do x.\n",
        "\n# H\n- Must do x.\n",
      ),
    );
    expect(planSemanticTextPins(root).targets).toStrictEqual([]);
  });
});

describe("planContextMissingTags", () => {
  const files = {
    ".kb/requirements/A.md": doc("id: REQ-a\ntitle: A\nstatus: open\n"),
    ".kb/requirements/B.md": doc(
      "id: REQ-b\ntitle: B\nstatus: open\n",
      `Must b.\n\n${CONTEXT}`,
    ),
    ".kb/requirements/C.md": doc(`id: REQ-c\ntitle: C\ntags: [${TAG}]\n`),
    ".kb/requirements/D.md": doc("id: REQ-d\ntitle: D\nstatus: deprecated\n"),
    ".kb/requirements/E.md": doc(
      "id: REQ-e\ntitle: E\nlinks:\n  - type: supersedes\n    target: REQ-f\n",
      `Must e.\n\n${CONTEXT}`,
    ),
    ".kb/requirements/F.md": doc("id: REQ-f\ntitle: F\n"),
    ".kb/requirements/G.md": doc("id: REQ-g\ntitle: G\ntags: x\n"),
    ".kb/scenarios/S.md": doc("id: SCN-s\ntitle: S\n"),
  };

  test("tags current entities without context, once", () => {
    const root = tempWorkspace(files);
    expect(planContextMissingTags(root)).toStrictEqual({
      targets: [
        {
          id: "REQ-a",
          type: "req",
          path: ".kb/requirements/A.md",
          before: files[".kb/requirements/A.md"],
          after: doc(`id: REQ-a\ntitle: A\nstatus: open\ntags:\n  - ${TAG}\n`),
        },
        {
          id: "SCN-s",
          type: "scenario",
          path: ".kb/scenarios/S.md",
          before: files[".kb/scenarios/S.md"],
          after: doc(`id: SCN-s\ntitle: S\ntags:\n  - ${TAG}\n`),
        },
      ],
      skipped: [
        {
          id: "REQ-g",
          path: ".kb/requirements/G.md",
          reason: "tags could not be edited safely",
        },
      ],
      alreadyTagged: ["REQ-c"],
    });
  });

  test("skips a file that cannot be read back", () => {
    const root = tempWorkspace({
      ".kb/requirements/A.md": files[".kb/requirements/A.md"],
    });
    const real = kbSources.readText;
    let calls = 0;
    const read = spyOn(kbSources, "readText").mockImplementation((file) => {
      calls += 1;
      return calls === 1 ? real(file) : null;
    });
    try {
      expect(planContextMissingTags(root)).toStrictEqual({
        targets: [],
        skipped: [],
        alreadyTagged: [],
      });
      expect(read.mock.calls.at(-1)).toStrictEqual([
        `${root}/.kb/requirements/A.md`,
      ]);
    } finally {
      read.mockRestore();
    }
  });

  test("applies the tags and records them in the manifest", () => {
    const root = tempWorkspace(files);
    writeKbManifest(root, {
      ...defaultKbManifest(),
      contextAcknowledged: ["REQ-z", "REQ-a"],
    });
    expect(applyContextMissingTags(root)).toBe(2);
    expect(readFileSync(path.join(root, ".kb/scenarios/S.md"), "utf8")).toBe(
      doc(`id: SCN-s\ntitle: S\ntags:\n  - ${TAG}\n`),
    );
    expect(readKbManifest(root)?.contextAcknowledged).toStrictEqual([
      "REQ-a",
      "REQ-c",
      "REQ-z",
      "SCN-s",
    ]);
  });

  test("starts the acknowledged list in a manifest without one", () => {
    const root = tempWorkspace(files);
    writeKbManifest(root, defaultKbManifest());
    applyContextMissingTags(root);
    expect(readKbManifest(root)?.contextAcknowledged).toStrictEqual([
      "REQ-a",
      "REQ-c",
      "SCN-s",
    ]);
  });

  test("records nothing without a manifest or without ids", () => {
    const root = tempWorkspace(files);
    expect(applyContextMissingTags(root)).toBe(2);
    expect(readKbManifest(root)).toBeNull();
    const clean = tempWorkspace({
      ".kb/requirements/B.md": files[".kb/requirements/B.md"],
    });
    writeKbManifest(clean, defaultKbManifest());
    const manifest = readFileSync(
      path.join(clean, ".kb/manifest.json"),
      "utf8",
    );
    expect(applyContextMissingTags(clean)).toBe(0);
    expect(readFileSync(path.join(clean, ".kb/manifest.json"), "utf8")).toBe(
      manifest,
    );
  });
});
