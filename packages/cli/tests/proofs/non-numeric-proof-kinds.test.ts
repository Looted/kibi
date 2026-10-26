import { afterAll, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { requiredFieldsWitness } from "../../src/operations/proof/claim-bindings.js";
import { compileWitness } from "../../src/operations/proof/code-certificates.js";
import {
  type MachineModel,
  type PatternModel,
  type RuleModel,
  evaluateCodeModel,
  stringConstraintProblem,
} from "../../src/operations/proof/code-models.js";
import {
  type LanguageSpec,
  UnsupportedPattern,
  languageAccepts,
  languagesDisjoint,
  languagesEqual,
} from "../../src/operations/proof/regular-language.js";
import {
  failedCalls,
  regexCertificate,
  ruleCertificate,
  stateMachineCertificate,
} from "../../src/public/proof-certificates.js";
import { proofContractErrors } from "../../src/public/proof-protocol.js";
import { prologCases } from "./prolog-cases.js";

// implements REQ-kibi-non-numeric-proof-kinds

const repoRoot = path.resolve(import.meta.dir, "../../../..");
const scratch = mkdtempSync(path.join(import.meta.dir, ".non-numeric-"));
const roots: string[] = [scratch];
afterAll(() => {
  for (const root of roots) rmSync(root, { recursive: true, force: true });
});

const js = (source: string, flags = ""): LanguageSpec => ({
  type: "pattern",
  source,
  flags,
  flavor: "js",
  mode: "search",
});
const python = (source: string, flags = ""): LanguageSpec => ({
  type: "pattern",
  source,
  flags,
  flavor: "python",
  mode: "search",
});
const fact = (source: string): LanguageSpec => ({
  type: "pattern",
  source,
  flags: "u",
  flavor: "js",
  mode: "full",
});

describe("regular languages", () => {
  test("decides equivalence exactly and names the shortest string that differs", () => {
    expect(languagesEqual(js("^INV-\\d{6}$"), fact("INV-[0-9]{6}")).holds).toBe(
      true,
    );
    expect(languagesEqual(js("^(?:a|b)+$"), fact("[ab][ab]*")).holds).toBe(
      true,
    );
    const loose = languagesEqual(js("INV-\\d{6}"), fact("INV-[0-9]{6}"));
    expect(loose.holds).toBe(false);
    // The shortest strings that differ have 11 characters, like "INV-0000000".
    if (!loose.holds) {
      expect(loose.witness).toHaveLength(11);
      expect(languageAccepts(js("INV-\\d{6}"), loose.witness)).toBe(true);
      expect(languageAccepts(fact("INV-[0-9]{6}"), loose.witness)).toBe(false);
    }
    const short = languagesEqual(js("^INV-\\d{5,6}$"), fact("INV-[0-9]{6}"));
    expect(short.holds).toBe(false);
    if (!short.holds) expect(short.witness).toBe("INV-00000");
    // JavaScript's $ is the end of input; Python's also allows a final "\n".
    const dollar = languagesEqual(python("^a$"), js("^a$"));
    expect(dollar.holds).toBe(false);
    if (!dollar.holds) expect(dollar.witness).toBe("a\n");
    expect(languagesEqual(python("\\Aa\\Z"), js("^a$")).holds).toBe(true);
  });

  test("decides disjointness and membership", () => {
    expect(languagesDisjoint(js("^[0-9]+$"), fact("[a-z]+")).holds).toBe(true);
    expect(languagesDisjoint(js("^[0-9a]+$"), fact("[a-z]+")).holds).toBe(
      false,
    );
    expect(languageAccepts(fact("INV-[0-9]{6}"), "INV-123456")).toBe(true);
    expect(languageAccepts(fact("INV-[0-9]{6}"), "xINV-123456")).toBe(false);
    expect(languageAccepts(js("INV-[0-9]{6}"), "xINV-123456")).toBe(true);
  });

  test("models case folding, dot and surrogate pairs the way each engine does", () => {
    // JavaScript's u flag folds U+212A KELVIN SIGN to k; without u it does not.
    expect(languageAccepts(js("^k$", "iu"), "K")).toBe(true);
    expect(languageAccepts(js("^k$", "i"), "K")).toBe(false);
    // Python's IGNORECASE also treats U+0130 and U+0131 as i.
    expect(languageAccepts(python("^i$", "i"), "İ")).toBe(true);
    // Without u, . is one UTF-16 code unit, so it matches half an emoji.
    expect(languageAccepts(js("^.$"), "😀")).toBe(false);
    expect(languageAccepts(js("^..$"), "😀")).toBe(true);
    expect(languageAccepts(js("^.$", "u"), "😀")).toBe(true);
  });

  test("agrees with V8 on generated patterns and strings", () => {
    let seed = 7;
    const random = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff;
    };
    const pick = <T>(items: readonly T[]) =>
      items[Math.floor(random() * items.length)] as T;
    const atoms = [
      "a",
      "b",
      "\\d",
      "\\w",
      "\\s",
      ".",
      "[ab]",
      "[^a]",
      "[a-c]",
      "[^]",
      "\\n",
      "😀",
      "k",
    ];
    const generate = (depth: number): string => {
      const roll = random();
      if (depth <= 0 || roll < 0.35) return pick(atoms);
      if (roll < 0.55) return generate(depth - 1) + generate(depth - 1);
      if (roll < 0.65) return `(${generate(depth - 1)}|${generate(depth - 1)})`;
      if (roll < 0.75)
        return `(?:${generate(depth - 1)})${pick(["*", "+", "?", "{2}", "{1,3}"])}`;
      if (roll < 0.85) return `^${generate(depth - 1)}`;
      return `${generate(depth - 1)}$`;
    };
    const characters = ["a", "b", "A", "1", " ", "\n", "😀", "k", "K", "_"];
    let checked = 0;
    for (let index = 0; index < 400; index++) {
      const source = generate(3);
      const flags = pick(["", "i", "s", "u", "iu"]);
      const native = new RegExp(source, flags);
      for (let sample = 0; sample < 10; sample++) {
        let text = "";
        for (let length = Math.floor(random() * 5); length > 0; length--)
          text += pick(characters);
        expect({
          source,
          flags,
          text,
          matched: languageAccepts(js(source, flags), text),
        }).toEqual({
          source,
          flags,
          text,
          matched: native.test(text),
        });
        checked++;
      }
    }
    expect(checked).toBe(4000);
  });

  test("refuses what is not a regular language, with the reason", () => {
    for (const [source, flags, reason] of [
      ["(a)\\1", "", "backreference"],
      ["a(?=b)", "", "lookaround"],
      ["\\bword\\b", "", "word boundary"],
      ["\\p{L}", "u", "Unicode property"],
      ["a", "g", "lastIndex"],
      ["^a$", "m", "every line"],
      ["é", "i", "non-ASCII"],
    ] as const)
      expect(() => languageAccepts(js(source, flags), "a")).toThrow(reason);
    expect(() => languageAccepts(python("\\d"), "1")).toThrow("re.ASCII");
    expect(() => languageAccepts(python("\\d", "a"), "1")).not.toThrow();
    expect(() => languageAccepts(js("(a"), "a")).toThrow(UnsupportedPattern);
  });
});

