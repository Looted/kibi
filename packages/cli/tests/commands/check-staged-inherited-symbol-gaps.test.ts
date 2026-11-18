// @ts-ignore
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { execSync, spawnSync } from "../helpers/isolated-env.js";

// A partially recorded file, as Kibi onboarding leaves it: only the deciding
// function has a symbol record; the schema constant next to it has none.

type FileMap = Record<string, string>;

const TEST_TIMEOUT_MS = 30000;
const kibiBin = path.resolve(__dirname, "../../src/cli.ts");

const TAGS = `export const tagIdSchema = "tag";

export function createTag() {
  return 1;
}
`;

function fixture(extraSymbols = ""): FileMap {
  return {
    ".kb/requirements/REQ-TAGS-001.md": `---
id: REQ-TAGS-001
title: Tag creation
status: open
firmness: default
---

# Tag creation
`,
    ".kb/tests/TEST-TAGS-001.md": `---
id: TEST-TAGS-001
title: Tag creation test
status: active
links:
  - type: validates
    target: REQ-TAGS-001
---

# Tag creation test
`,
    ".kb/symbols.yaml": `symbols:
  - id: SYM-TAGS-CREATE
    title: createTag
    sourceFile: src/tags.ts
    links:
      - REQ-TAGS-001
      - type: covered_by
        target: TEST-TAGS-001
    status: active
${extraSymbols}`,
    "src/tags.ts": TAGS,
  };
}

function writeFiles(root: string, files: FileMap): void {
  for (const [relativePath, content] of Object.entries(files)) {
    const absolutePath = path.join(root, relativePath);
    mkdirSync(path.dirname(absolutePath), { recursive: true });
    writeFileSync(absolutePath, content);
  }
}

function git(cwd: string, command: string): void {
  execSync(`git ${command}`, { cwd, stdio: "pipe" });
}

function kibi(cwd: string, args: string[]) {
  const result = spawnSync("bun", [kibiBin, ...args], {
    cwd,
    encoding: "utf8",
  });
  return {
    status: result.status,
    output: `${result.stdout ?? ""}${result.stderr ?? ""}`,
  };
}

describe("kibi check --staged on a partially recorded file", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(path.join(os.tmpdir(), "kibi-inherited-gaps-"));
    git(tmpDir, "init -b main");
    git(tmpDir, 'config user.email "test@example.com"');
    git(tmpDir, 'config user.name "Test User"');
    execSync(`KB_PATH=.kb/branches/main bun ${kibiBin} init`, {
      cwd: tmpDir,
      stdio: "pipe",
    });
  });

  afterEach(() => {
    if (tmpDir && existsSync(tmpDir))
      rmSync(tmpDir, { recursive: true, force: true });
  });

  function commitBase(files: FileMap): void {
    writeFiles(tmpDir, files);
    git(tmpDir, "add .");
    git(tmpDir, 'commit -m "base" --no-verify');
    execSync(`bun ${kibiBin} sync`, { cwd: tmpDir, stdio: "pipe" });
  }

  test(
    "an edit to the recorded function passes and notes the unrecorded neighbour",
    () => {
      commitBase(fixture());
      writeFiles(tmpDir, {
        "src/tags.ts": TAGS.replace("return 1;", "return 2;"),
      });
      git(tmpDir, "add src/tags.ts");
      const result = kibi(tmpDir, ["check", "--staged"]);
      expect(result.output).not.toContain("symbols_manifest_stale");
      expect(result.output).not.toContain("kibi_impact_evidence_missing");
      expect(result.output).toContain(
        "Symbol records: src/tags.ts has 1 declaration(s) without a .kb/symbols.yaml record that this commit did not add or change. They are not judged by this commit and no action is required.",
      );
      expect(result.status).toBe(0);

      const json = kibi(tmpDir, ["check", "--staged", "--format", "json"]);
      const parsed = JSON.parse(json.output) as {
        structuredContent: { inheritedSymbolGaps: unknown };
      };
      expect(parsed.structuredContent.inheritedSymbolGaps).toEqual([
        {
          path: "src/tags.ts",
          unrecorded: [{ title: "tagIdSchema", line: 1 }],
          orphaned: [],
        },
      ]);
    },
    TEST_TIMEOUT_MS,
  );

  test(
    "a new unrecorded function blocks, naming only the new declaration",
    () => {
      commitBase(fixture());
      writeFiles(tmpDir, {
        "src/tags.ts": `${TAGS}\nexport function deleteTag() {\n  return 0;\n}\n`,
      });
      git(tmpDir, "add src/tags.ts");
      const result = kibi(tmpDir, ["check", "--staged"]);
      expect(result.status).toBe(1);
      expect(result.output).toContain(
        "[BLOCKS COMMIT] deleteTag (src/tags.ts:",
      );
      expect(result.output).not.toContain("[BLOCKS COMMIT] tagIdSchema");
      expect(result.output).not.toContain("tagIdSchema (line");
    },
    TEST_TIMEOUT_MS,
  );

  test(
    "a comment inside the unrecorded neighbour does not put it in the change",
    () => {
      commitBase(fixture());
      writeFiles(tmpDir, {
        "src/tags.ts": TAGS.replace(
          'export const tagIdSchema = "tag";',
          'export const tagIdSchema = /* id */ "tag";',
        ).replace("return 1;", "return 2;"),
      });
      git(tmpDir, "add src/tags.ts");
      const result = kibi(tmpDir, ["check", "--staged"]);
      expect(result.output).not.toContain("Traceability failed");
      expect(result.status).toBe(0);
    },
    TEST_TIMEOUT_MS,
  );

  test(
    "a config record without a link satisfies the gate for a changed constant",
    () => {
      commitBase(
        fixture(`  - id: SYM-TAGS-ID-SCHEMA
    title: tagIdSchema
    sourceFile: src/tags.ts
    symbol_role: config
    status: active
`),
      );
      writeFiles(tmpDir, {
        "src/tags.ts": TAGS.replace('"tag"', '"label"'),
      });
      git(tmpDir, "add src/tags.ts");
      const result = kibi(tmpDir, ["check", "--staged"]);
      expect(result.output).not.toContain("Traceability failed");
      expect(result.output).not.toContain("symbol-coverage");
      expect(result.status).toBe(0);
    },
    TEST_TIMEOUT_MS,
  );

  test(
    "a non-behavioral role does not excuse a function or a function-valued constant",
    () => {
      commitBase(
        fixture(`  - id: SYM-TAGS-DELETE
    title: deleteTag
    sourceFile: src/tags.ts
    symbol_role: structural
    status: active
  - id: SYM-TAGS-HANDLER
    title: tagHandler
    sourceFile: src/tags.ts
    symbol_role: config
    status: active
`),
      );
      writeFiles(tmpDir, {
        "src/tags.ts": `${TAGS}\nexport function deleteTag() {\n  return 0;\n}\n\nexport const tagHandler = () => 0;\n`,
      });
      git(tmpDir, "add src/tags.ts");
      const result = kibi(tmpDir, ["check", "--staged"]);
      expect(result.status).toBe(1);
      expect(result.output).toContain("[BLOCKS COMMIT] deleteTag");
      expect(result.output).toContain("[BLOCKS COMMIT] tagHandler");
    },
    TEST_TIMEOUT_MS,
  );
});
