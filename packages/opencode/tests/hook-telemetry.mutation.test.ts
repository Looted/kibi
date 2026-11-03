/// <reference types="bun-types" />
// implements REQ-opencode-kibi-plugin-v1, REQ-kibi-telemetry-acceptance-gate-v2
import { afterEach, describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { recordOpencodeToolTelemetry } from "../src/hook-telemetry.js";

const PACKAGE_VERSION = (
  JSON.parse(
    fs.readFileSync(path.join(import.meta.dir, "..", "package.json"), "utf8"),
  ) as { version: string }
).version;

const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

function tempDir(prefix: string): string {
  const dir = fs.realpathSync.native(
    fs.mkdtempSync(path.join(os.tmpdir(), prefix)),
  );
  roots.push(dir);
  return dir;
}

/** A workspace with a `.kb` directory and a symbol implementing a requirement. */
function workspace(withKb = true): string {
  const root = tempDir("kibi-oc-hook-tel-");
  if (withKb) {
    fs.mkdirSync(path.join(root, ".kb"));
    fs.writeFileSync(
      path.join(root, ".kb", "symbols.yaml"),
      [
        "symbols:",
        "  - id: SYM-a",
        "    title: a",
        "    sourceFile: src/a.ts",
        "    relationships:",
        "      - type: implements",
        "        target: REQ-a",
        "",
      ].join("\n"),
    );
  }
  return root;
}

function diagnosticEnv(): NodeJS.ProcessEnv {
  return { KIBI_DIAGNOSTIC_MODE: "1", KIBI_TELEMETRY: "0" };
}

type Row = Record<string, unknown>;

function rows(root: string): Row[] {
  const logPath = path.join(root, ".kb", "usage.log");
  if (!fs.existsSync(logPath)) return [];
  return fs
    .readFileSync(logPath, "utf8")
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line) as Row);
}

/** Tool args whose reads are counted, to see whether the hook looked at them. */
function watchedArgs(filePath: string): { args: object; reads: () => number } {
  let reads = 0;
  const args = {
    get filePath() {
      reads += 1;
      return filePath;
    },
  };
  return { args, reads: () => reads };
}

const startedAt = new Date("2026-01-01T00:00:00.000Z");

describe("recordOpencodeToolTelemetry", () => {
  test("writes one edited row with the linked requirements and package version", () => {
    const root = workspace();
    recordOpencodeToolTelemetry(
      {
        worktree: root,
        tool: "edit",
        args: { filePath: path.join(root, "src", "a.ts") },
        sessionId: "ses-1",
        startedAt,
      },
      diagnosticEnv(),
    );
    const [row, ...rest] = rows(root);
    expect(rest).toStrictEqual([]);
    expect(row?.tool).toBe("hook_tool.execute.after");
    expect(row?.hook_event).toBe("tool.execute.after");
    expect(row?.host).toBe("opencode");
    expect(row?.package_version).toBe(PACKAGE_VERSION);
    expect(row?.workspace_root).toBe(root);
    expect(row?.session_id).toBe("ses-1");
    expect(row?.host_tool).toBe("edit");
    expect(row?.hook_action).toBe("edited");
    expect(row?.path).toBe("src/a.ts");
    expect(row?.requirement_ids).toStrictEqual(["REQ-a"]);
  });

  test.each(["edit", "write", "patch", "multiedit"])(
    "the %s tool counts as an edit",
    (tool) => {
      const root = workspace();
      recordOpencodeToolTelemetry(
        {
          worktree: root,
          tool,
          args: { filePath: path.join(root, "src", "b.ts") },
          sessionId: "ses-2",
          startedAt,
        },
        diagnosticEnv(),
      );
      expect(rows(root).map((row) => [row.host_tool, row.path])).toStrictEqual([
        [tool, "src/b.ts"],
      ]);
    },
  );

  test("other tools and undefined tools write nothing", () => {
    const root = workspace();
    for (const tool of ["read", undefined]) {
      recordOpencodeToolTelemetry(
        {
          worktree: root,
          tool,
          args: { filePath: path.join(root, "src", "a.ts") },
          sessionId: "ses-3",
          startedAt,
        },
        diagnosticEnv(),
      );
    }
    expect(rows(root)).toStrictEqual([]);
  });

  test("records a Kibi lookup as a kb_usage row", () => {
    const root = workspace();
    recordOpencodeToolTelemetry(
      {
        worktree: root,
        tool: "kibi_kb_search",
        args: { query: "x" },
        sessionId: "ses-4",
        startedAt,
      },
      diagnosticEnv(),
    );
    expect(
      rows(root).map((row) => [row.hook_action, row.kb_operation]),
    ).toStrictEqual([["kb_usage", "kb_search"]]);
  });

  test("paths outside the workspace are dropped, keeping the others", () => {
    const root = workspace();
    const outside = tempDir("kibi-oc-hook-outside-");
    recordOpencodeToolTelemetry(
      {
        worktree: root,
        tool: "multiedit",
        args: {
          edits: [
            { filePath: path.join(outside, "x.ts") },
            { filePath: path.join(root, "src", "a.ts") },
          ],
          filePath: path.join(outside, "y.ts"),
          path: path.join(root, "src", "c.ts"),
        },
        sessionId: "ses-5",
        startedAt,
      },
      diagnosticEnv(),
    );
    const paths = rows(root).map((row) => row.path);
    expect(paths.length).toBeGreaterThan(0);
    for (const relative of paths) {
      expect(String(relative).startsWith("src/")).toBe(true);
    }
  });

  test("does not look at the call when no hook telemetry is wanted", () => {
    const root = workspace();
    const watched = watchedArgs(path.join(root, "src", "a.ts"));
    recordOpencodeToolTelemetry(
      {
        worktree: root,
        tool: "edit",
        args: watched.args,
        sessionId: "ses-6",
        startedAt,
      },
      { KIBI_TELEMETRY: "0" },
    );
    expect(watched.reads()).toBe(0);
    expect(rows(root)).toStrictEqual([]);
  });

  test("a workspace without .kb is left alone", () => {
    const root = workspace(false);
    const watched = watchedArgs(path.join(root, "src", "a.ts"));
    recordOpencodeToolTelemetry(
      {
        worktree: root,
        tool: "edit",
        args: watched.args,
        sessionId: "ses-7",
        startedAt,
      },
      diagnosticEnv(),
    );
    expect(watched.reads()).toBe(0);
    expect(fs.existsSync(path.join(root, ".kb"))).toBe(false);
  });

  test("remembers the session only for a Kibi workspace", () => {
    const telemetryDir = tempDir("kibi-oc-hook-teldir-");
    const env: NodeJS.ProcessEnv = {
      KIBI_TELEMETRY: "1",
      KIBI_TELEMETRY_DIR: telemetryDir,
      KIBI_TELEMETRY_HOST: "http://127.0.0.1:9",
    };
    const sessions = path.join(telemetryDir, "telemetry-sessions.json");
    const bare = workspace(false);
    recordOpencodeToolTelemetry(
      {
        worktree: bare,
        tool: "read",
        args: {},
        sessionId: "ses-8",
        startedAt,
      },
      env,
    );
    expect(fs.existsSync(sessions)).toBe(false);

    const root = workspace();
    recordOpencodeToolTelemetry(
      {
        worktree: root,
        tool: "read",
        args: {},
        sessionId: "ses-8",
        startedAt,
      },
      env,
    );
    expect(
      Object.keys(JSON.parse(fs.readFileSync(sessions, "utf8"))),
    ).toHaveLength(1);
  });
});
