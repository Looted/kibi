import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import * as kbSources from "../../../src/operations/migration/kb-sources.js";
import {
  CLOSED_REQUIREMENT_STATUS,
  applySupersededClosures,
  planSupersededClosures,
  supersessionCycles,
} from "../../../src/operations/migration/superseded-closure.js";
import * as shards from "../../../src/relationships/shards.js";
import { removeTempWorkspaces, tempWorkspace } from "../workspace.js";

afterEach(removeTempWorkspaces);

type Shard = ReturnType<typeof shards.readAllShards>;

function req(id: string, status: string | null, supersedes: string[] = []) {
  const links =
    supersedes.length === 0
      ? ""
      : `links:\n${supersedes.map((to) => `  - type: supersedes\n    target: ${to}\n`).join("")}`;
  const statusLine = status === null ? "" : `status: ${status}\n`;
  return `---\nid: ${id}\ntitle: ${id}\ntype: req\n${statusLine}${links}---\nBody.\n`;
}

function workspace(requirements: Record<string, string>): string {
  const files: Record<string, string> = {};
  for (const [id, content] of Object.entries(requirements))
    files[`.kb/requirements/${id}.md`] = content;
  return tempWorkspace(files);
}

function withShards<T>(records: Shard | Error, run: () => T): T {
  const spy = spyOn(shards, "readAllShards").mockImplementation(() => {
    if (records instanceof Error) throw records;
    return records;
  });
  try {
    return run();
  } finally {
    spy.mockRestore();
  }
}

describe("supersessionCycles", () => {
  test("finds each strongly connected component with a cycle", () => {
    expect(supersessionCycles([])).toStrictEqual([]);
    expect(
      supersessionCycles([
        ["z", "y"],
        ["y", "z"],
        ["B", "c"],
        ["c", "B"],
        ["a", "x"],
        ["x", "w"],
        ["w", "a"],
        ["x", "leaf"],
        ["solo", "solo"],
        ["chain", "a"],
        ["q", "r"],
      ]),
    ).toStrictEqual([["a", "w", "x"], ["B", "c"], ["solo"], ["y", "z"]]);
  });

  test("names a component once whatever node it is reached from", () => {
    expect(
      supersessionCycles([
        ["m", "n"],
        ["n", "o"],
        ["o", "m"],
        ["o", "n"],
      ]),
    ).toStrictEqual([["m", "n", "o"]]);
  });
});

