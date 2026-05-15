import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  hasTuiSeenBrief,
  markBriefTuiSeen,
} from "../src/idle-brief-reader";

describe("idle-brief-reader seen tracking", () => {
  let tmpDir = "";
  let briefsDir = "";

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-opencode-seen-"));
    briefsDir = path.join(tmpDir, ".kb", "briefs");
  });

  afterEach(() => {
    if (tmpDir && fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test("returns false when seen file is missing or invalid", () => {
    expect(hasTuiSeenBrief(tmpDir, "main", "hash-1")).toBe(false);

    fs.mkdirSync(briefsDir, { recursive: true });
    fs.writeFileSync(path.join(briefsDir, ".tui-seen.json"), "not-json", "utf8");

    expect(hasTuiSeenBrief(tmpDir, "main", "hash-1")).toBe(false);
  });

  test("marks hashes as seen, deduplicates, and keeps most recent first", () => {
    markBriefTuiSeen(tmpDir, "main", "hash-1");
    markBriefTuiSeen(tmpDir, "main", "hash-2");
    markBriefTuiSeen(tmpDir, "main", "hash-1");

    expect(hasTuiSeenBrief(tmpDir, "main", "hash-1")).toBe(true);
    expect(hasTuiSeenBrief(tmpDir, "main", "hash-2")).toBe(true);
    expect(hasTuiSeenBrief(tmpDir, "feature", "hash-1")).toBe(false);

    const parsed = JSON.parse(
      fs.readFileSync(path.join(briefsDir, ".tui-seen.json"), "utf8"),
    ) as Record<string, string[]>;
    expect(parsed.main).toEqual(["hash-1", "hash-2"]);
  });

  test("recovers from malformed seen file content", () => {
    fs.mkdirSync(briefsDir, { recursive: true });
    fs.writeFileSync(
      path.join(briefsDir, ".tui-seen.json"),
      JSON.stringify({ main: "wrong-shape" }),
      "utf8",
    );

    markBriefTuiSeen(tmpDir, "main", "hash-3");

    expect(hasTuiSeenBrief(tmpDir, "main", "hash-3")).toBe(true);
  });
});