describe("string facts against the code's string or pattern", () => {
  const pattern = (source: string, flags = "") => ({
    pattern: {
      symbol_id: "SYM-P",
      type: "regexp",
      source,
      flags,
      flavor: "js",
    },
  });
  const constant = (value: string) => ({
    pattern: { symbol_id: "SYM-P", type: "string", value },
  });
  const obligation = (
    operator: string,
    value: string,
    polarity = "require",
  ) => ({
    kind: "string_constraint",
    operator,
    value,
    polarity,
  });

  test("a validator pattern must accept exactly the fact's strings", () => {
    expect(
      stringConstraintProblem(
        pattern("^INV-\\d{6}$"),
        obligation("matches", "INV-[0-9]{6}"),
        "FACT-F",
      ),
    ).toBeNull();
    expect(
      stringConstraintProblem(
        pattern("^INV-\\d+$"),
        obligation("matches", "INV-[0-9]{6}"),
        "FACT-F",
      ),
    ).toContain('"INV-0" is in the code\'s pattern only');
    expect(
      stringConstraintProblem(
        pattern("^[0-9]+$"),
        obligation("matches", "[a-z]+", "forbid"),
        "FACT-F",
      ),
    ).toBeNull();
    expect(
      stringConstraintProblem(
        pattern("^(?:a)\\1$"),
        obligation("matches", "a"),
        "FACT-F",
      ),
    ).toContain("cannot decide the pattern exactly");
  });

  test("a string constant is compared, or matched against the fact's pattern", () => {
    expect(
      stringConstraintProblem(
        constant("X-Api-Key"),
        obligation("eq", "X-Api-Key"),
        "FACT-H",
      ),
    ).toBeNull();
    expect(
      stringConstraintProblem(
        constant("X-API-Key"),
        obligation("eq", "X-Api-Key"),
        "FACT-H",
      ),
    ).toContain("does not meet FACT-H's constraint eq");
    expect(
      stringConstraintProblem(
        constant("INV-000042"),
        obligation("matches", "INV-[0-9]{6}"),
        "FACT-F",
      ),
    ).toBeNull();
    expect(
      stringConstraintProblem(
        constant("draft"),
        obligation("eq", "draft", "forbid"),
        "FACT-F",
      ),
    ).toContain("which the fact forbids");
  });
});

