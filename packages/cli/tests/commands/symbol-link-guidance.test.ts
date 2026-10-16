import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "../helpers/isolated-env.js";

// implements REQ-kibi-symbol-link-guidance

const kibiCliEntry = path.resolve(__dirname, "../../src/cli.ts");
const TIMEOUT_MS = 240_000;

function runKibi(args: string[], cwd: string, input?: string) {
  const result = spawnSync("bun", [kibiCliEntry, ...args], {
    cwd,
    encoding: "utf8",
    timeout: TIMEOUT_MS,
    ...(input === undefined ? {} : { input }),
  });
  return {
    status: result.status,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

function upsert(root: string, payload: Record<string, unknown>) {
  return runKibi(["upsert", "--input", "-"], root, JSON.stringify(payload));
}

function git(cwd: string, ...args: string[]): void {
  spawnSync("git", args, { cwd, encoding: "utf8" });
}

function write(root: string, relative: string, content: string): void {
  const absolute = path.join(root, relative);
  mkdirSync(path.dirname(absolute), { recursive: true });
  writeFileSync(absolute, content, "utf8");
}

const FRONT =
  "created_at: 2026-10-01T00:00:00.000Z\nupdated_at: 2026-10-01T00:00:00.000Z\n";

describe("symbol link guidance", () => {
  let root: string;

  beforeEach(() => {
    root = realpathSync.native(
      mkdtempSync(path.join(os.tmpdir(), "kibi-symbol-links-")),
    );
    git(root, "init", "-b", "main");
    git(root, "config", "user.email", "test@example.com");
    git(root, "config", "user.name", "Kibi Test");
    git(root, "commit", "--allow-empty", "-m", "init");
    expect(runKibi(["init", "--no-hooks"], root).status).toBe(0);
  });

  afterEach(() => {
    runKibi(["engine", "stop"], root);
    if (existsSync(root)) rmSync(root, { recursive: true, force: true });
  });

  test(
    "a coarse link is refused when it is written, an invalid dry run is an error, and symbol-coverage names the missing test link",
    () => {
      // A public field is behavioral in the schema but is listed after the
      // methods, which are where a link usually belongs.
      write(
        root,
        "src/canvas.ts",
        "export class CanvasService {\n  anchorX = 0;\n  draw() {}\n  clear() {}\n}\n",
      );
      write(
        root,
        ".kb/requirements/REQ-canvas-draw.md",
        `---\nid: REQ-canvas-draw\ntitle: The canvas draws shapes\nstatus: open\n${FRONT}links:\n  - type: specified_by\n    target: SCEN-canvas-draw\n---\n\nThe canvas draws shapes.\n\n## Context\n\nUsers sketch on the canvas.\n`,
      );
      write(
        root,
        ".kb/scenarios/SCEN-canvas-draw.md",
        `---\nid: SCEN-canvas-draw\ntitle: Drawing a shape\nstatus: active\n${FRONT}---\n\nGiven an empty canvas, when the user draws a shape, then the shape is shown.\n`,
      );
      write(
        root,
        ".kb/tests/TEST-canvas-unit.md",
        `---\nid: TEST-canvas-unit\ntitle: Canvas unit tests\nstatus: passing\n${FRONT}---\n\nUnit tests for the canvas service.\n`,
      );
      git(root, "add", "--all");
      const sync = runKibi(["sync"], root);
      expect(sync.status, `${sync.stdout}\n${sync.stderr}`).toBe(0);

      const stored = upsert(root, {
        type: "symbol",
        id: "SYM-canvas-service",
        properties: {
          title: "CanvasService",
          status: "active",
          sourceFile: "src/canvas.ts",
        },
      });
      expect(stored.status, `${stored.stdout}\n${stored.stderr}`).toBe(0);

      // A links-only update names no sourceFile; the stored symbol's file is
      // still a class whose public methods are the granular symbols.
      const linksOnly = {
        type: "symbol",
        id: "SYM-canvas-service",
        properties: { title: "CanvasService", status: "active" },
        relationships: [
          {
            type: "implements",
            from: "SYM-canvas-service",
            to: "REQ-canvas-draw",
          },
          {
            type: "covered_by",
            from: "SYM-canvas-service",
            to: "TEST-canvas-unit",
          },
        ],
      };
      const coarse =
        "Symbol SYM-canvas-service links src/canvas.ts coarsely while granular symbols are available (behavioral only): CanvasService.clear, CanvasService.draw, CanvasService.anchorX.";
      const preview = upsert(root, { ...linksOnly, dryRun: true });
      expect(preview.status).toBe(1);
      const envelope = JSON.parse(preview.stdout) as {
        status: string;
        error: { code: string; message: string };
        data: { valid: boolean; dryRun: boolean };
      };
      expect(envelope.status).toBe("error");
      expect(envelope.error.code).toBe("UPSERT_DRY_RUN_INVALID");
      expect(envelope.error.message).toContain(coarse);
      expect(envelope.data).toMatchObject({ valid: false, dryRun: true });
      // The write itself is refused with a code, not only the dry run.
      const write_ = upsert(root, linksOnly);
      expect(write_.status).toBe(2);
      const refused = JSON.parse(write_.stdout) as {
        status: string;
        error: { code: string; message: string };
      };
      expect(refused.status).toBe("error");
      expect(refused.error.code).toBe("SYMBOL_GRANULARITY_VIOLATION");
      expect(refused.error.message).toContain(coarse);

      // The granular symbol takes the links; its test does not yet verify
      // the requirement's scenario.
      const granular = upsert(root, {
        type: "symbol",
        id: "SYM-canvas-draw",
        properties: {
          title: "CanvasService.draw",
          status: "active",
          sourceFile: "src/canvas.ts",
        },
        relationships: linksOnly.relationships.map((relationship) => ({
          ...relationship,
          from: "SYM-canvas-draw",
        })),
      });
      expect(granular.status, `${granular.stdout}\n${granular.stderr}`).toBe(0);
      const check = runKibi(
        ["check", "--rules", "symbol-coverage", "--format", "json"],
        root,
      );
      const violations = (
        JSON.parse(check.stdout) as {
          structuredContent: {
            violations: Array<{
              rule: string;
              entityId: string;
              description: string;
              suggestion: string;
            }>;
          };
        }
      ).structuredContent.violations.filter(
        (violation) => violation.entityId === "SYM-canvas-draw",
      );
      expect(violations).toHaveLength(1);
      expect(violations[0]?.description).toBe(
        "Production symbol lacks qualifying requirement coverage: SYM-canvas-draw is covered_by TEST-canvas-unit, but TEST-canvas-unit does not verify REQ-canvas-draw, which SYM-canvas-draw implements.",
      );
      expect(violations[0]?.suggestion).toBe(
        "Add verified_by(SCEN-canvas-draw, TEST-canvas-unit) (REQ-canvas-draw is specified_by SCEN-canvas-draw), or validates(TEST-canvas-unit, SCEN-canvas-draw).",
      );

      // An invalid test status lists the test vocabulary only.
      const status = upsert(root, {
        type: "test",
        id: "TEST-canvas-unit",
        dryRun: true,
        properties: { title: "Canvas unit tests", status: "unknown" },
      });
      expect(status.status).toBe(1);
      expect(status.stdout).toContain(
        "Allowed values for test entities: passing, failing, skipped, pending",
      );
      expect(status.stdout).not.toContain("accepted");
    },
    TIMEOUT_MS,
  );
});
