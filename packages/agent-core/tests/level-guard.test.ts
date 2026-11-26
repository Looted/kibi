import { afterEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  EVIDENCE_LEVELS,
  committedContent,
  contentBeforeEdit,
  evidenceFloor,
  guardedChangeAfterNotice,
  guardedChangeConfirmation,
  guardedChangeContext,
  guardedChangeNotice,
  guardedChangeOf,
  guardedChangeOfShellCommand,
  guardedChangeSince,
  proposedContent,
} from "../src/level-guard";

// The edit and Kibi call checks, as a host reaches them.
const levelChangeOfEdit = (
  root: string,
  relativePath: string,
  toolInput: unknown,
) =>
  guardedChangeOf({
    workspaceRoot: root,
    toolName: "Edit",
    toolInput,
    relativePath,
  });
const evidenceLoweringOfEdit = levelChangeOfEdit;
const evidenceLoweringOfKbCall = (
  root: string,
  operation: string | undefined,
  toolInput: unknown,
) => guardedChangeOf({ workspaceRoot: root, toolName: operation, toolInput });

const roots: string[] = [];

function workspace(files: Record<string, string>): string {
  const root = mkdtempSync(path.join(tmpdir(), "kibi-level-guard-"));
  roots.push(root);
  for (const [file, content] of Object.entries(files)) {
    mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    writeFileSync(path.join(root, file), content);
  }
  return root;
}

afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

const pkg = (level?: string) =>
  `${JSON.stringify(
    level === undefined ? { name: "app" } : { name: "app", kibi: { level } },
    null,
    2,
  )}\n`;

function requirement(fields: Record<string, string> = {}): string {
  const lines = Object.entries({
    id: "REQ-a",
    title: "A",
    status: "open",
    ...fields,
  }).map(([key, value]) => `${key}: ${value}`);
  return `---\n${lines.join("\n")}\norigin:\n  kind: agent\n---\nBody.\n`;
}

const patch = (file: string, ...lines: string[]) =>
  `*** Begin Patch\n*** Update File: ${file}\n${lines.join("\n")}\n*** End Patch`;

describe("proposedContent", () => {
  test("a whole-file write is the new content", () => {
    const root = workspace({ "a.txt": "old" });
    const file = path.join(root, "a.txt");
    expect(proposedContent(file, { content: "new" })).toBe("new");
    expect(proposedContent(file, { contents: "c" })).toBe("c");
    expect(proposedContent(file, { file_text: "f" })).toBe("f");
  });

  test("replacements apply in order, once unless replace_all", () => {
    const root = workspace({ "a.txt": "x x y" });
    const file = path.join(root, "a.txt");
    expect(proposedContent(file, { old_string: "x", new_string: "$&z" })).toBe(
      "$&z x y",
    );
    expect(
      proposedContent(file, {
        old_string: "x",
        new_string: "w",
        replace_all: true,
      }),
    ).toBe("w w y");
    expect(
      proposedContent(file, {
        edits: [
          { oldString: "y", newString: "q", replaceAll: true },
          { old_string: "q", new_string: "r" },
        ],
      }),
    ).toBe("x x r");
  });

  test("anything else proposes nothing", () => {
    const root = workspace({ "a.txt": "x" });
    const file = path.join(root, "a.txt");
    expect(proposedContent(file, undefined)).toBeUndefined();
    expect(proposedContent(file, { command: "sed -i s/x/y/ a.txt" })).toBe(
      undefined,
    );
    expect(
      proposedContent(file, { old_string: "absent", new_string: "y" }),
    ).toBe(undefined);
    expect(proposedContent(file, { old_string: "", new_string: "y" })).toBe(
      undefined,
    );
    expect(proposedContent(file, { edits: [1, { old_string: 1 }] })).toBe(
      undefined,
    );
    expect(
      proposedContent(path.join(root, "missing.txt"), {
        old_string: "x",
        new_string: "y",
      }),
    ).toBeUndefined();
  });
});