describe("planSupersededClosures", () => {
  test("lists superseded open requirements and cycles", () => {
    const root = workspace({
      "REQ-old": req("REQ-old", "open"),
      "REQ-new": req("REQ-new", "open", ["REQ-old", "REQ-old"]),
      "REQ-newest": req("REQ-newest", "open", ["REQ-old"]),
      "REQ-done": req("REQ-done", "' closed '"),
      "REQ-next": req("REQ-next", "open", ["REQ-done", "REQ-ghost"]),
      "REQ-a": req("REQ-a", "open", ["REQ-b"]),
      "REQ-b": req("REQ-b", "open", ["REQ-a"]),
      "REQ-bare": req("REQ-bare", null),
      "REQ-x": req("REQ-x", "open"),
      "REQ-y": req("REQ-y", "open"),
      "REQ-broken": "---\nid: REQ-broken\n",
    });
    const plan = withShards(
      [
        { type: "supersedes", from: "SCN-x", to: "REQ-bare" },
        { type: "relates_to", from: "REQ-new", to: "REQ-bare" },
        { type: "supersedes", from: "REQ-a", to: "REQ-newest" },
        { type: "supersedes", from: "B-new", to: "REQ-x" },
        { type: "supersedes", from: "a-new", to: "REQ-x" },
        { type: "relates_to", from: "REQ-new", to: "REQ-y" },
      ] as Shard,
      () => planSupersededClosures(root),
    );
    expect(plan).toStrictEqual({
      closures: [
        {
          id: "REQ-bare",
          path: ".kb/requirements/REQ-bare.md",
          status: "open",
          supersededBy: ["SCN-x"],
        },
        {
          id: "REQ-newest",
          path: ".kb/requirements/REQ-newest.md",
          status: "open",
          supersededBy: ["REQ-a"],
        },
        {
          id: "REQ-old",
          path: ".kb/requirements/REQ-old.md",
          status: "open",
          supersededBy: ["REQ-new", "REQ-newest"],
        },
        {
          id: "REQ-x",
          path: ".kb/requirements/REQ-x.md",
          status: "open",
          supersededBy: ["B-new", "a-new"],
        },
      ],
      cycles: [
        {
          members: ["REQ-a", "REQ-b"],
          edges: [
            ["REQ-a", "REQ-b"],
            ["REQ-b", "REQ-a"],
          ],
          files: [".kb/requirements/REQ-a.md", ".kb/requirements/REQ-b.md"],
        },
      ],
    });
  });

  test("reads the workspace's shards and survives malformed ones", () => {
    const root = workspace({
      "REQ-old": req("REQ-old", "open"),
      "REQ-new": req("REQ-new", "open", ["REQ-old"]),
    });
    const spy = spyOn(shards, "readAllShards").mockImplementation(() => {
      throw new Error("bad shard");
    });
    try {
      expect(planSupersededClosures(root).closures).toStrictEqual([
        {
          id: "REQ-old",
          path: ".kb/requirements/REQ-old.md",
          status: "open",
          supersededBy: ["REQ-new"],
        },
      ]);
      expect(spy.mock.calls).toStrictEqual([[path.join(root, ".kb")]]);
    } finally {
      spy.mockRestore();
    }
  });

  test("orders edges by source, then target", () => {
    const root = workspace({
      "REQ-a": req("REQ-a", "open", ["REQ-c", "REQ-b"]),
      "REQ-b": req("REQ-b", "open", ["REQ-a"]),
      "REQ-c": req("REQ-c", "open", ["REQ-a"]),
    });
    expect(
      withShards([], () => planSupersededClosures(root)).cycles,
    ).toStrictEqual([
      {
        members: ["REQ-a", "REQ-b", "REQ-c"],
        edges: [
          ["REQ-a", "REQ-b"],
          ["REQ-a", "REQ-c"],
          ["REQ-b", "REQ-a"],
          ["REQ-c", "REQ-a"],
        ],
        files: [
          ".kb/requirements/REQ-a.md",
          ".kb/requirements/REQ-b.md",
          ".kb/requirements/REQ-c.md",
        ],
      },
    ]);
  });

  test("keeps only edges inside each cycle", () => {
    const root = workspace({
      "REQ-a": req("REQ-a", "open", ["REQ-b"]),
      "REQ-b": req("REQ-b", "open", ["REQ-a", "REQ-c"]),
      "REQ-c": req("REQ-c", "open"),
      "REQ-d": req("REQ-d", "open", ["REQ-a"]),
    });
    const plan = withShards([], () => planSupersededClosures(root));
    expect(plan.cycles[0]?.edges).toStrictEqual([
      ["REQ-a", "REQ-b"],
      ["REQ-b", "REQ-a"],
    ]);
    expect(plan.closures.map((closure) => closure.id)).toStrictEqual(["REQ-c"]);
  });
});

describe("applySupersededClosures", () => {
  test("closes planned requirements and reports what it cannot edit", () => {
    expect(CLOSED_REQUIREMENT_STATUS).toBe("closed");
    const root = workspace({
      "REQ-old": req("REQ-old", "open"),
      "REQ-new": req("REQ-new", "open", ["REQ-old", "REQ-wrapped", "REQ-x"]),
      "REQ-wrapped":
        "---\nid: REQ-wrapped\ntitle: W\ntype: req\nstatus:\n  open\n---\n",
      "REQ-x": req("REQ-x", "open"),
    });
    const result = withShards([], () =>
      applySupersededClosures(root, new Set(["REQ-old", "REQ-wrapped"])),
    );
    expect(result).toStrictEqual({
      closed: [
        {
          id: "REQ-old",
          path: ".kb/requirements/REQ-old.md",
          status: "open",
          supersededBy: ["REQ-new"],
        },
      ],
      skipped: [
        {
          path: ".kb/requirements/REQ-wrapped.md",
          reason: "status could not be set without changing other fields",
        },
      ],
    });
    const read = (id: string) =>
      readFileSync(path.join(root, `.kb/requirements/${id}.md`), "utf8");
    expect(read("REQ-old")).toBe(req("REQ-old", "closed"));
    expect(read("REQ-x")).toBe(req("REQ-x", "open"));
    expect(
      withShards([], () => applySupersededClosures(root)).closed.map(
        (closure) => closure.id,
      ),
    ).toStrictEqual(["REQ-x"]);
    expect(read("REQ-x")).toBe(req("REQ-x", "closed"));
  });

  test("skips a requirement whose file cannot be read", () => {
    const root = workspace({
      "REQ-old": req("REQ-old", "open"),
      "REQ-new": req("REQ-new", "open", ["REQ-old"]),
    });
    const read = spyOn(kbSources, "readText").mockReturnValue(null);
    try {
      expect(withShards([], () => applySupersededClosures(root))).toStrictEqual(
        {
          closed: [],
          skipped: [
            {
              path: ".kb/requirements/REQ-old.md",
              reason: "status could not be set without changing other fields",
            },
          ],
        },
      );
      expect(read.mock.calls).toStrictEqual([
        [path.join(root, ".kb/requirements/REQ-old.md")],
      ]);
    } finally {
      read.mockRestore();
    }
  });
});