describe("proof_contract fields of the non-numeric kinds", () => {
  const contract = (extra: Record<string, unknown>) => ({
    version: "kibi.proof-contract.v1",
    integration: "self-proof",
    required_proofs: [{ symbol_id: "SYM-TEST", target: "default" }],
    success_policy: "all_required_first_attempt",
    ...extra,
  });

  test("each kind names the code it reads, and only its own fields", () => {
    expect(
      proofContractErrors(
        contract({
          kind: "rule",
          predicate_source: { can_share: { symbol_id: "SYM-CAN-SHARE" } },
          domains: {
            document_status: { symbol_id: "SYM-STATUS", export: "STATUSES" },
          },
        }),
      ),
    ).toEqual([]);
    expect(
      proofContractErrors(contract({ kind: "rule" })).join("\n"),
    ).toContain("predicate_source is required for kind rule");
    expect(
      proofContractErrors(
        contract({
          kind: "state_machine",
          domain_source: { symbol_id: "SYM-T" },
        }),
      ),
    ).toEqual([]);
    expect(
      proofContractErrors(
        contract({
          kind: "state_machine",
          domain_source: { symbol_id: "SYM-T" },
          domains: { state: { symbol_id: "SYM-S" } },
        }),
      ).join("\n"),
    ).toContain("exactly the state and event domains");
    expect(
      proofContractErrors(
        contract({ kind: "regex", pattern_source: { symbol_id: "SYM-P" } }),
      ),
    ).toEqual([]);
    expect(
      proofContractErrors(contract({ kind: "regex" })).join("\n"),
    ).toContain("pattern_source is required");
    expect(
      proofContractErrors(
        contract({
          kind: "exhaustive",
          domain_source: { symbol_id: "SYM-D" },
          pattern_source: { symbol_id: "SYM-P" },
        }),
      ).join("\n"),
    ).toContain("pattern_source applies only to kind regex");
    expect(
      proofContractErrors(
        contract({
          kind: "rule",
          predicate_source: { p: {} },
          domains: { t: { symbol_id: "S" } },
        }),
      ).join("\n"),
    ).toContain("predicate_source must map each predicate name");
  });
});

/** A workspace of source files, removed after the suite. */
function workspace(files: Record<string, string>): string {
  const root = mkdtempSync(path.join(tmpdir(), "kibi-non-numeric-"));
  roots.push(root);
  for (const [relative, content] of Object.entries(files)) {
    mkdirSync(path.dirname(path.join(root, relative)), { recursive: true });
    writeFileSync(path.join(root, relative), content);
  }
  return root;
}