describe("levelChangeOfEdit", () => {
  test("an edit of package.json that sets another level is a change", () => {
    const root = workspace({ "package.json": pkg() });
    expect(
      levelChangeOfEdit(root, "package.json", { content: pkg("remember") }),
    ).toEqual({
      kind: "level",
      path: "package.json",
      from: "test",
      to: "remember",
    });
    expect(
      levelChangeOfEdit(root, "./package.json", { content: pkg("test") }),
    ).toBeUndefined();
  });

  test("removing the level moves the project back to test", () => {
    const root = workspace({ "package.json": pkg("remember") });
    expect(
      levelChangeOfEdit(root, "package.json", { content: pkg() }),
    ).toMatchObject({ from: "remember", to: "test" });
    expect(
      levelChangeOfEdit(root, "package.json", { content: "not json" }),
    ).toMatchObject({ to: "test" });
    expect(
      levelChangeOfEdit(root, "package.json", { content: "[1]" }),
    ).toMatchObject({ to: "test" });
  });

  test("setup.json counts only when there is no root package.json", () => {
    const bare = workspace({ ".kb/setup.json": "{}" });
    expect(
      levelChangeOfEdit(bare, ".kb/setup.json", {
        content: JSON.stringify({ level: "remember" }),
      }),
    ).toMatchObject({ path: ".kb/setup.json", to: "remember" });
    const withPackage = workspace({
      "package.json": pkg(),
      ".kb/setup.json": "{}",
    });
    expect(
      levelChangeOfEdit(withPackage, ".kb/setup.json", {
        content: JSON.stringify({ level: "remember" }),
      }),
    ).toBeUndefined();
    expect(
      levelChangeOfEdit(withPackage, "packages/a/package.json", {
        content: pkg("remember"),
      }),
    ).toBeUndefined();
  });

  test("a patch counts when a line it adds or removes sets the level", () => {
    const root = workspace({ "package.json": pkg("remember") });
    expect(
      levelChangeOfEdit(root, "package.json", {
        patch: patch(
          "package.json",
          '-    "level": "remember"',
          '+    "level": "test"',
        ),
      }),
    ).toMatchObject({ from: "remember", to: "test" });
    expect(
      levelChangeOfEdit(root, "package.json", {
        patch: patch("package.json", '-    "level": "remember"'),
      }),
    ).toMatchObject({ to: "test" });
    expect(
      levelChangeOfEdit(root, "package.json", {
        patch: patch("package.json", '+  "name": "b"'),
      }),
    ).toBeUndefined();
    expect(
      levelChangeOfEdit(root, "package.json", {
        patch: patch("other.json", '+    "level": "test"'),
      }),
    ).toBeUndefined();
    expect(
      levelChangeOfEdit(root, "package.json", { command: "true" }),
    ).toBeUndefined();
  });

  test('a patch of another "level" key in package.json is no change', () => {
    const root = workspace({ "package.json": pkg("remember") });
    expect(
      levelChangeOfEdit(root, "package.json", {
        patch: patch("package.json", '+    "level": "debug"'),
      }),
    ).toBeUndefined();
    expect(
      levelChangeOfEdit(root, "package.json", {
        patch: patch("package.json", '-    "level": "debug"'),
      }),
    ).toBeUndefined();
  });
});

describe("evidenceFloor", () => {
  test("required_evidence wins; otherwise firmness and approval decide", () => {
    expect(evidenceFloor({ required_evidence: "asserted" })).toBe("asserted");
    expect(evidenceFloor({ firmness: "firm", originKind: "agent" })).toBe(
      "tested",
    );
    expect(evidenceFloor({ originKind: "migration" })).toBe("tested");
    expect(
      evidenceFloor({ originKind: "agent", approvedBy: "maintainer" }),
    ).toBe("tested");
    expect(evidenceFloor({ originKind: "agent", approvedBy: "" })).toBe(
      "unverified",
    );
    expect(evidenceFloor({ firmness: "", originKind: "agent" })).toBe(
      "unverified",
    );
    expect(evidenceFloor({ firmness: "default" })).toBe("unverified");
    expect(EVIDENCE_LEVELS).toEqual([
      "unverified",
      "asserted",
      "tested",
      "proved",
    ]);
  });
});

