// implements REQ-agent-hosts-decision-guard
import { afterEach, describe, expect, test } from "bun:test";
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
  confirmFirmEdits,
  firmEditConfirmation,
  firmEditContext,
  firmEditNotice,
  firmRequirementsTouched,
  hasDecisionFlag,
  holdRuleNote,
  isRequirementUpsert,
  markDecisionFlag,
  recordRequest,
  requestWords,
  rulePromptNote,
  settleFirmRequirements,
  settledFirmRequirements,
  signoffReminder,
  statedRule,
  takeRuleNote,
} from "../src/decision-guard";
import type { EntitySummary, IndexedSymbol } from "../src/knowledge-index";

const dirs: string[] = [];
afterEach(() => {
  for (const dir of dirs.splice(0))
    fs.rmSync(dir, { recursive: true, force: true });
});

function session(sessionId: string | undefined = "session-a"): DecisionSession {
  const stateDir = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-guard-"));
  dirs.push(stateDir);
  return { stateDir, sessionId };
}

const noState: DecisionSession = { stateDir: undefined, sessionId: "s" };

function symbol(
  id: string,
  line: number,
  endLine: number,
  implementsIds: string[],
): IndexedSymbol {
  return {
    id,
    title: id,
    line,
    endLine,
    implements: implementsIds,
    coveredBy: [],
    executableFor: [],
  };
}

const summaries: Record<string, EntitySummary> = {
  "REQ-firm": { id: "REQ-firm", title: "Firm rule", firmness: "firm" },
  "REQ-default": { id: "REQ-default", firmness: "default" },
  "REQ-retired": {
    id: "REQ-retired",
    status: "deprecated",
    firmness: "firm",
  },
  "REQ-other-firm": { id: "REQ-other-firm", firmness: "firm" },
};
const summarize = (id: string): EntitySummary => summaries[id] ?? { id };

describe("confirmFirmEdits", () => {
  test("is on unless the operator turns it off", () => {
    expect(confirmFirmEdits({})).toBe(true);
    expect(confirmFirmEdits({ KIBI_CONFIRM_FIRM_EDITS: "1" })).toBe(true);
    for (const off of ["0", "false", " OFF ", "False"])
      expect(confirmFirmEdits({ KIBI_CONFIRM_FIRM_EDITS: off })).toBe(false);
  });
});

describe("firmRequirementsTouched", () => {
  const symbols = [
    symbol("SYM-outer", 1, 40, ["REQ-default", "REQ-other-firm"]),
    symbol("SYM-inner", 10, 12, ["REQ-firm", "REQ-retired"]),
  ];

  test("keeps only current firm requirements of the symbols the edit lands in", () => {
    const result = firmRequirementsTouched({
      symbols,
      focus: [{ start: 11, end: 11 }],
      wholeFile: false,
      summarize,
    });
    // The innermost symbol is reported as the edit location.
    expect(result.symbol?.id).toBe("SYM-inner");
    expect(result.ids.sort()).toEqual(["REQ-firm", "REQ-other-firm"]);
  });

  test("an edit outside every symbol or with no known location touches nothing", () => {
    for (const focus of [undefined, [], [{ start: 90, end: 95 }]]) {
      const result = firmRequirementsTouched({
        symbols,
        focus,
        wholeFile: false,
        summarize,
      });
      expect(result).toEqual({ ids: [], symbol: undefined });
    }
  });

  test("a whole-file write covers every symbol and skips confirmed ids", () => {
    const result = firmRequirementsTouched({
      symbols,
      focus: undefined,
      wholeFile: true,
      summarize,
      confirmed: new Set(["REQ-other-firm"]),
    });
    expect(result).toEqual({ ids: ["REQ-firm"], symbol: undefined });
  });
});