const SHARING = `
export const STATUSES = ["draft", "active", "archived"];
export const ROLES = ["viewer", "owner"];
export function canShare(status, role) {
  return status !== "archived" && role === "owner";
}
export const TRANSITIONS = { draft: ["sent", "void"], sent: ["paid", "void"], paid: [], void: [] };
export const INITIAL = "draft";
export const EVENTS = ["send", "pay", "cancel"];
export const INVOICE_STATES = ["draft", "sent", "paid", "void"];
export function next(state, event) {
  if (event === "cancel" && (state === "draft" || state === "sent")) return "void";
  if (state === "draft" && event === "send") return "sent";
  if (state === "sent" && event === "pay") return "paid";
  throw new Error("no transition");
}
export const INVOICE_NUMBER = /^INV-\\d{6}$/;
export const HEADER = "X-Api-Key";
`;

describe("Kibi reads the model from the code", () => {
  const root = workspace({ "sharing.mjs": SHARING });
  const file = path.join(root, "sharing.mjs");
  const ref = (name: string) => ({ file, export: name });

  test("a rule model is every decision the code makes over its domains", async () => {
    const evaluated = evaluateCodeModel<RuleModel>(root, [ref("canShare")], {
      mode: "table",
      domains: { document_status: ref("STATUSES"), role: ref("ROLES") },
      predicates: {
        can_share: {
          ...ref("canShare"),
          arg_types: ["document_status", "role"],
        },
      },
      limit: 1000,
    });
    expect(evaluated.ok).toBe(true);
    if (!evaluated.ok) return;
    expect(evaluated.model.domains.role).toEqual(["viewer", "owner"]);
    const rows = evaluated.model.predicates.can_share ?? [];
    expect(rows).toHaveLength(6);
    expect(
      rows.filter((row) => row.value === true).map((row) => row.args),
    ).toEqual([
      ["draft", "owner"],
      ["active", "owner"],
    ]);
    // The test-side builder records the same table.
    const module = await import(file);
    const certificate = await ruleCertificate({
      testId: "TEST-SHARE",
      domains: {
        document_status: { symbolId: "SYM-STATUSES", members: module.STATUSES },
        role: { symbolId: "SYM-ROLES", members: module.ROLES },
      },
      predicates: {
        can_share: {
          symbolId: "SYM-CAN-SHARE",
          argTypes: ["document_status", "role"],
          decide: module.canShare,
        },
      },
    });
    expect(failedCalls(certificate)).toEqual([]);
    expect(
      (certificate.predicates as Record<string, { rows: unknown[] }>).can_share
        ?.rows,
    ).toEqual(rows as unknown[]);
  });

  test("a machine is read from a table or from a next-state function", async () => {
    const table = evaluateCodeModel<MachineModel>(root, [ref("TRANSITIONS")], {
      mode: "machine",
      transitions: ref("TRANSITIONS"),
      initial: ref("INITIAL"),
    });
    const fn = evaluateCodeModel<MachineModel>(root, [ref("next")], {
      mode: "machine",
      transitions: ref("next"),
      domains: { state: ref("INVOICE_STATES"), event: ref("EVENTS") },
    });
    expect(table.ok && fn.ok).toBe(true);
    if (!table.ok || !fn.ok) return;
    expect(table.model.transitions).toEqual([
      ["draft", "sent"],
      ["draft", "void"],
      ["sent", "paid"],
      ["sent", "void"],
    ]);
    expect(table.model.initial).toEqual(["draft"]);
    const module = await import(file);
    const certificate = await stateMachineCertificate({
      testId: "TEST-MACHINE",
      symbolId: "SYM-TRANSITIONS",
      transitions: module.TRANSITIONS,
      initial: module.INITIAL,
    });
    expect((certificate.machine as MachineModel).transitions).toEqual(
      table.model.transitions,
    );
    expect((certificate.machine as MachineModel).states).toEqual(
      table.model.states,
    );
    expect(fn.model.transitions).toEqual([
      ["draft", "sent"],
      ["draft", "void"],
      ["sent", "paid"],
      ["sent", "void"],
    ]);
  });

  test("a pattern is the code's RegExp, or its string constant", () => {
    const regexp = evaluateCodeModel<PatternModel>(
      root,
      [ref("INVOICE_NUMBER")],
      {
        mode: "pattern",
        pattern: ref("INVOICE_NUMBER"),
      },
    );
    expect(regexp).toEqual({
      ok: true,
      model: {
        type: "regexp",
        source: "^INV-\\d{6}$",
        flags: "",
        flavor: "js",
      },
    });
    expect(
      regexCertificate({ testId: "T", symbolId: "SYM-P", value: /^INV-\d{6}$/ })
        .pattern,
    ).toEqual({
      symbol_id: "SYM-P",
      type: "regexp",
      source: "^INV-\\d{6}$",
      flags: "",
      flavor: "js",
    });
    const header = evaluateCodeModel<PatternModel>(root, [ref("HEADER")], {
      mode: "pattern",
      pattern: ref("HEADER"),
    });
    expect(header).toEqual({
      ok: true,
      model: { type: "string", value: "X-Api-Key" },
    });
  });

  const hasPython = spawnSync("python3", ["--version"]).status === 0;
  test.skipIf(!hasPython)("Python code is read the same way", () => {
    const root = workspace({
      "pkg/__init__.py": "",
      "pkg/rules.py": [
        "import enum, re",
        "class Status(enum.Enum):",
        "    DRAFT = 'draft'",
        "    ARCHIVED = 'archived'",
        "def can_share(status):",
        "    return status is not Status.ARCHIVED",
        "TRANSITIONS = {'draft': {'send': 'sent'}, 'sent': ['paid']}",
        "INVOICE_NUMBER = re.compile(r'\\AINV-[0-9]{6}\\Z', re.IGNORECASE)",
        "",
      ].join("\n"),
    });
    const file = path.join(root, "pkg/rules.py");
    const rule = evaluateCodeModel<RuleModel>(
      root,
      [{ file, export: "can_share" }],
      {
        mode: "table",
        domains: { status: { file, export: "Status" } },
        predicates: {
          can_share: { file, export: "can_share", arg_types: ["status"] },
        },
        limit: 100,
      },
    );
    expect(rule).toEqual({
      ok: true,
      model: {
        domains: { status: ["draft", "archived"] },
        predicates: {
          can_share: [
            { args: ["draft"], value: true },
            { args: ["archived"], value: false },
          ],
        },
      },
    });
    const machine = evaluateCodeModel<MachineModel>(
      root,
      [{ file, export: "TRANSITIONS" }],
      {
        mode: "machine",
        transitions: { file, export: "TRANSITIONS" },
      },
    );
    expect(machine.ok && machine.model.transitions).toEqual([
      ["draft", "sent"],
      ["sent", "paid"],
    ]);
    const pattern = evaluateCodeModel<PatternModel>(
      root,
      [{ file, export: "INVOICE_NUMBER" }],
      {
        mode: "pattern",
        pattern: { file, export: "INVOICE_NUMBER" },
      },
    );
    expect(pattern).toEqual({
      ok: true,
      model: {
        type: "regexp",
        source: "\\AINV-[0-9]{6}\\Z",
        flags: "i",
        flavor: "python",
      },
    });
  });
});