describe("evidenceLoweringOfEdit", () => {
  const file = ".kb/requirements/REQ-a.md";

  test("a document edit that lowers the floor is a lowering", () => {
    const root = workspace({
      [file]: requirement({ required_evidence: "tested" }),
    });
    expect(
      evidenceLoweringOfEdit(root, file, {
        old_string: "required_evidence: tested",
        new_string: "required_evidence: asserted",
      }),
    ).toEqual({
      kind: "evidence",
      requirementId: "REQ-a",
      from: "tested",
      to: "asserted",
    });
    expect(
      evidenceLoweringOfEdit(root, file, {
        old_string: "required_evidence: tested",
        new_string: "required_evidence: 'proved'",
      }),
    ).toBeUndefined();
    expect(
      evidenceLoweringOfEdit(root, file, { content: "no frontmatter" }),
    ).toEqual({
      kind: "evidence",
      requirementId: "REQ-a",
      from: "tested",
      to: "unverified",
    });
  });

  test("removing the field lowers an agent requirement to unverified", () => {
    const root = workspace({
      [file]: requirement({ required_evidence: "tested" }),
    });
    expect(
      evidenceLoweringOfEdit(root, file, {
        old_string: "required_evidence: tested\n",
        new_string: "",
      }),
    ).toMatchObject({ to: "unverified" });
  });

  test("a patch that changes firmness or drops the approval lowers it", () => {
    const root = workspace({
      [file]:
        "---\nid: REQ-a\ntitle: A\nstatus: open\nfirmness: firm\norigin:\n  kind: agent\n  approved_by: maintainer\n---\n",
    });
    expect(
      evidenceLoweringOfEdit(root, file, {
        patch: patch(file, "-firmness: firm", "+firmness: exploratory"),
      }),
    ).toMatchObject({ from: "tested", to: "unverified" });
    expect(
      evidenceLoweringOfEdit(root, file, {
        patch: patch(file, "-firmness: firm", "-  approved_by: maintainer"),
      }),
    ).toMatchObject({ to: "unverified" });
    expect(
      evidenceLoweringOfEdit(root, file, {
        patch: patch(file, "-firmness: firm"),
      }),
    ).toBeUndefined();
    expect(
      evidenceLoweringOfEdit(root, file, {
        patch: patch(file, "+title: B"),
      }),
    ).toBeUndefined();
  });

  test("a patch that adds a lower value or only removes the line lowers it", () => {
    const root = workspace({
      [file]: requirement({ required_evidence: "tested" }),
    });
    expect(
      evidenceLoweringOfEdit(root, file, {
        patch: patch(
          file,
          "-required_evidence: tested",
          '+required_evidence: "asserted"',
        ),
      }),
    ).toMatchObject({ to: "asserted" });
    expect(
      evidenceLoweringOfEdit(root, file, {
        patch: patch(file, "-required_evidence: tested"),
      }),
    ).toMatchObject({ to: "unverified" });
    expect(
      evidenceLoweringOfEdit(root, file, { patch: patch(file, "+tags: []") }),
    ).toBeUndefined();
    expect(evidenceLoweringOfEdit(root, file, { command: "true" })).toBe(
      undefined,
    );
  });

  test("other files and unknown requirements are not judged", () => {
    const root = workspace({ [file]: "no frontmatter" });
    expect(
      evidenceLoweringOfEdit(root, "src/a.ts", { content: "x" }),
    ).toBeUndefined();
    expect(
      evidenceLoweringOfEdit(root, ".kb/requirements/REQ-b.md", {
        content: "x",
      }),
    ).toBeUndefined();
    expect(
      evidenceLoweringOfEdit(root, file, { content: "x" }),
    ).toBeUndefined();
  });
});