describe("firm edit texts", () => {
  const firm: EntitySummary = { id: "REQ-a", title: "Only admins delete" };
  const untitled: EntitySummary = { id: "REQ-b" };
  const third: EntitySummary = { id: "REQ-c", title: "Third" };

  test("confirmation names up to two requirements and counts the rest", () => {
    const text = firmEditConfirmation("remove in src/a.ts", [
      firm,
      untitled,
      third,
    ]);
    expect(text).toContain(
      "which implements firm requirements recorded in the knowledge base: REQ-a: Only admins delete; REQ-b (+1 more).",
    );
    expect(text).toContain("keeps them, or if you mean to change them too.");
    expect(text).not.toContain("REQ-c");
  });

  test("agent context distinguishes one requirement from several", () => {
    expect(firmEditContext(["REQ-a"])).toStartWith(
      "Kibi asked the person to confirm this edit because it changes code that implements firm requirement REQ-a.",
    );
    expect(firmEditContext(["REQ-a", "REQ-b", "REQ-c"])).toStartWith(
      "Kibi asked the person to confirm this edit because it changes code that implements firm requirements REQ-a, REQ-b.",
    );
  });

  test("notice for hosts that cannot ask tells the agent to ask first", () => {
    expect(firmEditNotice("src/a.ts", [firm])).toBe(
      [
        "Kibi: this edit changes src/a.ts, which implements a firm requirement, a rule the person set: REQ-a: Only admins delete.",
        "Unless the edit keeps that rule, ask the person before making it and name the rule; change the requirement with kb_upsert in this change only when they say so.",
      ].join("\n"),
    );
    const many = firmEditNotice("src/a.ts", [firm, untitled, third]);
    expect(many).toContain(
      "implements firm requirements, a rule the person set: REQ-a: Only admins delete; REQ-b (+1 more).",
    );
    expect(many).toContain("Unless the edit keeps those rules");
  });
});

describe("statedRule and notes", () => {
  test("finds the phrase that makes a request read as a rule", () => {
    expect(statedRule("From now on, only admins may delete")).toBe(
      "from now on",
    );
    expect(statedRule("Users mustn't see drafts")).toBe("mustn't");
    expect(statedRule("A title is required here")).toBe("is required");
    expect(statedRule("Please rename the helper")).toBeUndefined();
  });

  test("prompt note quotes the phrase and capture reminder mentions the rule", () => {
    expect(rulePromptNote("never")).toStartWith(
      'Kibi: this request reads as a rule or decision (it says "never").',
    );
    expect(captureReminder(true)).toStartWith(
      "Kibi: a request this session read as a rule or decision",
    );
    expect(captureReminder(false)).toStartWith(
      "Kibi: this session changed source files and recorded nothing",
    );
  });
});

describe("session markers", () => {
  test("flags are scoped to the session id", () => {
    const a = session("one");
    const b: DecisionSession = { stateDir: a.stateDir, sessionId: "two" };
    expect(hasDecisionFlag(a, "source-edited")).toBe(false);
    markDecisionFlag(a, "source-edited");
    expect(hasDecisionFlag(a, "source-edited")).toBe(true);
    expect(hasDecisionFlag(b, "source-edited")).toBe(false);
  });

  test("a blank session id shares the unattributed bucket", () => {
    const a = session("  ");
    const b: DecisionSession = { stateDir: a.stateDir, sessionId: undefined };
    markDecisionFlag(a, "kb-recorded");
    expect(hasDecisionFlag(b, "kb-recorded")).toBe(true);
  });

  test("claiming succeeds once and never without a state directory", () => {
    const s = session();
    expect(claimDecisionFlag(s, "capture-asked")).toBe(true);
    expect(claimDecisionFlag(s, "capture-asked")).toBe(false);
    expect(claimDecisionFlag(noState, "capture-asked")).toBe(false);
    markDecisionFlag(noState, "source-edited");
    expect(hasDecisionFlag(noState, "source-edited")).toBe(false);
  });

  test("capture reminder needs a source edit, no KB write, and is asked once", () => {
    const idle = session();
    expect(claimCaptureReminder(idle)).toBe(false);

    const recorded = session();
    markDecisionFlag(recorded, "source-edited");
    markDecisionFlag(recorded, "kb-recorded");
    expect(claimCaptureReminder(recorded)).toBe(false);

    const unrecorded = session();
    markDecisionFlag(unrecorded, "source-edited");
    expect(claimCaptureReminder(unrecorded)).toBe(true);
    expect(claimCaptureReminder(unrecorded)).toBe(false);
  });

  test("a requirement write is a kb_upsert of type req that is not a dry run", () => {
    expect(isRequirementUpsert({ type: "req", id: "REQ-a" })).toBe(true);
    expect(
      isRequirementUpsert({ arguments: { type: "req", id: "REQ-a" } }),
    ).toBe(true);
    expect(isRequirementUpsert({ type: "req", dryRun: true })).toBe(false);
    expect(isRequirementUpsert({ type: "symbol" })).toBe(false);
    expect(isRequirementUpsert(undefined)).toBe(false);
  });

  test("signoff reminder needs a requirement write newer than the last view, once", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-guard-root-"));
    dirs.push(root);
    const idle = session();
    expect(claimSignoffReminder(idle, root)).toBe(false);

    const shown = session();
    markDecisionFlag(shown, "requirement-recorded");
    const latest = path.join(root, SIGNOFF_LATEST_JSON);
    fs.mkdirSync(path.dirname(latest), { recursive: true });
    fs.writeFileSync(latest, "{}");
    const later = new Date(Date.now() + 60_000);
    fs.utimesSync(latest, later, later);
    expect(claimSignoffReminder(shown, root)).toBe(false);

    const unshown = session();
    markDecisionFlag(unshown, "requirement-recorded");
    const earlier = new Date(Date.now() - 60_000);
    fs.utimesSync(latest, earlier, earlier);
    expect(claimSignoffReminder(unshown, root)).toBe(true);
    expect(claimSignoffReminder(unshown, root)).toBe(false);
    expect(signoffReminder()).toContain("run `kibi signoff`");
  });

  test("marker writes are best effort when the state directory is unusable", () => {
    const parent = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-guard-file-"));
    dirs.push(parent);
    const blocker = path.join(parent, "not-a-dir");
    fs.writeFileSync(blocker, "");
    const broken: DecisionSession = { stateDir: blocker, sessionId: "s" };
    expect(() => markDecisionFlag(broken, "source-edited")).not.toThrow();
    expect(claimDecisionFlag(broken, "capture-asked")).toBe(false);
    expect(() => settleFirmRequirements(broken, ["REQ-a"])).not.toThrow();
    expect(() => holdRuleNote(broken, "never")).not.toThrow();
    expect(recordRequest(broken, "never log tokens")).toBe("never");
    expect(requestWords(broken)).toEqual([]);
  });
});

