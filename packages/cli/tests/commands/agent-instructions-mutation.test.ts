import { afterEach, describe, expect, spyOn, test } from "bun:test";
import * as fs from "node:fs";
import {
  mkdirSync,
  readFileSync,
  realpathSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import {
  CLAUDE_IMPORT_SECTION,
  KIBI_AGENT_INSTRUCTIONS,
  KIBI_INSTRUCTIONS_BEGIN,
  KIBI_INSTRUCTIONS_END,
  managedSectionState,
  reportAgentInstructions,
  upsertManagedSection,
  writeAgentInstructions,
} from "../../src/commands/agent-instructions.js";
import {
  createTempDir,
  removeTempDir,
} from "../helpers/in-process-workspace.js";

const roots: string[] = [];
const restores: Array<() => void> = [];

afterEach(() => {
  for (const restore of restores.splice(0).reverse()) restore();
  for (const root of roots.splice(0)) removeTempDir(root);
});

function tempRoot(): string {
  const root = realpathSync(createTempDir("kibi-agent-instr-"));
  roots.push(root);
  return root;
}

const section = (body: string) =>
  `${KIBI_INSTRUCTIONS_BEGIN}\n${body}\n${KIBI_INSTRUCTIONS_END}`;
const read = (file: string) => readFileSync(file).toString();

describe("upsertManagedSection", () => {
  test("creates a missing file with the section", () => {
    const file = path.join(tempRoot(), "A.md");
    expect(upsertManagedSection(file, "body")).toBe("created");
    expect(read(file)).toBe(`${section("body")}\n`);
  });

  test("appends to user text after one blank line", () => {
    const file = path.join(tempRoot(), "A.md");
    writeFileSync(file, "# Mine\n\n\n");
    expect(upsertManagedSection(file, "body")).toBe("updated");
    expect(read(file)).toBe(`# Mine\n\n${section("body")}\n`);
  });

  test("fills a blank file without a leading gap", () => {
    const file = path.join(tempRoot(), "A.md");
    writeFileSync(file, " \n\n");
    expect(upsertManagedSection(file, "body")).toBe("updated");
    expect(read(file)).toBe(`${section("body")}\n`);
  });

  test("replaces only the text inside the markers", () => {
    const file = path.join(tempRoot(), "A.md");
    writeFileSync(
      file,
      `before\n${section("old\nlines")}\nmiddle\n${section("second")}\nafter`,
    );
    expect(upsertManagedSection(file, "new")).toBe("updated");
    expect(read(file)).toBe(
      `before\n${section("new")}\nmiddle\n${section("second")}\nafter`,
    );
    expect(upsertManagedSection(file, "new")).toBe("unchanged");
  });

  test("matches the markers literally", () => {
    const file = path.join(tempRoot(), "A.md");
    const lookalike = KIBI_INSTRUCTIONS_BEGIN.replace(
      "`kibi init`",
      "xkibi initx",
    );
    writeFileSync(file, `${lookalike}\nold\n${KIBI_INSTRUCTIONS_END}\n`);
    expect(upsertManagedSection(file, "b")).toBe("updated");
    expect(read(file)).toBe(
      `${lookalike}\nold\n${KIBI_INSTRUCTIONS_END}\n\n${section("b")}\n`,
    );
  });

  test("never writes through a symlink or into a directory", () => {
    const root = tempRoot();
    const target = path.join(root, "target.md");
    writeFileSync(target, "t");
    symlinkSync(target, path.join(root, "link.md"));
    expect(upsertManagedSection(path.join(root, "link.md"), "b")).toBe(
      "skipped-symlink",
    );
    expect(read(target)).toBe("t");
    mkdirSync(path.join(root, "dir.md"));
    expect(upsertManagedSection(path.join(root, "dir.md"), "b")).toBe(
      "skipped-unsupported",
    );
  });
});

describe("managedSectionState", () => {
  test("tells a current, outdated and missing section apart", () => {
    const root = tempRoot();
    const file = path.join(root, "A.md");
    expect(managedSectionState(file, "b")).toBe("missing");
    writeFileSync(file, "plain\n");
    expect(managedSectionState(file, "b")).toBe("missing");
    writeFileSync(file, `x\n${section("b")}\ny`);
    expect(managedSectionState(file, "b")).toBe("current");
    expect(managedSectionState(file, "c")).toBe("outdated");
  });
});

describe("writeAgentInstructions", () => {
  test("creates AGENTS.md and a CLAUDE.md that imports it", () => {
    const root = tempRoot();
    expect(writeAgentInstructions(root)).toStrictEqual({
      agents: "created",
      claude: "created",
    });
    expect(read(path.join(root, "AGENTS.md"))).toBe(
      `${section(KIBI_AGENT_INSTRUCTIONS)}\n`,
    );
    expect(read(path.join(root, "CLAUDE.md"))).toBe(
      `${section(CLAUDE_IMPORT_SECTION)}\n`,
    );
    expect(CLAUDE_IMPORT_SECTION).toBe("## Kibi\n\n@AGENTS.md");
    expect(writeAgentInstructions(root)).toStrictEqual({
      agents: "unchanged",
      claude: "unchanged",
    });
  });

  test("leaves a CLAUDE.md that already imports AGENTS.md", () => {
    for (const line of ["@AGENTS.md", "  @./AGENTS.md  "]) {
      const root = tempRoot();
      writeFileSync(path.join(root, "CLAUDE.md"), `# Notes\n${line}\nmore\n`);
      expect(writeAgentInstructions(root).claude).toBe("unchanged");
      expect(read(path.join(root, "CLAUDE.md"))).toBe(
        `# Notes\n${line}\nmore\n`,
      );
    }
    for (const line of ["see @AGENTS.md", "@AGENTS.mdx", "@AGENTSxmd"]) {
      const root = tempRoot();
      writeFileSync(path.join(root, "CLAUDE.md"), `${line}\n`);
      expect(writeAgentInstructions(root).claude).toBe("updated");
    }
  });

  test("writes once through a link between the two files", () => {
    const root = tempRoot();
    writeFileSync(path.join(root, "AGENTS.md"), "# Shared\n");
    symlinkSync("AGENTS.md", path.join(root, "CLAUDE.md"));
    expect(writeAgentInstructions(root)).toStrictEqual({
      agents: "updated",
      claude: "same-file",
    });
    expect(read(path.join(root, "AGENTS.md"))).toBe(
      `# Shared\n\n${section(KIBI_AGENT_INSTRUCTIONS)}\n`,
    );
  });

  test("writes through a link to a file inside the worktree", () => {
    const root = tempRoot();
    mkdirSync(path.join(root, "docs"));
    writeFileSync(path.join(root, "docs", "agents.md"), "");
    symlinkSync("docs/agents.md", path.join(root, "AGENTS.md"));
    expect(writeAgentInstructions(root).agents).toBe("updated");
    expect(read(path.join(root, "docs", "agents.md"))).toBe(
      `${section(KIBI_AGENT_INSTRUCTIONS)}\n`,
    );
  });

  test("never follows a link out of the worktree or a dangling one", () => {
    const outside = tempRoot();
    const root = tempRoot();
    writeFileSync(path.join(outside, "AGENTS.md"), "theirs");
    writeFileSync(path.join(outside, "CLAUDE.md"), "theirs");
    symlinkSync(path.join(outside, "AGENTS.md"), path.join(root, "AGENTS.md"));
    symlinkSync(path.join(root, "nowhere"), path.join(root, "CLAUDE.md"));
    expect(writeAgentInstructions(root)).toStrictEqual({
      agents: "skipped-symlink",
      claude: "skipped-symlink",
    });
    expect(read(path.join(outside, "AGENTS.md"))).toBe("theirs");
    const sibling = tempRoot();
    symlinkSync(
      path.join(outside, "CLAUDE.md"),
      path.join(sibling, "CLAUDE.md"),
    );
    expect(writeAgentInstructions(sibling)).toStrictEqual({
      agents: "created",
      claude: "skipped-symlink",
    });
    expect(read(path.join(outside, "CLAUDE.md"))).toBe("theirs");
  });

  test("a link into a directory whose name starts with dots stays inside", () => {
    const root = tempRoot();
    mkdirSync(path.join(root, "..docs"));
    writeFileSync(path.join(root, "..docs", "a.md"), "");
    symlinkSync(
      path.join(root, "..docs", "a.md"),
      path.join(root, "AGENTS.md"),
    );
    expect(writeAgentInstructions(root).agents).toBe("updated");
    expect(read(path.join(root, "..docs", "a.md"))).toContain("## Kibi");
  });

  test("a link to the parent directory leaves the worktree", () => {
    const parent = tempRoot();
    const root = path.join(parent, "repo");
    mkdirSync(root);
    symlinkSync(parent, path.join(root, "AGENTS.md"));
    expect(writeAgentInstructions(root).agents).toBe("skipped-symlink");
  });

  test("resolves the worktree root through a link", () => {
    const real = tempRoot();
    const holder = tempRoot();
    const linked = path.join(holder, "repo");
    symlinkSync(real, linked);
    expect(writeAgentInstructions(linked)).toStrictEqual({
      agents: "created",
      claude: "created",
    });
    expect(read(path.join(real, "AGENTS.md"))).toContain("## Kibi");
  });

  test("skips both files when the worktree cannot be resolved", () => {
    const root = path.join(tempRoot(), "missing");
    expect(writeAgentInstructions(root)).toStrictEqual({
      agents: "skipped-symlink",
      claude: "skipped-symlink",
    });
  });

  test("a CLAUDE.md directory is reported as unsupported", () => {
    const root = tempRoot();
    mkdirSync(path.join(root, "CLAUDE.md"));
    expect(writeAgentInstructions(root)).toStrictEqual({
      agents: "created",
      claude: "skipped-unsupported",
    });
  });

  test("an unreadable CLAUDE.md is an error, not a missing import", () => {
    const root = tempRoot();
    const claude = path.join(root, "CLAUDE.md");
    writeFileSync(claude, "@AGENTS.md\n");
    const realRead = fs.readFileSync;
    const spy = spyOn(fs, "readFileSync").mockImplementation(((
      file: string,
      ...rest: unknown[]
    ) => {
      if (file === claude)
        throw Object.assign(new Error("EACCES"), { code: "EACCES" });
      return (realRead as (...a: unknown[]) => unknown)(file, ...rest);
    }) as never);
    restores.push(() => spy.mockRestore());
    expect(() => writeAgentInstructions(root)).toThrow("EACCES");
  });
});

describe("reportAgentInstructions", () => {
  function report(agents: string, claude: string): string[] {
    const logs: string[] = [];
    const spy = spyOn(console, "log").mockImplementation((m) => {
      logs.push(String(m));
    });
    try {
      reportAgentInstructions({ agents, claude } as never);
    } finally {
      spy.mockRestore();
    }
    return logs;
  }

  test("prints one line per changed or skipped file", () => {
    expect(report("created", "created")).toStrictEqual([
      "✓ Created AGENTS.md with Kibi agent instructions",
      "✓ Created CLAUDE.md with an @AGENTS.md import for Claude Code",
    ]);
    expect(report("updated", "updated")).toStrictEqual([
      "✓ Updated the Kibi section of AGENTS.md",
      "✓ Updated the Kibi section of CLAUDE.md",
    ]);
    expect(report("unchanged", "same-file")).toStrictEqual([]);
    expect(report("skipped-symlink", "unchanged")).toStrictEqual([
      "! AGENTS.md is a symlink; Kibi never writes through it, so agents reading it get no Kibi instructions. Run 'kibi init' where the link's target is a regular file, or replace the link with a file.",
    ]);
    expect(report("unchanged", "skipped-unsupported")).toStrictEqual([
      "! CLAUDE.md is not a regular file; left untouched.",
    ]);
  });
});