describe("evidenceLoweringOfKbCall", () => {
  const root = () =>
    workspace({
      ".kb/requirements/REQ-a.md": requirement({ required_evidence: "tested" }),
    });

  test("a requirement write that asks for less evidence is a lowering", () => {
    const dir = root();
    const call = {
      type: "req",
      id: "REQ-a",
      properties: { required_evidence: "asserted" },
    };
    expect(evidenceLoweringOfKbCall(dir, "kb_upsert", call)).toEqual({
      kind: "evidence",
      requirementId: "REQ-a",
      from: "tested",
      to: "asserted",
    });
    expect(
      evidenceLoweringOfKbCall(dir, "kb_record", {
        id: "REQ-a",
        properties: { required_evidence: "unverified" },
      }),
    ).toBeUndefined();
    expect(
      evidenceLoweringOfKbCall(dir, "kb_upsert", { ...call, dryRun: true }),
    ).toBeUndefined();
    expect(
      evidenceLoweringOfKbCall(dir, "kb_upsert", { id: "REQ-a" }),
    ).toBeUndefined();
  });

  test("a write that lowers the floor through firmness or origin is a lowering", () => {
    const approved = workspace({
      ".kb/requirements/REQ-a.md":
        "---\nid: REQ-a\ntitle: A\nstatus: open\norigin:\n  kind: agent\n  approved_by: maintainer\n---\nBody.\n",
    });
    const upsert = (properties: Record<string, unknown>) =>
      evidenceLoweringOfKbCall(approved, "kb_upsert", {
        id: "REQ-a",
        properties: { title: "A", status: "open", ...properties },
      });
    expect(upsert({ firmness: "exploratory" })).toMatchObject({
      from: "tested",
      to: "unverified",
    });
    expect(upsert({ firmness: "default" })).toMatchObject({ to: "unverified" });
    expect(upsert({ origin: { kind: "agent" } })).toMatchObject({
      to: "unverified",
    });
    expect(upsert({ origin: "agent" })).toBeUndefined();
    expect(upsert({ firmness: "firm" })).toBeUndefined();
    expect(upsert({ required_evidence: "tested" })).toBeUndefined();
    // Omitted properties keep their stored values.
    expect(upsert({})).toBeUndefined();
    const explicit = root();
    expect(
      evidenceLoweringOfKbCall(explicit, "kb_upsert", {
        id: "REQ-a",
        properties: { required_evidence: null },
      }),
    ).toMatchObject({ from: "tested", to: "unverified" });
  });

  test("a call that names another workspace is judged there", () => {
    const other = root();
    const here = workspace({});
    const call = {
      id: "REQ-a",
      workspaceRoot: other,
      properties: { required_evidence: "asserted" },
    };
    expect(evidenceLoweringOfKbCall(here, "kb_upsert", call)).toMatchObject({
      from: "tested",
      to: "asserted",
    });
    expect(
      evidenceLoweringOfKbCall(other, "kb_upsert", {
        ...call,
        workspaceRoot: " ",
      }),
    ).toMatchObject({ to: "asserted" });
  });

  test("anything else is not a lowering", () => {
    const dir = root();
    const lower = { required_evidence: "asserted" };
    expect(evidenceLoweringOfKbCall(dir, undefined, {})).toBeUndefined();
    expect(evidenceLoweringOfKbCall(dir, "kb_check", {})).toBeUndefined();
    expect(evidenceLoweringOfKbCall(dir, "kb_upsert", "x")).toBeUndefined();
    expect(
      evidenceLoweringOfKbCall(dir, "kb_upsert", { properties: lower }),
    ).toBeUndefined();
    expect(
      evidenceLoweringOfKbCall(dir, "kb_upsert", {
        type: "test",
        id: "REQ-a",
        properties: lower,
      }),
    ).toBeUndefined();
    expect(
      evidenceLoweringOfKbCall(dir, "kb_upsert", {
        id: "REQ-a",
        properties: { required_evidence: "lots" },
      }),
    ).toBeUndefined();
    expect(
      evidenceLoweringOfKbCall(dir, "kb_upsert", {
        id: "REQ-new",
        properties: lower,
      }),
    ).toBeUndefined();
    expect(
      evidenceLoweringOfKbCall(dir, "kb_upsert", {
        id: "REQ-a",
        properties: { required_evidence: "proved" },
      }),
    ).toBeUndefined();
  });
});