describe("request memory", () => {
  test("records topic words and marks rule prompts", () => {
    const s = session();
    expect(
      recordRequest(s, "Please add retry logic to the upload worker"),
    ).toBe(undefined);
    expect(hasDecisionFlag(s, "rule-prompt")).toBe(false);
    const words = requestWords(s);
    expect(words).toContain("retry");
    expect(words).toContain("upload");
    expect(words).not.toContain("please");

    expect(recordRequest(s, "Uploads must never exceed 10 MB")).toBe("must");
    expect(hasDecisionFlag(s, "rule-prompt")).toBe(true);
    expect(requestWords(s)).toEqual(["upload", "exceed"]);
  });

  test("request words ignore missing, corrupt or non-array state", () => {
    expect(requestWords(noState)).toEqual([]);
    const s = session();
    expect(requestWords(s)).toEqual([]);
    recordRequest(s, "seed words");
    const file = fs
      .readdirSync(path.join(s.stateDir as string, "decision-guard"), {
        recursive: true,
        encoding: "utf8",
      })
      .find((entry) => entry.endsWith("request-words.json")) as string;
    const full = path.join(s.stateDir as string, "decision-guard", file);
    fs.writeFileSync(full, "{not json");
    expect(requestWords(s)).toEqual([]);
    fs.writeFileSync(full, JSON.stringify({ words: ["x"] }));
    expect(requestWords(s)).toEqual([]);
    fs.writeFileSync(full, JSON.stringify(["kept", 3, null]));
    expect(requestWords(s)).toEqual(["kept"]);
  });
});

describe("settled firm requirements", () => {
  test("accumulate without duplicates", () => {
    const s = session();
    expect([...settledFirmRequirements(s)]).toEqual([]);
    settleFirmRequirements(s, ["REQ-a", "REQ-b"]);
    settleFirmRequirements(s, ["REQ-b", "REQ-c"]);
    expect([...settledFirmRequirements(s)].sort()).toEqual([
      "REQ-a",
      "REQ-b",
      "REQ-c",
    ]);
    settleFirmRequirements(noState, ["REQ-a"]);
    expect([...settledFirmRequirements(noState)]).toEqual([]);
  });
});

describe("held rule notes", () => {
  test("are delivered once", () => {
    const s = session();
    expect(takeRuleNote(s)).toBeUndefined();
    holdRuleNote(s, "from now on");
    expect(takeRuleNote(s)).toBe(rulePromptNote("from now on"));
    expect(takeRuleNote(s)).toBeUndefined();
    holdRuleNote(noState, "never");
    expect(takeRuleNote(noState)).toBeUndefined();
  });
});
