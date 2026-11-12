import { afterEach, describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  type DecisionSession,
  SIGNOFF_LATEST_JSON,
  captureReminder,
  claimCaptureReminder,
  claimDecisionFlag,
  claimSignoffReminder,
  firmEditConfirmation,
  firmEditContext,
  isRequirementUpsert,
  markDecisionFlag,
  recordRequest,
  rulePromptNote,
  settleFirmRequirements,
  settledFirmRequirements,
  signoffReminder,
  statedRule,
} from "../src/decision-guard";

const dirs: string[] = [];
afterEach(() => {
  for (const dir of dirs.splice(0))
    fs.rmSync(dir, { recursive: true, force: true });
});

function tempDir(prefix: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  dirs.push(dir);
  return dir;
}

function markerDir(stateDir: string, bucket: string): string {
  const key = createHash("sha256").update(bucket).digest("hex").slice(0, 32);
  return path.join(stateDir, "decision-guard", key);
}

describe("note texts", () => {
  test("confirmation drops trailing full stops only at the end", () => {
    const text = firmEditConfirmation("src/a.ts", [
      { id: "REQ-a", title: "Use v2.1 of the API..." },
    ]);
    expect(text).toBe(
      "Kibi: this edit changes src/a.ts, which implements a firm requirement recorded in the knowledge base: REQ-a: Use v2.1 of the API. Allow it if the change keeps that requirement, or if you mean to change the requirement too.",
    );
  });

  test("agent context, rule note and reminders are two lines each", () => {
    const texts = [
      firmEditContext(["REQ-a"]),
      rulePromptNote("never"),
      captureReminder(false),
      signoffReminder(),
    ];
    for (const text of texts) expect(text.split("\n")).toHaveLength(2);
    expect(texts[0]?.split("\n")[1]).toStartWith(
      "If the edit was declined or could not be confirmed, the requirement stands",
    );
    expect(texts[1]?.split("\n")[1]).toStartWith(
      "A rule the person states is project knowledge: kb_search shows",
    );
    expect(texts[2]?.split("\n")[1]).toStartWith(
      "A decision the person stated or this change made",
    );
    expect(texts[3]?.split("\n")[0]).toBe(
      "Kibi: this session recorded or changed requirements, and the person has not seen them as a signoff view.",
    );
  });

  test("'should always' and 'should never' are quoted whole", () => {
    expect(statedRule("You should always lint")).toBe("should always");
    expect(statedRule("It SHOULD NEVER block")).toBe("should never");
    expect(statedRule("only admin may delete")).toBe("only admin");
    expect(statedRule("only owner may delete")).toBe("only owner");
  });

  test("the signoff view path", () => {
    expect(SIGNOFF_LATEST_JSON.split(path.sep)).toEqual([
      ".kb",
      "briefs",
      "signoff",
      "latest.json",
    ]);
  });
});

describe("marker files", () => {
  test("live under a hashed session bucket and are empty", () => {
    const stateDir = tempDir("kibi-guard-c-");
    markDecisionFlag({ stateDir, sessionId: " one " }, "source-edited");
    const file = path.join(markerDir(stateDir, "one"), "source-edited");
    expect(fs.readFileSync(file, "utf8")).toBe("");
    expect(
      claimDecisionFlag({ stateDir, sessionId: undefined }, "capture-asked"),
    ).toBe(true);
    expect(
      fs.readFileSync(
        path.join(markerDir(stateDir, "unattributed"), "capture-asked"),
        "utf8",
      ),
    ).toBe("");
  });

  test("marking an existing flag keeps it set", () => {
    const s: DecisionSession = {
      stateDir: tempDir("kibi-guard-c-"),
      sessionId: "s",
    };
    markDecisionFlag(s, "kb-recorded");
    markDecisionFlag(s, "kb-recorded");
    expect(claimDecisionFlag(s, "kb-recorded")).toBe(false);
  });

  test("request words are stored as JSON", () => {
    const stateDir = tempDir("kibi-guard-c-");
    recordRequest({ stateDir, sessionId: "s" }, "retry the upload worker");
    expect(
      JSON.parse(
        fs.readFileSync(
          path.join(markerDir(stateDir, "s"), "request-words.json"),
          "utf8",
        ),
      ),
    ).toEqual(["retry", "upload", "worker"]);
  });

  test("settled ids drop non-strings and ignore non-array state", () => {
    const stateDir = tempDir("kibi-guard-c-");
    const s: DecisionSession = { stateDir, sessionId: "s" };
    const file = path.join(markerDir(stateDir, "s"), "firm-settled.json");
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(["REQ-a", 3, null]));
    expect([...settledFirmRequirements(s)]).toEqual(["REQ-a"]);
    fs.writeFileSync(file, JSON.stringify({ ids: ["REQ-b"] }));
    expect([...settledFirmRequirements(s)]).toEqual([]);
    settleFirmRequirements(s, ["REQ-c"]);
    expect(JSON.parse(fs.readFileSync(file, "utf8"))).toEqual(["REQ-c"]);
  });
});

describe("session guards", () => {
  test("an empty state directory remembers nothing", () => {
    const cwd = process.cwd();
    const here = tempDir("kibi-guard-cwd-");
    process.chdir(here);
    try {
      expect(
        claimDecisionFlag({ stateDir: "", sessionId: "s" }, "capture-asked"),
      ).toBe(false);
      expect(fs.readdirSync(here)).toEqual([]);
    } finally {
      process.chdir(cwd);
    }
  });

  test("another marker in the bucket is not a source edit", () => {
    const s: DecisionSession = {
      stateDir: tempDir("kibi-guard-c-"),
      sessionId: "s",
    };
    markDecisionFlag(s, "rule-prompt");
    expect(claimCaptureReminder(s)).toBe(false);
  });
});

describe("requirement upserts", () => {
  test("wrappers that are not objects fall back to the outer input", () => {
    expect(isRequirementUpsert({ type: "req", arguments: "x" })).toBe(true);
    expect(isRequirementUpsert({ type: "req", arguments: [] })).toBe(true);
    expect(isRequirementUpsert({ type: "req", arguments: null })).toBe(true);
    expect(isRequirementUpsert({ args: { type: "req" } })).toBe(true);
    expect(
      isRequirementUpsert({ arguments: { type: "symbol" }, type: "req" }),
    ).toBe(false);
    expect(isRequirementUpsert(null)).toBe(false);
    expect(isRequirementUpsert("req")).toBe(false);
  });
});

describe("signoff reminder timing", () => {
  test("a view written at the same moment as the requirement counts as shown", () => {
    const root = tempDir("kibi-guard-root-c-");
    const s: DecisionSession = {
      stateDir: tempDir("kibi-guard-c-"),
      sessionId: "s",
    };
    markDecisionFlag(s, "requirement-recorded");
    const marker = path.join(
      markerDir(s.stateDir as string, "s"),
      "requirement-recorded",
    );
    const latest = path.join(root, SIGNOFF_LATEST_JSON);
    fs.mkdirSync(path.dirname(latest), { recursive: true });
    fs.writeFileSync(latest, "{}");
    const moment = new Date(1_700_000_000_000);
    fs.utimesSync(marker, moment, moment);
    fs.utimesSync(latest, moment, moment);
    expect(claimSignoffReminder(s, root)).toBe(false);
    fs.rmSync(latest);
    expect(claimSignoffReminder(s, root)).toBe(true);
  });
});