describe("guardedChangeOf", () => {
  test("a Kibi call is judged by its input, an edit by its file", () => {
    const root = workspace({
      "package.json": pkg(),
      ".kb/requirements/REQ-a.md": requirement({ required_evidence: "tested" }),
    });
    const lower = {
      id: "REQ-a",
      properties: { required_evidence: "asserted" },
    };
    expect(
      guardedChangeOf({
        workspaceRoot: root,
        toolName: "mcp__kibi__kb_upsert",
        toolInput: lower,
        relativePath: "package.json",
      }),
    ).toMatchObject({ kind: "evidence" });
    expect(
      guardedChangeOf({
        workspaceRoot: root,
        toolName: "Write",
        toolInput: { content: pkg("remember") },
        relativePath: "package.json",
      }),
    ).toMatchObject({ kind: "level", to: "remember" });
    expect(
      guardedChangeOf({
        workspaceRoot: root,
        toolName: "Edit",
        toolInput: {
          old_string: "required_evidence: tested",
          new_string: "required_evidence: asserted",
        },
        relativePath: ".kb/requirements/REQ-a.md",
      }),
    ).toMatchObject({ kind: "evidence", to: "asserted" });
    expect(
      guardedChangeOf({
        workspaceRoot: root,
        toolName: "Edit",
        toolInput: { content: "x" },
      }),
    ).toBeUndefined();
  });
});

describe("contentBeforeEdit", () => {
  test("an applied replacement edit is turned back", () => {
    const root = workspace({ "a.txt": "one TWO three TWO" });
    const file = path.join(root, "a.txt");
    expect(
      contentBeforeEdit(file, { old_string: "two", new_string: "TWO" }),
    ).toBe("one two three TWO");
    expect(
      contentBeforeEdit(file, {
        oldString: "two",
        newString: "TWO",
        replaceAll: true,
      }),
    ).toBe("one two three two");
    // Edits applied in order are turned back in reverse order.
    const chained = workspace({ "b.txt": "y" });
    expect(
      contentBeforeEdit(path.join(chained, "b.txt"), {
        edits: [
          { old_string: "a", new_string: "x" },
          { old_string: "x b", new_string: "y" },
        ],
      }),
    ).toBe("a b");
  });

  test("a whole-file write or a stale edit has no earlier text", () => {
    const root = workspace({ "a.txt": "now" });
    const file = path.join(root, "a.txt");
    expect(contentBeforeEdit(file, { content: "now" })).toBeUndefined();
    expect(
      contentBeforeEdit(file, { old_string: "x", new_string: "gone" }),
    ).toBeUndefined();
    expect(contentBeforeEdit(file, "patch")).toBeUndefined();
  });
});

describe("committedContent", () => {
  test("reads the file in the last commit, if any", () => {
    const root = workspace({ "package.json": pkg("test") });
    expect(committedContent(root, "package.json")).toBeUndefined();
    const git = (...args: string[]) =>
      spawnSync("git", args, { cwd: root, stdio: "ignore" });
    git("init", "-q");
    git("add", "package.json");
    git(
      "-c",
      "user.name=t",
      "-c",
      "user.email=t@example.invalid",
      "commit",
      "-qm",
      "init",
    );
    writeFileSync(path.join(root, "package.json"), pkg("remember"));
    expect(committedContent(root, "package.json")).toBe(pkg("test"));
    expect(committedContent(root, "missing.json")).toBeUndefined();
  });
});

describe("guardedChangeSince without earlier text", () => {
  const levelChangeSinceCommit = (root: string, relativePath: string) =>
    guardedChangeSince(root, relativePath, undefined);
  const commit = (root: string, ...files: string[]) => {
    const git = (...args: string[]) =>
      spawnSync("git", args, { cwd: root, stdio: "ignore" });
    git("init", "-q");
    if (files.length > 0) git("add", ...files);
    git(
      "-c",
      "user.name=t",
      "-c",
      "user.email=t@example.invalid",
      "commit",
      "-qm",
      "init",
      "--allow-empty",
    );
  };

  test("a settings file new since the commit is compared with the committed level", () => {
    const root = workspace({ "README.md": "x" });
    expect(levelChangeSinceCommit(root, ".kb/setup.json")).toBeUndefined();
    commit(root, "README.md");
    mkdirSync(path.join(root, ".kb"), { recursive: true });
    writeFileSync(
      path.join(root, ".kb", "setup.json"),
      JSON.stringify({ level: "remember" }),
    );
    expect(levelChangeSinceCommit(root, ".kb/setup.json")).toEqual({
      kind: "level",
      path: ".kb/setup.json",
      from: "test",
      to: "remember",
    });
    expect(levelChangeSinceCommit(root, "README.md")).toBeUndefined();
  });

  test("the committed package.json, then setup.json, sets the earlier level", () => {
    const withSetup = workspace({
      ".kb/setup.json": JSON.stringify({ level: "remember" }),
    });
    commit(withSetup, ".kb/setup.json");
    writeFileSync(path.join(withSetup, "package.json"), pkg());
    expect(levelChangeSinceCommit(withSetup, "package.json")).toMatchObject({
      from: "remember",
      to: "test",
    });
    const withPackage = workspace({ "package.json": pkg("remember") });
    commit(withPackage, "package.json");
    expect(levelChangeSinceCommit(withPackage, "package.json")).toBeUndefined();
  });
});