type CheckAnswer = { accepted?: boolean; reason?: string };

describe("code_certificates.pl re-checks the new certificate shapes", () => {
  const rule = (rows: unknown[]) => ({
    version: "kibi.code-certificate.v1",
    kind: "rule",
    test_id: "TEST-R",
    domains: { role: { symbol_id: "SYM-R", members: ["viewer", "owner"] } },
    predicates: { can_edit: { symbol_id: "SYM-F", arg_types: ["role"], rows } },
  });

  test("a rule table must give one boolean per combination of its domains", () => {
    const answers = prologCases<CheckAnswer>(
      "code_certificates.pl",
      "with_output_to(string(J), json_write_dict(current_output, Case, [width(0)])), code_certificates:code_certificate_check_json(J, O), atom_json_dict(O, Out, [value_string_as(string)])",
      [
        rule([
          { args: ["viewer"], value: false },
          { args: ["owner"], value: true },
        ]),
        rule([{ args: ["viewer"], value: false }]),
        rule([
          { args: ["viewer"], value: false },
          { args: ["owner"], error: "boom" },
        ]),
        rule([
          { args: ["viewer"], value: false },
          { args: ["admin"], value: true },
        ]),
        {
          version: "kibi.code-certificate.v1",
          kind: "state_machine",
          test_id: "TEST-M",
          machine: {
            symbol_id: "SYM-M",
            states: ["a", "b"],
            transitions: [
              ["a", "b"],
              ["b", "c"],
            ],
          },
        },
        {
          version: "kibi.code-certificate.v1",
          kind: "regex",
          test_id: "TEST-P",
          pattern: {
            symbol_id: "SYM-P",
            type: "regexp",
            source: "^a$",
            flags: "",
            flavor: "js",
          },
        },
      ],
    );
    expect(answers.map((answer) => answer.accepted ?? false)).toEqual([
      true,
      false,
      false,
      false,
      false,
      true,
    ]);
    expect(answers[1]?.reason).toContain("not one per combination");
    expect(answers[2]?.reason).toContain("can_edit(owner) failed: boom");
    expect(answers[4]?.reason).toContain("pair of the machine's states");
  });
});

