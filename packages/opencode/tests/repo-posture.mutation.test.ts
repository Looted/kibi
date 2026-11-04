import { afterEach, describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { detectPosture } from "../src/repo-posture";

const dirs: string[] = [];

afterEach(() => {
  for (const dir of dirs.splice(0))
    fs.rmSync(dir, { recursive: true, force: true });
});

function repo(
  files: Record<string, string> = {},
  folders: string[] = [],
): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-oc-posture-"));
  dirs.push(dir);
  for (const folder of folders)
    fs.mkdirSync(path.join(dir, folder), { recursive: true });
  for (const [file, content] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
    fs.writeFileSync(path.join(dir, file), content);
  }
  return dir;
}

const LANES = [
  ".kb/requirements",
  ".kb/scenarios",
  ".kb/tests",
  ".kb/adr",
  ".kb/flags",
  ".kb/events",
  ".kb/facts",
];

const UNINITIALIZED = {
  state: "root_uninitialized" as const,
  needsBootstrap: true,
  reason: "No Kibi presence detected in workspace",
  maintenanceDegraded: false,
};

const INTENT = {
  state: "root_uninitialized" as const,
  needsBootstrap: true,
  reason:
    "No root .kb and no vendored trees, but Kibi plugin intent detected at root",
  maintenanceDegraded: false,
};

describe("detectPosture", () => {
  test("an empty repository has no Kibi presence", () => {
    expect(detectPosture(repo())).toStrictEqual(UNINITIALIZED);
  });

  test("every vendored marker is reported in order", () => {
    const dir = repo(
      { "kibi/opencode.json": "{}", "kibi/package.json": "{}" },
      [
        "kibi/packages/mcp",
        "kibi/.kb",
        "node_modules/kibi",
        "node_modules/kibi-opencode",
        "node_modules/other",
        "node_modules/xkibi-",
      ],
    );
    const result = detectPosture(dir);
    expect(result.state).toBe("vendored_only");
    expect(result.needsBootstrap).toBe(false);
    expect(result.maintenanceDegraded).toBe(false);
    expect(result.reason.split(": ")[0]).toBe(
      "No root .kb/manifest.json, but vendored Kibi tree(s) detected",
    );
    expect(result.reason.split(": ")[1]?.split(", ").sort()).toStrictEqual(
      [
        "kibi/opencode.json",
        "kibi/package.json",
        "kibi/packages/mcp",
        "kibi/.kb",
        "node_modules/kibi",
        "node_modules/kibi-opencode",
      ].sort(),
    );
  });

  test.each([
    ["kibi/opencode.json", "file"],
    ["kibi/package.json", "file"],
    ["kibi/packages/mcp", "dir"],
    ["kibi/.kb", "dir"],
  ])("%s alone marks a vendored tree", (marker, kind) => {
    const dir = kind === "file" ? repo({ [marker]: "{}" }) : repo({}, [marker]);
    expect(detectPosture(dir)).toStrictEqual({
      state: "vendored_only",
      needsBootstrap: false,
      reason: `No root .kb/manifest.json, but vendored Kibi tree(s) detected: ${marker}`,
      maintenanceDegraded: false,
    });
  });

  test("a manifest with vendored trees is hybrid", () => {
    const dir = repo({ ".kb/manifest.json": "{}" }, ["node_modules/kibi"]);
    expect(detectPosture(dir)).toStrictEqual({
      state: "hybrid_root_plus_vendored",
      needsBootstrap: false,
      reason:
        "Root .kb/manifest.json exists alongside vendored tree(s): node_modules/kibi",
      maintenanceDegraded: false,
    });
  });

  test("a hybrid reason lists every vendored tree", () => {
    const dir = repo({ ".kb/manifest.json": "{}" }, [
      "node_modules/kibi",
      "kibi/.kb",
    ]);
    expect(detectPosture(dir).reason).toBe(
      "Root .kb/manifest.json exists alongside vendored tree(s): kibi/.kb, node_modules/kibi",
    );
  });

  test("a manifest with every target is active", () => {
    const dir = repo(
      { ".kb/manifest.json": "{}", ".kb/symbols.yaml": "[]" },
      LANES,
    );
    expect(detectPosture(dir)).toStrictEqual({
      state: "root_active",
      needsBootstrap: false,
      reason:
        "Root .kb/manifest.json exists and all canonical KB targets resolve",
      maintenanceDegraded: false,
    });
  });

  test.each([...LANES, ".kb/symbols.yaml"])(
    "a manifest without %s is partial",
    (missing) => {
      const files: Record<string, string> = { ".kb/manifest.json": "{}" };
      if (missing !== ".kb/symbols.yaml") files[".kb/symbols.yaml"] = "[]";
      const dir = repo(
        files,
        LANES.filter((lane) => lane !== missing),
      );
      expect(detectPosture(dir)).toStrictEqual({
        state: "root_partial",
        needsBootstrap: true,
        reason:
          "Root .kb/manifest.json exists but some canonical KB targets are missing",
        maintenanceDegraded: false,
      });
    },
  );

  test("the symbols target must exist, not just its lanes", () => {
    const dir = repo({ ".kb/manifest.json": "{}" }, [
      ...LANES,
      ".kb/symbols.yml",
    ]);
    expect(detectPosture(dir).state).toBe("root_partial");
  });

  describe("root intent", () => {
    test(".opencode/kibi.json declares intent", () => {
      expect(
        detectPosture(repo({ ".opencode/kibi.json": "{}" })),
      ).toStrictEqual(INTENT);
    });

    test("an .opencode directory without kibi.json declares no intent", () => {
      expect(detectPosture(repo({}, [".opencode"]))).toStrictEqual(
        UNINITIALIZED,
      );
    });

    test("a kibi plugin in opencode.json declares intent", () => {
      expect(
        detectPosture(
          repo({
            "opencode.json": JSON.stringify({ plugin: ["x", "kibi-opencode"] }),
          }),
        ),
      ).toStrictEqual(INTENT);
    });

    test.each([
      JSON.stringify({ plugin: ["other"] }),
      JSON.stringify({ plugin: [1, "other"] }),
      JSON.stringify({ plugin: "kibi" }),
      JSON.stringify({}),
      "null",
      "{not json",
    ])("opencode.json %s declares no intent", (content) => {
      expect(detectPosture(repo({ "opencode.json": content }))).toStrictEqual(
        UNINITIALIZED,
      );
    });

    test.each(["kb_query", "kb_search"])(
      "AGENTS.md mentioning %s declares intent",
      (tool) => {
        expect(
          detectPosture(repo({ "AGENTS.md": `use ${tool}` })),
        ).toStrictEqual(INTENT);
      },
    );

    test("copilot instructions mentioning kb_search declare intent", () => {
      expect(
        detectPosture(
          repo({ ".github/copilot-instructions.md": "call kb_search" }),
        ),
      ).toStrictEqual(INTENT);
    });

    test("guidance without Kibi tools declares no intent", () => {
      expect(
        detectPosture(
          repo({
            "AGENTS.md": "nothing",
            ".github/copilot-instructions.md": "nothing",
          }),
        ),
      ).toStrictEqual(UNINITIALIZED);
    });
  });
});