describe("guardedChangeSince", () => {
  test("a different level in the settings file is a change", () => {
    const root = workspace({ "package.json": pkg("remember") });
    expect(guardedChangeSince(root, "package.json", pkg())).toEqual({
      kind: "level",
      path: "package.json",
      from: "test",
      to: "remember",
    });
    expect(
      guardedChangeSince(root, "package.json", pkg("remember")),
    ).toBeUndefined();
    const setupOnly = workspace({
      ".kb/setup.json": JSON.stringify({ level: "test" }),
    });
    expect(
      guardedChangeSince(
        setupOnly,
        ".kb/setup.json",
        JSON.stringify({ level: "remember" }),
      ),
    ).toEqual({
      kind: "level",
      path: ".kb/setup.json",
      from: "remember",
      to: "test",
    });
    // With a root package.json, setup.json holds no level.
    const both = workspace({
      "package.json": pkg(),
      ".kb/setup.json": JSON.stringify({ level: "remember" }),
    });
    expect(guardedChangeSince(both, ".kb/setup.json", "{}")).toBeUndefined();
  });

  test("a requirement whose floor is now lower is a lowering", () => {
    const root = workspace({
      ".kb/requirements/REQ-a.md": requirement({
        required_evidence: "asserted",
      }),
      ".kb/requirements/REQ-b.md": "no frontmatter",
    });
    expect(
      guardedChangeSince(
        root,
        ".kb/requirements/REQ-a.md",
        requirement({ required_evidence: "tested" }),
      ),
    ).toEqual({
      kind: "evidence",
      requirementId: "REQ-a",
      from: "tested",
      to: "asserted",
    });
    expect(
      guardedChangeSince(
        root,
        ".kb/requirements/REQ-a.md",
        requirement({ required_evidence: "unverified" }),
      ),
    ).toBeUndefined();
    expect(
      guardedChangeSince(root, ".kb/requirements/REQ-b.md", requirement()),
    ).toBeUndefined();
    expect(
      guardedChangeSince(root, ".kb/requirements/REQ-missing.md", "x"),
    ).toBeUndefined();
    expect(guardedChangeSince(root, "src/a.ts", "x")).toBeUndefined();
  });
});

describe("texts", () => {
  const down = {
    kind: "level",
    path: "package.json",
    from: "test",
    to: "remember",
  } as const;
  const up = { ...down, from: "remember", to: "test" } as const;
  const lower = {
    kind: "evidence",
    requirementId: "REQ-a",
    from: "tested",
    to: "asserted",
  } as const;

  test("the person reads what the change does", () => {
    expect(guardedChangeConfirmation(down)).toBe(
      "Kibi: this edit changes the Kibi level from test to remember (package.json). At remember, Kibi stops asking for the scenarios, tests and proofs that show each requirement holds. Allow it only if you chose this level.",
    );
    expect(guardedChangeConfirmation(up)).toContain(
      "At test, Kibi asks for the scenarios and linked tests",
    );
    expect(guardedChangeConfirmation(lower)).toBe(
      "Kibi: this change lowers the evidence REQ-a must reach from tested to asserted, so kibi check stops asking for the evidence it asked for before. Allow it only if you agree the requirement needs less evidence.",
    );
  });

  test("the agent is told it is the person's decision", () => {
    expect(guardedChangeContext(lower)).toBe(
      "Kibi asked the person to confirm this change because it lowers the evidence REQ-a must reach from tested to asserted. That is the person's decision: do not make it again a different way if they decline, and say in your reply what you changed.",
    );
    expect(guardedChangeNotice(down)).toBe(
      "Kibi: this change changes the Kibi level from test to remember (package.json). That is the person's decision, not yours: ask the person before making it, and leave it out unless they agree.",
    );
    expect(guardedChangeAfterNotice(lower)).toBe(
      "Kibi: the change you just made lowers the evidence REQ-a must reach from tested to asserted. That is the person's decision, not yours: ask the person now whether to keep it, and undo it unless they agree.",
    );
  });
});