type ModelAnswer = { ok?: boolean; reason?: string };

describe("model_check.pl decides obligations against the model", () => {
  const sharing = {
    domains: {
      document_status: {
        symbol_id: "S",
        members: ["draft", "active", "archived"],
      },
      role: { symbol_id: "R", members: ["viewer", "owner"] },
    },
    predicates: {
      can_share: {
        symbol_id: "F",
        arg_types: ["document_status", "role"],
        rows: [
          { args: ["draft", "viewer"], value: false },
          { args: ["draft", "owner"], value: true },
          { args: ["active", "viewer"], value: false },
          { args: ["active", "owner"], value: true },
          { args: ["archived", "viewer"], value: false },
          { args: ["archived", "owner"], value: false },
        ],
      },
      is_editable: {
        symbol_id: "E",
        arg_types: ["document_status"],
        rows: [
          { args: ["draft"], value: true },
          { args: ["active"], value: true },
          { args: ["archived"], value: false },
        ],
      },
    },
  };
  const machine = {
    machine: {
      symbol_id: "M",
      states: ["draft", "sent", "paid", "void"],
      transitions: [
        ["draft", "sent"],
        ["draft", "void"],
        ["sent", "paid"],
        ["sent", "void"],
      ],
      initial: ["draft"],
    },
  };
  const ruleIr = (rule: Record<string, unknown>) =>
    JSON.stringify({ version: "kibi.logic.v1", ...rule });
  const v = (name: string, type: string) => ({ kind: "var", name, type });
  const c = (value: string, type: string) => ({ kind: "const", value, type });

  test("rules hold for every assignment, or fail with the assignment that breaks them", () => {
    const archivedNeverShared = ruleIr({
      kind: "rule",
      modality: "forbid",
      head: {
        kind: "atom",
        name: "can_share",
        args: [v("D", "document_status"), v("R", "role")],
      },
      body: {
        kind: "compare",
        operator: "eq",
        left: v("D", "document_status"),
        right: c("archived", "document_status"),
      },
    });
    const viewersShare = ruleIr({
      kind: "rule",
      modality: "permit",
      head: {
        kind: "atom",
        name: "can_share",
        args: [v("D", "document_status"), v("R", "role")],
      },
      body: {
        kind: "atom",
        name: "is_editable",
        args: [v("D", "document_status")],
      },
    });
    const paidIsFinal = ruleIr({
      kind: "rule",
      modality: "forbid",
      head: {
        kind: "atom",
        name: "reachable",
        args: [c("paid", "invoice_status"), v("S", "invoice_status")],
      },
      body: { kind: "atom", name: "state", args: [v("S", "invoice_status")] },
    });
    const unknownType = ruleIr({
      kind: "atom",
      modality: "assert",
      head: {
        kind: "atom",
        name: "can_share",
        args: [v("D", "document_status"), v("U", "user")],
      },
    });
    const answers = prologCases<ModelAnswer>(
      "model_check.pl",
      'logic_ir:logic_rule_from_props([rule_ir=Case.ir], Rule), (Case.kind == "rule" -> K = rule ; K = state_machine), model_check:certificate_model(K, Case.certificate, Model), catch(model_check:rule_result(Rule, Model, Result), model_error(R), Result = problem(R)), (Result == ok -> Out = _{ok: true} ; Result = problem(Reason), Out = _{ok: false, reason: Reason})',
      [
        { kind: "rule", ir: archivedNeverShared, certificate: sharing },
        { kind: "rule", ir: viewersShare, certificate: sharing },
        { kind: "state_machine", ir: paidIsFinal, certificate: machine },
        { kind: "rule", ir: unknownType, certificate: sharing },
      ],
    );
    expect(answers.map((answer) => answer.ok ?? false)).toEqual([
      true,
      false,
      true,
      false,
    ]);
    expect(answers[1]?.reason).toBe(
      "the rule fails for D=draft, R=viewer: the code decides can_share(draft, viewer) is false, but the rule requires true",
    );
    expect(answers[3]?.reason).toContain(
      "type user, which has no finite domain",
    );
  });

  test("predicate, every-member and machine projection obligations", () => {
    const answers = prologCases<ModelAnswer>(
      "model_check.pl",
      "atom_string(K, Case.kind), model_check:model_check_obligation(K, Case.obligation, Case.certificate, Result), (Result == ok -> Out = _{ok: true} ; Result = problem(Reason), Out = _{ok: false, reason: Reason})",
      [
        {
          kind: "rule",
          certificate: sharing,
          obligation: {
            kind: "predicate_holds",
            predicate: "can_share",
            args: ["archived", "owner"],
            value: false,
          },
        },
        {
          kind: "rule",
          certificate: sharing,
          obligation: {
            kind: "predicate_holds",
            predicate: "can_share",
            args: ["draft", "owner"],
            value: false,
          },
        },
        {
          kind: "rule",
          certificate: sharing,
          obligation: {
            kind: "every_member",
            predicate: "is_editable",
            members: ["draft", "active"],
          },
        },
        {
          kind: "rule",
          certificate: sharing,
          obligation: {
            kind: "every_member",
            predicate: "is_editable",
            members: ["draft", "archived"],
          },
        },
        {
          kind: "state_machine",
          certificate: machine,
          obligation: {
            kind: "machine_set",
            projection: "terminal_states",
            members: ["paid", "void"],
          },
        },
        {
          kind: "state_machine",
          certificate: machine,
          obligation: {
            kind: "machine_set",
            projection: "transitions",
            members: ["draft->sent", "sent->paid"],
          },
        },
        {
          kind: "state_machine",
          certificate: machine,
          obligation: {
            kind: "machine_set",
            projection: "reachable_states",
            members: ["draft", "sent", "paid", "void"],
          },
        },
      ],
    );
    expect(answers.map((answer) => answer.ok ?? false)).toEqual([
      true,
      false,
      true,
      false,
      true,
      false,
      true,
    ]);
    expect(answers[1]?.reason).toContain(
      "the code decides can_share(draft, owner) is true, but the fact says false",
    );
    expect(answers[3]?.reason).toContain("is_editable(archived) is false");
    expect(answers[5]?.reason).toContain(
      "not in the set draft->void, sent->void",
    );
  });
});

describe("required fields through typecheck", () => {
  test("the witness compiles only when every field is required and non-nullable", () => {
    writeFileSync(
      path.join(scratch, "payment.ts"),
      "export interface Payment { amount: number; currency: string; note?: string; refund: string | null }\n",
    );
    const compile = (fields: readonly string[]) => {
      const witness = path.join(scratch, `witness-${Math.random()}.ts`);
      writeFileSync(
        witness,
        requiredFieldsWitness("./payment.js", "domain.Payment", fields),
      );
      return compileWitness(repoRoot, path.relative(repoRoot, witness)).ok;
    };
    expect(compile(["amount", "currency"])).toBe(true);
    expect(compile(["note"])).toBe(false);
    expect(compile(["refund"])).toBe(false);
    expect(compile(["missing"])).toBe(false);
  });
});
