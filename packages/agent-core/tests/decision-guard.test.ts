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
  claimRuleCaptureTemplate,
  claimSignoffReminder,
  confirmFirmEdits,
  firmEditConfirmation,
  firmEditContext,
  firmEditNotice,
  firmRequirementsTouched,
  hasDecisionFlag,
  holdRuleNote,
  isDeadImplementsComment,
  isRequirementUpsert,
  markDecisionFlag,
  recordRequest,
  removesOnlyDeadImplementsComments,
  removesTrailingDeadImplementsComment,
  requestWords,
  ruleCaptureTemplate,
  rulePromptNote,
  sessionRulePhrase,
  sessionRuleReason,
  settleFirmRequirements,
  settledFirmRequirements,
  signoffReminder,
  startDecisionSession,
  statedReason,
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

describe("dead implements comments", () => {
  test("only a line that is nothing but an implements comment counts", () => {
    for (const line of [
      "// implements REQ-a",
      "  # implements REQ-A-1, REQ-b_2",
      "% implements: REQ-a",
      " * implements REQ-a",
      "/* implements REQ-a */",
      "-- Implements REQ-a",
    ]) {
      expect(isDeadImplementsComment(line)).toBe(true);
    }
    for (const line of [
      "",
      "// this class implements Runnable",
      "total += 1; // implements REQ-a",
      "// implements REQ-a and more",
      "implements REQ-a",
      "// covered_by TEST-a",
    ]) {
      expect(isDeadImplementsComment(line)).toBe(false);
    }
  });

  test("each comment marker, spacing and id list form is read exactly", () => {
    for (const line of [
      "/// implements REQ-a",
      "## implements REQ-a",
      "%% implements REQ-a",
      "/** implements REQ-a */",
      "/* implements REQ-a */  ",
      "//implements REQ-a",
      "// implements : REQ-a",
      "// implements:REQ-a",
      "// implements  REQ-a",
      "// implements REQ-a , REQ-b",
      "// implements REQ-a,REQ-b",
      "// implements REQ-a, REQ-b",
    ]) {
      expect(isDeadImplementsComment(line)).toBe(true);
    }
  });

  test("a trailing comment is read with the same markers and forms", () => {
    const cut = removesTrailingDeadImplementsComment;
    for (const comment of [
      "/// implements REQ-a",
      "## implements REQ-a",
      "%% implements REQ-a",
      "/** implements REQ-a */",
      "/* implements REQ-a */  ",
      "//implements REQ-a",
      "// implements : REQ-a",
      "// implements:REQ-a",
      "// implements  REQ-a",
      "// implements REQ-ab",
      "// implements REQ-a , REQ-b",
      "// implements REQ-a,REQ-b",
      "// implements REQ-a, REQ-b",
      "// implements REQ-a, REQ-bc",
    ]) {
      expect(cut(`f(); ${comment}`, "f();")).toBe(true);
    }
    // The comment must start the cut text and end the line.
    expect(cut("f(); y // implements REQ-a", "f();")).toBe(false);
    expect(cut("f(); // implements REQ-a x", "f();")).toBe(false);
  });

  test("an edit that only deletes such comments is recognized", () => {
    const only = (input: unknown) =>
      removesOnlyDeadImplementsComments("/nonexistent", input);
    expect(
      only({
        old_string: "# implements REQ-a\ndef f():\n    # implements REQ-b\n",
        new_string: "def f():\n",
      }),
    ).toBe(true);
    expect(
      only({
        edits: [
          { oldString: "// implements REQ-a\nfn();", newString: "fn();" },
          { old_string: "x\n// implements REQ-b", new_string: "x" },
        ],
      }),
    ).toBe(true);
    // Nothing removed, code changed, code removed, or a comment added.
    expect(only({ old_string: "fn();", new_string: "fn();" })).toBe(false);
    expect(
      only({ old_string: "// implements REQ-a\nfn();", new_string: "fn2();" }),
    ).toBe(false);
    expect(
      only({ old_string: "// implements REQ-a\nfn();", new_string: "" }),
    ).toBe(false);
    expect(
      only({ old_string: "fn();", new_string: "// implements REQ-a\nfn();" }),
    ).toBe(false);
    expect(
      only({
        edits: [
          { old_string: "// implements REQ-a\nfn();", new_string: "fn();" },
          { old_string: "a", new_string: "b" },
        ],
      }),
    ).toBe(false);
    // A code line dropped, or a line added after the kept code.
    expect(only({ old_string: "a\nb", new_string: "a" })).toBe(false);
    expect(
      only({ old_string: "// implements REQ-a\nx\ny", new_string: "y" }),
    ).toBe(false);
    expect(
      only({ old_string: "// implements REQ-a\nx", new_string: "x\ny" }),
    ).toBe(false);
    // A half or malformed edit beside a good one spoils the whole call.
    const good = { old_string: "// implements REQ-b\nx", new_string: "x" };
    expect(only({ edits: [good] })).toBe(true);
    expect(only({ edits: [{ old_string: "// implements REQ-a" }, good] })).toBe(
      false,
    );
    expect(only({ edits: [{ new_string: "x" }, good] })).toBe(false);
    expect(only({ edits: [{ old_string: 5, new_string: "x" }, good] })).toBe(
      false,
    );
    // Half an edit, no edit at all, or a shell command.
    expect(only({ old_string: "// implements REQ-a" })).toBe(false);
    expect(only({})).toBe(false);
    expect(only(undefined)).toBe(false);
    expect(only({ command: "sed -i /implements/d a.py" })).toBe(false);
  });

  test("a trailing comment cut off a code line is recognized", () => {
    const cut = removesTrailingDeadImplementsComment;
    expect(cut("total += 1; // implements REQ-a", "total += 1;")).toBe(true);
    expect(cut("total += 1;// implements REQ-a", "total += 1;")).toBe(true);
    expect(cut("x = f()  # implements: REQ-a, REQ-b", "x = f()")).toBe(true);
    expect(cut("go(). % implements REQ-a", "go(). ")).toBe(true);
    expect(cut('s = "a" /* implements REQ-a */', 's = "a"')).toBe(true);
    // The code changed, the cut is no implements comment, the comment sits
    // inside a string, the marker touches the code, or no code is left.
    expect(cut("total += 1; // implements REQ-a", "total += 2;")).toBe(false);
    expect(cut("total += 1; // keep REQ-a", "total += 1;")).toBe(false);
    expect(cut('s = "a // implements REQ-a"', 's = "a')).toBe(false);
    expect(cut("s = 'a # implements REQ-a'", "s = 'a")).toBe(false);
    expect(cut("x#implements REQ-a", "x")).toBe(false);
    expect(cut("// implements REQ-a", "")).toBe(false);
    expect(cut("  // implements REQ-a", "")).toBe(false);
    // A quote the kept code leaves open makes the cut text part of a string;
    // an escaped quote does not count.
    expect(cut('s = "a // implements REQ-a', 's = "a')).toBe(false);
    expect(cut("s = `a // implements REQ-a", "s = `a")).toBe(false);
    expect(cut('s = "a\\"b"; // implements REQ-a', 's = "a\\"b";')).toBe(true);
    expect(
      removesOnlyDeadImplementsComments("/nonexistent", {
        old_string: "a();\nb(); // implements REQ-a\n// implements REQ-b\nc();",
        new_string: "a();\nb();\nc();",
      }),
    ).toBe(true);
    expect(
      removesOnlyDeadImplementsComments("/nonexistent", {
        old_string: 'b("x // implements REQ-a")',
        new_string: 'b("x',
      }),
    ).toBe(false);
  });

  test("a whole-file write is compared with the file on disk", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-guard-"));
    dirs.push(dir);
    const file = path.join(dir, "a.py");
    fs.writeFileSync(file, "# implements REQ-a\ndef f():\n    return 1\n");
    expect(
      removesOnlyDeadImplementsComments(file, {
        content: "def f():\n    return 1\n",
      }),
    ).toBe(true);
    expect(
      removesOnlyDeadImplementsComments(file, {
        content: "def f():\n    return 2\n",
      }),
    ).toBe(false);
    expect(
      removesOnlyDeadImplementsComments(path.join(dir, "missing.py"), {
        content: "x",
      }),
    ).toBe(false);
    // No content, or content that is not text, says nothing about the file.
    expect(removesOnlyDeadImplementsComments(file, {})).toBe(false);
    expect(removesOnlyDeadImplementsComments(file, { content: 5 })).toBe(false);
  });

  test("a whole-file write of a file over 2 MiB is not compared", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-guard-"));
    dirs.push(dir);
    const file = path.join(dir, "big.ts");
    const header = "// implements REQ-a\n";
    const limit = 2 * 1024 * 1024;
    const body = (size: number) => "x".repeat(size - header.length - 1);
    fs.writeFileSync(file, `${header}${body(limit)}\n`);
    expect(
      removesOnlyDeadImplementsComments(file, { content: `${body(limit)}\n` }),
    ).toBe(true);
    fs.writeFileSync(file, `${header}${body(limit + 1)}\n`);
    expect(
      removesOnlyDeadImplementsComments(file, {
        content: `${body(limit + 1)}\n`,
      }),
    ).toBe(false);
  });

  describe("apply_patch envelopes", () => {
    const base = path.join(os.tmpdir(), "kibi-guard-patch");
    const file = path.join(base, "src", "a.ts");
    const envelope = (...lines: string[]) =>
      ["*** Begin Patch", ...lines, "*** End Patch"].join("\n");
    const only = (patch: string, key = "command", at: string | null = base) =>
      removesOnlyDeadImplementsComments(
        file,
        { [key]: patch },
        at ?? undefined,
      );

    test("a section header is a whole line of its own", () => {
      // Header text inside an added line is content, not a new section.
      expect(
        only(
          envelope(
            "*** Update File: src/a.ts",
            "@@",
            "-// implements REQ-a",
            "+x *** Delete File: src/b.ts",
          ),
        ),
      ).toBe(false);
      // A path that runs past a line separator is no header.
      expect(
        only(
          envelope(
            "*** Update File: src/a.ts\u2028x",
            "@@",
            "-// implements REQ-a",
          ),
        ),
      ).toBe(false);
    });

    test("a section that only removes implements comments is recognized", () => {
      const patch = envelope(
        "*** Update File: src/a.ts",
        "@@ export function f() {",
        "-// implements REQ-a",
        " export function f() {",
        "-  // implements REQ-b, REQ-c",
        "   return 1;",
        "*** End of File",
      );
      expect(only(patch)).toBe(true);
      // Blank lines in a hunk, and whitespace around the envelope and its
      // markers and headers.
      expect(
        only(
          envelope(
            "*** Update File: src/a.ts",
            "@@",
            "-// implements REQ-a",
            "",
            " export const a = 1;",
          ),
        ),
      ).toBe(true);
      expect(
        only(
          [
            "",
            "*** Begin Patch  ",
            "  *** Update File: src/a.ts ",
            "@@",
            "-// implements REQ-a",
            "  *** End Patch",
            "",
          ].join("\n"),
        ),
      ).toBe(true);
      // Every field a host carries a patch in, and an absolute header path.
      for (const key of ["patch", "input", "patchText"]) {
        expect(only(patch, key)).toBe(true);
      }
      expect(
        only(
          envelope(
            `*** Update File: ${file}`,
            "@@",
            "-// implements REQ-a",
            " export const a = 1;",
          ),
        ),
      ).toBe(true);
    });

    test("a code line replaced by itself without its trailing comment counts", () => {
      expect(
        only(
          envelope(
            "*** Update File: src/a.ts",
            "@@",
            "-export const f = () => 1; // implements REQ-a",
            "+export const f = () => 1;",
            "-// implements REQ-b",
          ),
        ),
      ).toBe(true);
      // A replacement that also changes the code, or an added line alone.
      expect(
        only(
          envelope(
            "*** Update File: src/a.ts",
            "-export const f = () => 1; // implements REQ-a",
            "+export const f = () => 2;",
          ),
        ),
      ).toBe(false);
      expect(
        only(
          envelope(
            "*** Update File: src/a.ts",
            "-export const s = 'x // implements REQ-a';",
            "+export const s = 'x",
          ),
        ),
      ).toBe(false);
      expect(
        only(
          envelope(
            "*** Update File: src/a.ts",
            "-export const f = () => 1; // implements REQ-a",
          ),
        ),
      ).toBe(false);
      // The stripped line must be added back, not kept as context.
      expect(
        only(
          envelope(
            "*** Update File: src/a.ts",
            "-export const f = () => 1; // implements REQ-a",
            " export const f = () => 1;",
          ),
        ),
      ).toBe(false);
    });

    test("a section that also changes code, adds a line or removes nothing is not", () => {
      expect(
        only(
          envelope(
            "*** Update File: src/a.ts",
            "@@",
            "-// implements REQ-a",
            "-export const a = 1;",
            "+export const a = 2;",
          ),
        ),
      ).toBe(false);
      expect(
        only(
          envelope(
            "*** Update File: src/a.ts",
            "@@",
            "-// implements REQ-a",
            "+// implements REQ-b",
          ),
        ),
      ).toBe(false);
      expect(
        only(
          envelope("*** Update File: src/a.ts", "@@", " export const a = 1;"),
        ),
      ).toBe(false);
      // A code line deleted beside a comment.
      expect(
        only(
          envelope(
            "*** Update File: src/a.ts",
            "@@",
            "-// implements REQ-a",
            "-export const a = 1;",
          ),
        ),
      ).toBe(false);
    });

    test("adding, deleting or moving the file is not", () => {
      expect(
        only(envelope("*** Add File: src/a.ts", "+// implements REQ-a")),
      ).toBe(false);
      expect(only(envelope("*** Delete File: src/a.ts"))).toBe(false);
      expect(
        only(envelope("*** Delete File: src/a.ts", "-// implements REQ-a")),
      ).toBe(false);
      expect(
        only(
          envelope(
            "*** Update File: src/a.ts",
            "*** Move to: src/b.ts",
            "@@",
            "-// implements REQ-a",
          ),
        ),
      ).toBe(false);
    });

    test("in a multi-file patch only the section for the file counts", () => {
      const patch = envelope(
        "*** Update File: src/a.ts",
        "@@",
        "-// implements REQ-a",
        " export const a = 1;",
        "*** Update File: src/other.ts",
        "@@",
        "-export const b = 1;",
        "+export const b = 2;",
        "*** Add File: src/new.ts",
        "+export const c = 3;",
      );
      expect(only(patch)).toBe(true);
      expect(
        removesOnlyDeadImplementsComments(
          path.join(base, "src", "other.ts"),
          { command: patch },
          base,
        ),
      ).toBe(false);
      // A patch that does not name the file says nothing about it.
      expect(
        removesOnlyDeadImplementsComments(
          path.join(base, "src", "unnamed.ts"),
          { command: patch },
          base,
        ),
      ).toBe(false);
      // Without a base to resolve paths against, every section must qualify.
      expect(only(patch, "command", null)).toBe(false);
      expect(
        only(
          envelope("*** Update File: src/a.ts", "@@", "-// implements REQ-a"),
          "command",
          null,
        ),
      ).toBe(true);
    });

    test("anything that is not one well-formed envelope is not", () => {
      const section = [
        "*** Update File: src/a.ts",
        "@@",
        "-// implements REQ-a",
      ];
      expect(only(section.join("\n"))).toBe(false);
      expect(only(["*** Begin Patch", ...section].join("\n"))).toBe(false);
      expect(only(envelope("-// implements REQ-a"))).toBe(false);
      expect(only(envelope())).toBe(false);
      expect(only(envelope(...section, "garbage line"))).toBe(false);
      // Text outside the markers, or before the first file header.
      expect(only(["garbage", ...section, "*** End Patch"].join("\n"))).toBe(
        false,
      );
      expect(only(["*** Begin Patch", ...section, "garbage"].join("\n"))).toBe(
        false,
      );
      expect(only(envelope("-// implements REQ-b", ...section))).toBe(false);
      expect(only(`apply_patch <<'EOF'\n${envelope(...section)}\nEOF`)).toBe(
        false,
      );
      // A patch beside replacement fields or content is no shape a host sends.
      expect(
        removesOnlyDeadImplementsComments(
          file,
          { command: envelope(...section), content: "" },
          base,
        ),
      ).toBe(false);
      expect(
        removesOnlyDeadImplementsComments(
          file,
          {
            command: envelope(...section),
            old_string: "// implements REQ-a\n",
            new_string: "",
          },
          base,
        ),
      ).toBe(false);
    });
  });

  test("a comment-only edit touches no firm requirement", () => {
    expect(
      firmRequirementsTouched({
        symbols: [symbol("SYM-a", 1, 9, ["REQ-firm"])],
        focus: undefined,
        wholeFile: true,
        summarize,
        commentOnly: true,
      }),
    ).toEqual({ ids: [], symbol: undefined });
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
    expect(firmEditContext(["REQ-a"])).toEndWith(
      'If nobody could answer and the edit keeps the requirement, record verdict "keeps" for that symbol with kb_review_firm_edit (CLI: kibi review-firm-edit) and retry: a keeps receipt recorded after this question lets the retry of this edit through in this session; a later session is asked again. kibi check --staged blocks the commit until each edited symbol has a current keeps receipt, so record one after the edit too. A receipt is your judgment, not the person\'s approval, and kibi signoff lists it as such.',
    );
  });

  test("notice for hosts that cannot ask tells the agent to ask first", () => {
    expect(firmEditNotice("src/a.ts", [firm])).toBe(
      [
        "Kibi: this edit changes src/a.ts, which implements a firm requirement, a rule the person set: REQ-a: Only admins delete.",
        'Unless the edit keeps that rule, ask the person before making it and name the rule; change the requirement with kb_upsert in this change only when they say so. After the edit, record your verdict for each edited symbol with kb_review_firm_edit ("keeps" or "changes"; CLI: kibi review-firm-edit). kibi check --staged blocks the commit until each has a current keeps receipt. A receipt is your judgment, not the person\'s approval.',
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

  test("reads never and always as a rule only when they instruct", () => {
    expect(statedRule("Never log keys.")).toBe("never");
    expect(statedRule("Always require 2FA")).toBe("always");
    expect(statedRule("Add an expiry, and never log keys")).toBe("never");
    expect(statedRule("Make sure we never log keys")).toBe("never");
    expect(statedRule("Ensure the job always retries")).toBe("always");
    expect(statedRule("Please always ask first")).toBe("always");
    expect(statedRule("Can you make sure we never log tokens?")).toBe("never");
    // A description of today's behavior states a fact, not a rule.
    expect(
      statedRule("API keys currently never expire. Add a 90-day expiry."),
    ).toBeUndefined();
    expect(statedRule("The job always retries twice.")).toBeUndefined();
    expect(statedRule("Users never see drafts")).toBeUndefined();
  });

  test("reads rules written as lists, with emphasis or after asking phrases", () => {
    expect(statedRule("- Never log API keys")).toBe("never");
    expect(statedRule("* Always require 2FA for admins")).toBe("always");
    expect(statedRule("+ never log keys")).toBe("never");
    expect(statedRule("1. Never log keys")).toBe("never");
    expect(statedRule("2) always hash")).toBe("always");
    expect(statedRule("## Never log keys")).toBe("never");
    expect(statedRule("**Never** log API keys.")).toBe("never");
    expect(statedRule("_Always_ hash passwords")).toBe("always");
    expect(
      statedRule(
        "Rules:\n- never store passwords in plain text\n- always hash with argon2",
      ),
    ).toBe("never");
    expect(statedRule("Also never log keys")).toBe("never");
    expect(statedRule("Let's always require a review")).toBe("always");
    expect(statedRule("Let us never skip review")).toBe("never");
    expect(statedRule("We never want to log API keys.")).toBe("never");
    expect(statedRule("You always need to sign commits")).toBe("always");
    expect(statedRule("Remember to always validate the input")).toBe("always");
    expect(statedRule("You need to always check the tenant id")).toBe("always");
    expect(statedRule("Be sure to never skip it")).toBe("never");
    expect(statedRule("Users may never see other tenants' data.")).toBe(
      "never",
    );
    expect(statedRule("Guests can never delete")).toBe("never");
    expect(statedRule("Always have a backup")).toBe("always");
    expect(statedRule("Never pass secrets in URLs")).toBe("never");
    // A describing clause does not hide a later instructing one.
    expect(statedRule("It always crashes, so never deploy on Friday")).toBe(
      "never",
    );
  });

  test("does not read descriptions or idioms as rules", () => {
    expect(
      statedRule(
        "Tokens currently never expire, and always have been stored in redis.",
      ),
    ).toBeUndefined();
    expect(
      statedRule("The cache is, as far as I can tell, never invalidated."),
    ).toBeUndefined();
    expect(statedRule("It never works (always crashes)")).toBeUndefined();
    expect(statedRule("e.g. never-ending loops happen here")).toBeUndefined();
    expect(statedRule("Never-ending loops")).toBeUndefined();
    expect(statedRule("Users may never-ever")).toBeUndefined();
    expect(
      statedRule("Never mind, ignore my last message and just fix the typo."),
    ).toBeUndefined();
    expect(statedRule("Thanks. Always a pleasure!")).toBeUndefined();
    expect(statedRule("Fine, always the same")).toBeUndefined();
    expect(statedRule("and never an error")).toBeUndefined();
    expect(statedRule("but always was slow")).toBeUndefined();
    expect(statedRule("so never were they")).toBeUndefined();
    expect(statedRule("then always is fine")).toBeUndefined();
    expect(statedRule("but never are they")).toBeUndefined();
    expect(statedRule("(always am late)")).toBeUndefined();
    expect(statedRule("; never did it")).toBeUndefined();
    expect(statedRule(": always does it")).toBeUndefined();
    expect(statedRule(", never has it")).toBeUndefined();
    expect(statedRule(", never had it")).toBeUndefined();
    expect(statedRule(", always been so")).toBeUndefined();
    expect(statedRule("We never wanted to")).toBeUndefined();
  });

  test("ignores fenced, indented and quoted text and questions asking to be told", () => {
    expect(statedRule("~~~\nmust never\n~~~\nfix the typo")).toBeUndefined();
    expect(statedRule("~~~\nmust never")).toBeUndefined();
    expect(
      statedRule("    assert x, 'must be set'\nfix the typo"),
    ).toBeUndefined();
    expect(statedRule("Fix it:\n\n\tmust()\n")).toBeUndefined();
    expect(
      statedRule("Fix it:\n\n    a()\n    must()\nthen go"),
    ).toBeUndefined();
    // An indented line that continues a paragraph is not code.
    expect(statedRule("Fix it\n    and never log keys")).toBe("never");
    expect(
      statedRule("> you must never log keys\nwhat did the reviewer mean"),
    ).toBeUndefined();
    expect(statedRule("  > never log keys")).toBeUndefined();
    expect(
      statedRule("Could you tell me why this must be so?"),
    ).toBeUndefined();
    expect(statedRule("Can you explain why it must retry?")).toBeUndefined();
    expect(statedRule("Please would you show why it must?")).toBeUndefined();
    expect(statedRule("Can you make sure it must retry?")).toBe("must");
  });

  test("ignores questions and code", () => {
    expect(statedRule("Should we always lint?")).toBeUndefined();
    expect(statedRule("Does it always fail?")).toBeUndefined();
    expect(statedRule("Why must it retry?")).toBeUndefined();
    expect(statedRule("Run `must-gather` and fix it")).toBeUndefined();
    expect(statedRule("Fix this:\n```\nnever();\n```")).toBeUndefined();
    // The rule in a later sentence still counts.
    expect(statedRule("Does it retry? It must not retry.")).toBe("must not");
    // Clause starts and request phrasing, spacing included.
    expect(statedRule("Add expiry;never log keys")).toBe("never");
    expect(statedRule("Add an expiry, never log keys")).toBe("never");
    expect(statedRule("Ensure  that the old keys never leak")).toBe("never");
    expect(statedRule("Ensure  the keys never leak")).toBe("never");
    expect(statedRule("Ensure the keys  never leak")).toBe("never");
    expect(statedRule("Add expiry and  never log keys")).toBe("never");
    expect(
      statedRule("Ensure that the old stale keys never leak"),
    ).toBeUndefined();
    expect(
      statedRule("Honestly, could we make sure keys never leak?"),
    ).toBeUndefined();
    expect(statedRule("Please  can you make sure we never log tokens?")).toBe(
      "never",
    );
    expect(statedRule("Can  you make sure we never log tokens?")).toBe("never");
    // Sentences split at a stop with a space after it and at a line break.
    expect(statedRule("Do it. Never log keys.")).toBe("never");
    expect(statedRule("Do it.Never log keys")).toBeUndefined();
    expect(statedRule("Rename it\n never log keys")).toBe("never");
    // Code is replaced by a space and an unclosed fence runs to the end.
    expect(statedRule("Do it.`x`Never log keys")).toBe("never");
    expect(statedRule("Fix this:\n```\nnever();")).toBeUndefined();
  });

  test("prompt note quotes the phrase and capture reminder mentions the rule", () => {
    expect(rulePromptNote("never")).toBe(
      [
        'Kibi: this request reads as a rule or decision (it says "never").',
        "A rule the person states is project knowledge: kb_search shows whether a recorded requirement already says something about it (changing a firm one is a question for the person first), and a new rule is recorded with kb_record (the statement, the person's reason, saidBy user and the code that enforces it; a changed one with kb_upsert) as part of this change, not after it.",
      ].join("\n"),
    );
    expect(captureReminder("never")).toBe(
      [
        'Kibi: the person\'s request said "never", this session changed source files, and nothing was recorded in the knowledge base.',
        'Record the rule behind "never" with kb_record (statement, why, who said it and the code that implements it) before the work is reported done, or say in the final report why "never" is not a rule.',
      ].join("\n"),
    );
    expect(captureReminder("never")).not.toContain("when there was none");
    expect(captureReminder(undefined)).toBe(
      [
        "Kibi: this session changed source files and recorded nothing in the knowledge base.",
        "A decision the person stated or this change made (a rule, a limit, a default, who may do what) is recorded with kb_record (statement, why, who said it and the code that implements it) before the work is reported done; when there was none, the final report says so in one line.",
      ].join("\n"),
    );
  });

  test("the capture template quotes the phrase and is one kb_record input", () => {
    const [intro, payload, ...rest] = ruleCaptureTemplate("must").split("\n");
    expect(rest).toEqual([
      "Then follow the nextActions the result returns. Facts, decisions and other modeling go through kb_upsert.",
    ]);
    expect(intro).toBe(
      'Kibi: the request said "must" and this session now changes source files. Record that rule in this change with one kb_record call (without MCP: kibi record --input -); fill in this template:',
    );
    expect(JSON.parse(payload as string)).toEqual({
      statement: "<the rule as one shall or must sentence>",
      why: "<why the person wants it, in their words; 'Reason not stated' if they gave none>",
      saidBy: "user",
      quote: "<the person's words, quoted>",
      code: [
        { file: "<file you changed>", symbol: "<function that enforces it>" },
      ],
    });
  });

  test("a stated reason is asked for in why by the note and the template", () => {
    const ask =
      'The request gives its reason ("because longer ones get skipped"): put that reason in the why field, in the person\'s words.';
    expect(rulePromptNote("must", "because longer ones get skipped")).toBe(
      `${rulePromptNote("must")}\n${ask}`,
    );
    const [, payload, line, last] = ruleCaptureTemplate(
      "must",
      "because longer ones get skipped",
    ).split("\n");
    expect(JSON.parse(payload as string).why).toBe(
      "<the person's reason, in their words>",
    );
    expect(line).toBe(ask);
    expect(last).toBe(
      "Then follow the nextActions the result returns. Facts, decisions and other modeling go through kb_upsert.",
    );
  });
});

describe("statedReason", () => {
  test("reads a because or so that clause in or right after the rule sentence", () => {
    expect(
      statedReason(
        "Snippets must never show more than seven lines, because longer ones get skipped.",
      ),
    ).toBe("because longer ones get skipped");
    expect(
      statedReason("Uploads must stay under 10 MB so that the proxy keeps up!"),
    ).toBe("so that the proxy keeps up");
    expect(
      statedReason("From now on, sign every release. Because audits need it."),
    ).toBe("Because audits need it");
    // A question keeps its mark; only a closing . or ! is dropped.
    expect(
      statedReason(
        "Can you make sure we never log tokens, because why risk it?",
      ),
    ).toBe("because why risk it?");
    // The reason must be near the rule: two sentences on is another topic.
    expect(
      statedReason(
        "Uploads must stay small. Thanks. It broke because of load.",
      ),
    ).toBeUndefined();
    // Before the rule sentence, a reason is about something else.
    expect(
      statedReason("It broke because of load. Uploads must stay small."),
    ).toBeUndefined();
    expect(statedReason("Please fix this because it broke")).toBeUndefined();
    expect(statedReason("Uploads must stay small")).toBeUndefined();
    expect(statedReason("Ensure the job always retries because")).toBe(
      "because",
    );
    // "becausewe" is no marker word.
    expect(statedReason("Keys must rotate becausewe say so")).toBeUndefined();
  });

  test("cuts a long reason to 200 characters", () => {
    const reason = statedReason(
      `Keys must rotate because ${"x".repeat(300)} end.`,
    ) as string;
    expect(reason).toHaveLength(200);
    expect(reason.startsWith("because xxx")).toBe(true);
    expect(reason.endsWith("x…")).toBe(true);
    expect(statedReason(`Keys must rotate because ${"y".repeat(191)}`)).toBe(
      `because ${"y".repeat(191)}`,
    );
    // Exactly 200 characters is kept whole.
    expect(statedReason(`Keys must rotate because ${"y".repeat(192)}`)).toBe(
      `because ${"y".repeat(192)}`,
    );
    // A cut that lands after a space drops the space before the ellipsis.
    expect(
      statedReason(
        `Keys must rotate because ${"x".repeat(190)} ${"z".repeat(50)}`,
      ),
    ).toBe(`because ${"x".repeat(190)}…`);
  });

  test("drops only the closing marks of the reason", () => {
    expect(statedReason("Keys must rotate because v1.2 leaks them!!")).toBe(
      "because v1.2 leaks them",
    );
    expect(statedReason(undefined)).toBeUndefined();
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
    // A kb_record input always writes a requirement, unless a dry run.
    const recorded = { statement: "Keys rotate.", saidBy: "user" };
    expect(isRequirementUpsert(recorded)).toBe(true);
    expect(isRequirementUpsert({ arguments: recorded })).toBe(true);
    expect(isRequirementUpsert({ ...recorded, dryRun: true })).toBe(false);
    expect(isRequirementUpsert({ statement: "Keys rotate." })).toBe(false);
    expect(isRequirementUpsert({ saidBy: "user" })).toBe(false);
    expect(isRequirementUpsert({ statement: 1, saidBy: "user" })).toBe(false);
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
    expect(sessionRulePhrase(broken)).toBe(undefined);
    expect(claimRuleCaptureTemplate(broken)).toBe(undefined);
    expect(sessionRulePhrase(noState)).toBe(undefined);
    expect(requestWords(broken)).toEqual([]);
  });
});

describe("rule capture template", () => {
  test("is given once, only after a source edit of a rule session with nothing recorded", () => {
    const plain = session("plain");
    recordRequest(plain, "Please add retry logic");
    markDecisionFlag(plain, "source-edited");
    expect(claimRuleCaptureTemplate(plain)).toBe(undefined);

    const rule = session("rule");
    recordRequest(rule, "Uploads must stay under 10 MB");
    expect(claimRuleCaptureTemplate(rule)).toBe(undefined);
    markDecisionFlag(rule, "source-edited");
    expect(claimRuleCaptureTemplate(rule)).toBe(ruleCaptureTemplate("must"));
    expect(claimRuleCaptureTemplate(rule)).toBe(undefined);

    const reasoned = session("reasoned");
    recordRequest(
      reasoned,
      "Uploads must stay small because the proxy is slow",
    );
    markDecisionFlag(reasoned, "source-edited");
    expect(claimRuleCaptureTemplate(reasoned)).toBe(
      ruleCaptureTemplate("must", "because the proxy is slow"),
    );

    const recorded = session("recorded");
    recordRequest(recorded, "Uploads must stay under 10 MB");
    markDecisionFlag(recorded, "source-edited");
    markDecisionFlag(recorded, "kb-recorded");
    expect(claimRuleCaptureTemplate(recorded)).toBe(undefined);
    // Recording first does not use up the template's one claim.
    expect(hasDecisionFlag(recorded, "capture-template")).toBe(false);
  });

  test("a host that delivers it before the edit passes an edit of a source file", () => {
    const rule = session("pre-edit");
    recordRequest(rule, "Uploads must stay under 10 MB");
    expect(claimRuleCaptureTemplate(rule, false)).toBe(undefined);
    expect(claimRuleCaptureTemplate(rule, true)).toBe(
      ruleCaptureTemplate("must"),
    );
    expect(claimRuleCaptureTemplate(rule, true)).toBe(undefined);
  });
});

describe("sessions without an id", () => {
  const HOUR = 60 * 60 * 1000;

  /** Set every marker of the session to `time` (ms). */
  function age(s: DecisionSession, time: number) {
    const key = createHash("sha256")
      .update(s.sessionId?.trim() || "unattributed")
      .digest("hex")
      .slice(0, 32);
    const dir = path.join(s.stateDir as string, "decision-guard", key);
    for (const name of fs.readdirSync(dir)) {
      const when = new Date(time);
      fs.utimesSync(path.join(dir, name), when, when);
    }
  }

  test("a new session without an id starts without the last one's markers", () => {
    const first = session("");
    recordRequest(first, "Never log keys");
    markDecisionFlag(first, "source-edited");
    claimDecisionFlag(first, "capture-asked");
    const journal = path.join(first.stateDir as string, "host.jsonl");
    fs.writeFileSync(journal, "{}");
    // A resume keeps them.
    expect(
      startDecisionSession(first, "resume", { hostFiles: [journal] }),
    ).toBe(false);
    expect(hasDecisionFlag(first, "capture-asked")).toBe(true);
    expect(
      startDecisionSession(first, "startup", { hostFiles: [journal] }),
    ).toBe(true);
    expect(hasDecisionFlag(first, "capture-asked")).toBe(false);
    expect(fs.existsSync(journal)).toBe(false);
    expect(sessionRulePhrase(first)).toBe(undefined);
    expect(claimCaptureReminder(first)).toBe(false);
  });

  test("a new session with an id keeps the markers of the unattributed one", () => {
    const anonymous = session("");
    markDecisionFlag(anonymous, "source-edited");
    expect(
      startDecisionSession(
        { stateDir: anonymous.stateDir, sessionId: "named" },
        "startup",
      ),
    ).toBe(false);
    expect(hasDecisionFlag(anonymous, "source-edited")).toBe(true);
  });

  test("a prompt after two idle hours starts the unattributed session afresh", () => {
    const now = Date.now();
    const idle = session("");
    markDecisionFlag(idle, "source-edited");
    claimDecisionFlag(idle, "capture-asked");
    age(idle, now - 2 * HOUR + 60_000);
    recordRequest(idle, "Rename the helper", now);
    expect(hasDecisionFlag(idle, "capture-asked")).toBe(true);
    age(idle, now - 2 * HOUR - 60_000);
    recordRequest(idle, "Rename the helper", now);
    expect(hasDecisionFlag(idle, "capture-asked")).toBe(false);
    // The new prompt's words are kept.
    expect(requestWords(idle)).toContain("helper");

    // A recent host file counts as activity; once dropped, it goes too.
    markDecisionFlag(idle, "source-edited");
    age(idle, now - 3 * HOUR);
    const journal = path.join(idle.stateDir as string, "host.jsonl");
    fs.writeFileSync(journal, "{}");
    const options = { now, hostFiles: [journal] };
    expect(startDecisionSession(idle, "prompt", options)).toBe(false);
    expect(hasDecisionFlag(idle, "source-edited")).toBe(true);
    const old = new Date(now - 3 * HOUR);
    fs.utimesSync(journal, old, old);
    expect(startDecisionSession(idle, "prompt", options)).toBe(true);
    expect(hasDecisionFlag(idle, "source-edited")).toBe(false);
    expect(fs.existsSync(journal)).toBe(false);

    // An attributed session is never expired by idleness.
    const named = session("named");
    markDecisionFlag(named, "source-edited");
    age(named, now - 3 * HOUR);
    expect(startDecisionSession(named, "prompt", { now })).toBe(false);
    expect(hasDecisionFlag(named, "source-edited")).toBe(true);
    // No state directory, or no markers yet: nothing to expire.
    expect(
      startDecisionSession({ stateDir: undefined, sessionId: "" }, "prompt"),
    ).toBe(false);
    expect(startDecisionSession(session(""), "prompt")).toBe(false);
    const missing = session("");
    expect(
      startDecisionSession(missing, "prompt", {
        hostFiles: [path.join(missing.stateDir as string, "none.jsonl")],
      }),
    ).toBe(false);
  });

  test("session start removes markers of sessions untouched for a week", () => {
    const now = Date.now();
    const WEEK = 7 * 24 * HOUR;
    const stale = session("stale");
    markDecisionFlag(stale, "source-edited");
    const fresh: DecisionSession = {
      stateDir: stale.stateDir,
      sessionId: "fresh",
    };
    age(stale, now - WEEK - 60_000);
    markDecisionFlag(fresh, "source-edited");
    const empty = path.join(stale.stateDir as string, "decision-guard", "x");
    fs.mkdirSync(empty);
    const current: DecisionSession = {
      stateDir: stale.stateDir,
      sessionId: "current",
    };
    markDecisionFlag(current, "kb-recorded");
    age(current, now - WEEK - 60_000);
    startDecisionSession(current, "startup", { now });
    expect(hasDecisionFlag(stale, "source-edited")).toBe(false);
    expect(hasDecisionFlag(fresh, "source-edited")).toBe(true);
    expect(fs.existsSync(empty)).toBe(false);
    // The starting session's own markers stay.
    expect(hasDecisionFlag(current, "kb-recorded")).toBe(true);
    // A resume prunes too.
    age(fresh, now - WEEK - 60_000);
    startDecisionSession(current, "resume", { now });
    expect(hasDecisionFlag(fresh, "source-edited")).toBe(false);
    // Nothing to do without a state directory or before any marker.
    expect(startDecisionSession(noState, "startup")).toBe(false);
    expect(startDecisionSession(session("first"), "startup")).toBe(false);
  });

  test("files that cannot be removed are left in place", () => {
    const parent = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-guard-file-"));
    dirs.push(parent);
    const blocker = path.join(parent, "not-a-dir");
    fs.writeFileSync(blocker, "");
    const broken: DecisionSession = { stateDir: blocker, sessionId: "" };
    // A host file under a file cannot be removed: no error.
    expect(
      startDecisionSession(broken, "startup", {
        hostFiles: [path.join(blocker, "journal")],
      }),
    ).toBe(true);
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

    expect(sessionRulePhrase(s)).toBe(undefined);
    expect(recordRequest(s, "Uploads must never exceed 10 MB")).toBe("must");
    expect(hasDecisionFlag(s, "rule-prompt")).toBe(true);
    expect(sessionRulePhrase(s)).toBe("must");
    expect(requestWords(s)).toEqual(["upload", "exceed"]);
    // A later prompt without a rule keeps the session's rule phrase.
    recordRequest(s, "Please add retry logic");
    expect(sessionRulePhrase(s)).toBe("must");
    expect(sessionRuleReason(s)).toBe(undefined);
    recordRequest(s, "Keys must rotate because audits ask");
    expect(sessionRuleReason(s)).toBe("because audits ask");
    // The latest rule prompt's reason stands, even when it gives none.
    recordRequest(s, "Keys must rotate");
    expect(sessionRuleReason(s)).toBe(undefined);
    expect(sessionRuleReason(noState)).toBe(undefined);
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
    holdRuleNote(s, "must", "so that we can audit");
    expect(takeRuleNote(s)).toBe(
      rulePromptNote("must", "so that we can audit"),
    );
    expect(takeRuleNote(s)).toBeUndefined();
    holdRuleNote(noState, "never");
    expect(takeRuleNote(noState)).toBeUndefined();
  });
});