describe("YAML frontmatter, id lookup, apply_patch, kb_delete/apply_plan, and shell guards", () => {
  test("YAML comments, tags, quoted keys, flow origin, and malformed frontmatter cannot bypass evidence guard", () => {
    const file = ".kb/requirements/REQ-pay.md";
    const doc = [
      "---",
      "id: REQ-pay",
      "title: Refund rule",
      "status: open",
      "required_evidence: tested",
      "firmness: firm",
      "origin:",
      "  kind: human",
      "  approved_by: alice",
      "---",
      "Body.",
    ].join("\n");
    const root = workspace({ [file]: doc });
    for (const replacement of [
      "required_evidence: asserted # ok",
      "required_evidence: !!str asserted",
      '"required_evidence": asserted',
      "required_evidence: not-a-real-level",
    ]) {
      expect(
        evidenceLoweringOfEdit(root, file, {
          old_string: "required_evidence: tested",
          new_string: replacement,
        }),
        replacement,
      ).toMatchObject({
        kind: "evidence",
        requirementId: "REQ-pay",
        from: "tested",
      });
    }
    expect(
      evidenceLoweringOfEdit(root, file, {
        old_string:
          "required_evidence: tested\nfirmness: firm\norigin:\n  kind: human\n  approved_by: alice\n",
        new_string: "origin: {kind: agent}\n",
      }),
    ).toMatchObject({
      requirementId: "REQ-pay",
      from: "tested",
      to: "unverified",
    });
    expect(
      evidenceLoweringOfEdit(root, file, {
        content: "---\n: [broken yaml\n---\n",
      }),
    ).toMatchObject({
      requirementId: "REQ-pay",
      from: "tested",
      to: "unverified",
    });
    expect(
      evidenceLoweringOfEdit(root, file, {
        patch: patch(
          file,
          "-required_evidence: tested",
          "+required_evidence: asserted # fine",
        ),
      }),
    ).toMatchObject({
      requirementId: "REQ-pay",
      from: "tested",
      to: "asserted",
    });
  });

  test("resolves requirements by frontmatter id even when file name differs", () => {
    const file = ".kb/requirements/nested/chargeback-rule.md";
    const root = workspace({
      [file]: requirement({
        id: "REQ-pay-chargeback",
        required_evidence: "tested",
      }),
    });
    expect(
      evidenceLoweringOfKbCall(root, "mcp_kibi.kb_upsert", {
        type: "req",
        id: "REQ-pay-chargeback",
        properties: { required_evidence: "unverified" },
      }),
    ).toEqual({
      kind: "evidence",
      requirementId: "REQ-pay-chargeback",
      from: "tested",
      to: "unverified",
    });
    expect(
      evidenceLoweringOfEdit(root, file, {
        old_string: "required_evidence: tested",
        new_string: "required_evidence: asserted",
      }),
    ).toEqual({
      kind: "evidence",
      requirementId: "REQ-pay-chargeback",
      from: "tested",
      to: "asserted",
    });
  });

  test("apply_patch detects level change even when another level line precedes it or on Delete+Add", () => {
    const root = workspace({ "package.json": pkg("test") });
    expect(
      levelChangeOfEdit(root, "package.json", {
        patch: patch(
          "package.json",
          '+  "logging": {"level": "debug"},',
          '-    "level": "test"',
          '+    "level": "remember"',
        ),
      }),
    ).toMatchObject({ kind: "level", from: "test", to: "remember" });
    expect(
      levelChangeOfEdit(root, "package.json", {
        patch: [
          "*** Begin Patch",
          "*** Delete File: package.json",
          "*** Add File: package.json",
          "+{",
          '+  "kibi": {',
          '+    "level":',
          '+      "remember"',
          "+  }",
          "+}",
          "*** End Patch",
        ].join("\n"),
      }),
    ).toMatchObject({ kind: "level", from: "test", to: "remember" });
  });

  test("kb_delete and kb_apply_plan lowering an existing requirement are guarded", () => {
    const root = workspace({
      ".kb/requirements/REQ-a.md": requirement({ required_evidence: "tested" }),
    });
    expect(
      evidenceLoweringOfKbCall(root, "kb_delete", { ids: ["REQ-a"] }),
    ).toEqual({
      kind: "evidence",
      requirementId: "REQ-a",
      from: "tested",
      to: "unverified",
    });
    expect(
      evidenceLoweringOfKbCall(root, "kb_apply_plan", {
        plan: {
          actions: [
            {
              operation: "upsert",
              payload: {
                id: "REQ-a",
                properties: { required_evidence: "asserted" },
              },
            },
          ],
        },
      }),
    ).toEqual({
      kind: "evidence",
      requirementId: "REQ-a",
      from: "tested",
      to: "asserted",
    });
    expect(
      evidenceLoweringOfKbCall(root, "kb_apply_plan", {
        plan: {
          actions: [{ operation: "delete", entityId: "REQ-a" }],
        },
      }),
    ).toEqual({
      kind: "evidence",
      requirementId: "REQ-a",
      from: "tested",
      to: "unverified",
    });
  });

  test("guardedChangeOfShellCommand catches kibi init --level and shell writes to settings or requirements", () => {
    const root = workspace({
      "package.json": pkg("test"),
      ".kb/requirements/REQ-a.md": requirement({ required_evidence: "tested" }),
    });
    expect(
      guardedChangeOfShellCommand(root, "kibi init --level remember"),
    ).toEqual({
      kind: "level",
      path: "package.json",
      from: "test",
      to: "remember",
    });
    expect(
      guardedChangeOfShellCommand(
        root,
        'bash -c "npx --no-install kibi init --level=remember"',
      ),
    ).toEqual({
      kind: "level",
      path: "package.json",
      from: "test",
      to: "remember",
    });
    expect(
      guardedChangeOfShellCommand(root, "kibi init --level test"),
    ).toBeUndefined();
    expect(
      guardedChangeOfShellCommand(
        root,
        `sed -i 's/"level": "test"/"level": "remember"/' package.json`,
      ),
    ).toMatchObject({ kind: "level", path: "package.json", from: "test" });
    expect(
      guardedChangeOfShellCommand(
        root,
        `sed -i 's/"version": "1.0.0"/"version": "1.0.1"/' package.json`,
      ),
    ).toBeUndefined();
    expect(
      guardedChangeOfShellCommand(
        root,
        `sed -i 's/required_evidence: tested/required_evidence: unverified/' .kb/requirements/REQ-a.md`,
      ),
    ).toMatchObject({
      kind: "evidence",
      requirementId: "REQ-a",
      from: "tested",
    });
  });

  test("stripping frontmatter or deleting a requirement fails closed to unverified", () => {
    const reqContent = requirement({ required_evidence: "tested" });
    const root = workspace({
      ".kb/requirements/REQ-strip.md": reqContent,
    });
    expect(
      evidenceLoweringOfEdit(root, ".kb/requirements/REQ-strip.md", {
        content: "plain markdown without frontmatter\n",
      }),
    ).toEqual({
      kind: "evidence",
      requirementId: "REQ-a",
      from: "tested",
      to: "unverified",
    });
    writeFileSync(
      path.join(root, ".kb/requirements/REQ-strip.md"),
      "plain markdown without frontmatter\n",
    );
    expect(
      guardedChangeSince(root, ".kb/requirements/REQ-strip.md", reqContent),
    ).toEqual({
      kind: "evidence",
      requirementId: "REQ-a",
      from: "tested",
      to: "unverified",
    });
    rmSync(path.join(root, ".kb/requirements/REQ-strip.md"));
    expect(
      guardedChangeSince(root, ".kb/requirements/REQ-strip.md", reqContent),
    ).toEqual({
      kind: "evidence",
      requirementId: "REQ-a",
      from: "tested",
      to: "unverified",
    });
  });
});
