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
  isDeadImplementsComment,
  isRequirementUpsert,
  markDecisionFlag,
  recordRequest,
  removesOnlyDeadImplementsComments,
  removesTrailingDeadImplementsComment,
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
