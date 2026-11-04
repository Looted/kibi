import { describe, expect, test } from "bun:test";
import {
  MAX_NAMING_BINDING_WORDS,
  aggregateBindingProvenance,
  bindingCanBeApplied,
  bindingToken,
  classifyBinding,
  clauseBindingReason,
  isGenericPlaceholder,
  isParticipantArgumentType,
  nameOrStopWordReason,
  subjectKeyParticipantReason,
} from "../../../src/operations/modeling/predicate-bindings.js";

const PLACEHOLDERS = [
  "unknown",
  "domain_event",
  "true",
  "false",
  "subject",
  "component",
  "condition",
  "behavior",
  "action",
  "target",
  "resource",
  "scope",
  "property",
  "value",
  "owner",
  "actor",
  "trigger",
  "unspecified_trigger",
  "unit",
  "policy",
  "outcome",
  "failure_condition",
  "required_outcome",
  "ordered_sources",
  "normal_behavior",
];

const STOP_WORDS = [
  "a",
  "an",
  "the",
  "be",
  "is",
  "are",
  "was",
  "were",
  "been",
  "being",
  "am",
  "do",
  "does",
  "did",
  "done",
  "have",
  "has",
  "had",
  "it",
  "its",
  "this",
  "that",
  "these",
  "those",
  "they",
  "them",
  "there",
  "thing",
  "something",
  "anything",
  "some",
  "any",
  "of",
  "to",
  "in",
  "at",
  "by",
  "for",
  "with",
  "and",
  "or",
  "not",
  "null",
  "nil",
  "n_a",
  "na",
  "tbd",
  "todo",
  "x",
  "xxx",
  "foo",
  "bar",
  "example",
  "placeholder",
];

/** Each derived value with one cue that names it without spelling it. */
const DERIVED_CUES: Array<[string, string]> = [
  ["navigation", "users navigate away"],
  ["active_annotation", "the annotation"],
  ["active_annotation", "while active"],
  ["editor_annotation", "the editor"],
  ["editor_annotation", "an annotation"],
  ["consumer.local", "a project-local copy"],
  ["consumer_local", "a project local copy"],
  ["no_download", "without downloading"],
  ["no_download", "must not download"],
  ["no_global_fallback", "without global fallback"],
  ["package_manager_exception", "a package-manager run"],
  ["missing_candidate", "is missing"],
  ["missing_candidate", "is unusable"],
  ["missing_candidate", "each candidate"],
  ["cwd_unusable", "the cwd"],
  ["cwd_unusable", "the working directory"],
  ["cwd_unusable", "the current directory"],
  ["invalid_input", "invalid"],
  ["invalid_input", "unresolved"],
  ["invalid_input", "a placeholder"],
  ["invalid_placeholder", "an unresolved placeholder"],
  ["ambiguous_root", "ambiguous"],
  ["ambiguous_root", "one usable root"],
  ["ambiguous_root", "two roots"],
  ["clear_error", "fail clearly"],
  ["clear_error", "an actionable error"],
  ["resolved_executable", "the executable"],
  ["resolved_executable", "the command"],
  ["resolved_executable", "its bin"],
  ["consumer_cwd", "the cwd"],
  ["consumer_cwd", "the working directory"],
  ["consumer_cwd", "the consumer"],
  ["inherited_environment", "its env"],
  ["consumer_workspace_environment", "its env"],
  ["consumer_workspace_environment", "the workspace"],
  ["inherited_stdio", "stdio"],
  ["inherited_stdio", "stdin"],
  ["inherited_stdio", "stdout"],
  ["inherited_stdio", "stderr"],
  ["inherited_stdio", "a pipe"],
  ["propagate_termination", "terminate"],
  ["propagate_termination", "on termination"],
  ["propagate_termination", "on exit"],
  ["propagate_termination", "a signal"],
  ["missing_dependency", "a missing kibi-mcp"],
  ["missing_dependency", "a missing project-local copy"],
  ["missing_dependency", "the project-local kibi-mcp"],
  ["missing_dependency", "a missing module"],
  ["actionable_error", "actionable"],
  ["actionable_error", "report it"],
  ["actionable_error", "an error"],
  ["exception", "except when"],
  ["exception", "package manager runs"],
  ["deny", "access is denied"],
  ["deny", "users must not"],
  ["deny", "users must never"],
  ["deny", "it is forbidden"],
  ["deny", "it is prohibited"],
  ["deny", "is not allowed"],
  ["deny", "must not be allowed"],
  ["allow", "it is permitted"],
  ["on_demand", "on request"],
  ["timeout", "it times out"],
  ["timeout", "it timed out"],
  ["timeout", "they time out"],
  ["submit", "on submission"],
];

describe("bindingToken", () => {
  test("snake-cases and trims separators", () => {
    expect(bindingToken("  Hello, World!! 42 ")).toBe("hello_world_42");
    expect(bindingToken("__a__")).toBe("a");
    expect(bindingToken("-a b-")).toBe("a_b");
  });
});

describe("isGenericPlaceholder", () => {
  test("knows every placeholder value in any case", () => {
    for (const value of PLACEHOLDERS) {
      expect(isGenericPlaceholder(value)).toBe(true);
      expect(isGenericPlaceholder(` ${value.toUpperCase()} `)).toBe(true);
    }
  });

  test("matches requirement keys and launcher policy placeholders", () => {
    expect(isGenericPlaceholder("requirement.subject")).toBe(true);
    expect(isGenericPlaceholder("Requirement.anything")).toBe(true);
    for (const kind of [
      "executable",
      "cwd",
      "environment",
      "stdio",
      "termination",
    ]) {
      expect(isGenericPlaceholder(`${kind}_policy`)).toBe(true);
      expect(isGenericPlaceholder(`${kind}_custom_policy`)).toBe(true);
      expect(isGenericPlaceholder(`${kind}_policy_x`)).toBe(false);
    }
    expect(isGenericPlaceholder("retry_policy")).toBe(false);
    expect(isGenericPlaceholder("x_executable_policy")).toBe(false);
    expect(isGenericPlaceholder("requirement")).toBe(false);
    expect(isGenericPlaceholder("my.requirement.x")).toBe(false);
    expect(isGenericPlaceholder("editor")).toBe(false);
  });
});

describe("nameOrStopWordReason", () => {
  test("rejects every stop word", () => {
    for (const word of STOP_WORDS) {
      expect(nameOrStopWordReason(` ${word.toUpperCase()} `)).toBe(
        `"${word}" is a stop word`,
      );
    }
    expect(nameOrStopWordReason("n/a")).toBe('"n_a" is a stop word');
  });

  test("passes booleans and declared constants", () => {
    expect(nameOrStopWordReason("TRUE", { argumentName: "true" })).toBeNull();
    expect(
      nameOrStopWordReason("false", { argumentNames: ["false"] }),
    ).toBeNull();
    expect(nameOrStopWordReason("the", { constants: ["The"] })).toBeNull();
    expect(
      nameOrStopWordReason("actor", {
        argumentName: "actor",
        constants: ["actor"],
      }),
    ).toBeNull();
    expect(nameOrStopWordReason("guest")).toBeNull();
  });

  test("rejects a repeated argument name the claim does not name", () => {
    expect(nameOrStopWordReason("Launcher", { argumentName: "launcher" })).toBe(
      "it repeats the argument name launcher and the claim does not name it",
    );
    expect(
      nameOrStopWordReason("target-file", {
        argumentNames: ["source", "target_file"],
      }),
    ).toBe(
      "it repeats the argument name target_file and the claim does not name it",
    );
    expect(
      nameOrStopWordReason("launcher", {
        argumentName: "launcher",
        text: "The LAUNCHER must run",
      }),
    ).toBeNull();
    expect(
      nameOrStopWordReason("target_file", {
        argumentNames: ["target_file"],
        text: "the target  file is read",
      }),
    ).toBeNull();
    expect(
      nameOrStopWordReason("target_file", {
        argumentNames: ["target_file"],
        text: "the target-file is read",
      }),
    ).toBeNull();
    expect(
      nameOrStopWordReason("launcher", {
        argumentName: "launcher",
        text: "the launchers run",
      }),
    ).toBe(
      "it repeats the argument name launcher and the claim does not name it",
    );
    expect(
      nameOrStopWordReason("launcher", {
        argumentName: "launcher",
        text: "prelauncher",
      }),
    ).toBe(
      "it repeats the argument name launcher and the claim does not name it",
    );
    expect(
      nameOrStopWordReason("launcher", { argumentName: "launcher", text: "" }),
    ).toBe(
      "it repeats the argument name launcher and the claim does not name it",
    );
    expect(nameOrStopWordReason("launcher", { argumentName: "" })).toBeNull();
    expect(nameOrStopWordReason("", { argumentName: "!!" })).toBeNull();
    expect(nameOrStopWordReason("", { argumentNames: ["!!"], text: "x" })).toBe(
      "it repeats the argument name  and the claim does not name it",
    );
  });
});

describe("argument types", () => {
  test("isParticipantArgumentType", () => {
    for (const type of ["actor", "Actor-Scope", "role", "owner"]) {
      expect(isParticipantArgumentType(type)).toBe(true);
    }
    for (const type of ["entity", "resource", "component", "", undefined]) {
      expect(isParticipantArgumentType(type)).toBe(false);
    }
  });

  test("subjectKeyParticipantReason", () => {
    const context = {
      argumentType: "actor",
      constrainedSubjects: ["billing.invoice"],
    };
    expect(subjectKeyParticipantReason("Billing.Invoice", context)).toBe(
      `"Billing.Invoice" is the requirement's subject key billing.invoice, which the predicate fact already carries as its subject_key, so it names no actor`,
    );
    expect(
      subjectKeyParticipantReason("billing_invoice", {
        ...context,
        argumentType: "Actor Scope",
      }),
    ).toContain("so it names no actor_scope");
    expect(subjectKeyParticipantReason("other", context)).toBeNull();
    expect(
      subjectKeyParticipantReason("!!", {
        ...context,
        constrainedSubjects: ["??"],
      }),
    ).toBeNull();
    expect(
      subjectKeyParticipantReason("billing.invoice", {
        ...context,
        constants: ["billing_invoice"],
      }),
    ).toBeNull();
    expect(
      subjectKeyParticipantReason("billing.invoice", {
        ...context,
        argumentType: "entity",
      }),
    ).toBeNull();
    expect(
      subjectKeyParticipantReason("billing.invoice", { argumentType: "actor" }),
    ).toBeNull();
    expect(subjectKeyParticipantReason("billing.invoice")).toBeNull();
  });

  test("clauseBindingReason", () => {
    expect(MAX_NAMING_BINDING_WORDS).toBe(3);
    for (const type of [
      "entity",
      "actor",
      "Actor_Scope",
      "resource",
      "owner",
      "role",
      "component",
    ]) {
      expect(
        clauseBindingReason("one two three", { argumentType: type }),
      ).toBeNull();
      expect(
        clauseBindingReason("one two three four", { argumentType: type }),
      ).toBe(
        `it is a 4-word clause of the claim, not a short name for this ${type.toLowerCase()}`,
      );
    }
    expect(
      clauseBindingReason("one two three four", { argumentType: "state" }),
    ).toBeNull();
    expect(clauseBindingReason("one two three four")).toBeNull();
    expect(
      clauseBindingReason("one two three four", {
        argumentType: "entity",
        constants: ["one_two_three_four"],
      }),
    ).toBeNull();
    expect(
      clauseBindingReason("__one__two__three__", { argumentType: "entity" }),
    ).toBeNull();
  });
});

describe("classifyBinding", () => {
  test("placeholders, stop words and repeated names are unbound", () => {
    expect(classifyBinding(" the ", "text", true, true)).toBe("placeholder");
    expect(
      classifyBinding("actor", "x", true, true, { argumentName: "actor" }),
    ).toBe("placeholder");
    expect(
      classifyBinding("launcher", "the launcher runs", true, true, {
        argumentName: "launcher",
      }),
    ).toBe("extracted");
    expect(
      classifyBinding("launcher", "it runs", true, true, {
        argumentName: "launcher",
      }),
    ).toBe("placeholder");
    expect(
      classifyBinding("billing.invoice", "billing invoice", true, true, {
        argumentType: "role",
        constrainedSubjects: ["billing.invoice"],
      }),
    ).toBe("placeholder");
  });

  test("canonical values are extracted unless generic", () => {
    expect(classifyBinding("guest", "nothing", false, true)).toBe("extracted");
    expect(classifyBinding("unknown", "nothing", false, true)).toBe(
      "placeholder",
    );
    expect(
      classifyBinding("unknown", "nothing", false, true, {
        constants: ["unknown"],
      }),
    ).toBe("extracted");
  });

  test("explicit values are explicit unless generic, booleans excepted", () => {
    expect(classifyBinding("guest", "nothing", true)).toBe("explicit");
    expect(classifyBinding("TRUE", "nothing", true)).toBe("explicit");
    expect(classifyBinding("false", "nothing", true)).toBe("explicit");
    expect(classifyBinding("unknown", "nothing", true)).toBe("placeholder");
    expect(
      classifyBinding("unknown", "nothing", true, false, {
        constants: ["unknown"],
      }),
    ).toBe("explicit");
  });

  test("other values are judged against the claim text", () => {
    expect(classifyBinding("", "x", false)).toBe("placeholder");
    expect(classifyBinding("subject", "subject", false)).toBe("placeholder");
    expect(
      classifyBinding(
        "every guest user account",
        "every guest user account",
        false,
        false,
        {
          argumentType: "entity",
        },
      ),
    ).toBe("placeholder");
    expect(classifyBinding("guest_user", "A Guest-User signs in", false)).toBe(
      "extracted",
    );
    expect(classifyBinding("ab", "ab", false)).toBe("inferred");
    expect(classifyBinding("abc", "xabcx", false)).toBe("extracted");
    expect(classifyBinding("guest", "nobody", false)).toBe("inferred");
  });

  test("derived values match their cue words", () => {
    for (const [value, text] of DERIVED_CUES) {
      expect(classifyBinding(value, text, false)).toBe("extracted");
    }
    expect(classifyBinding("navigation", "users stay", false)).toBe("inferred");
    expect(classifyBinding("constructor", "some text", false)).toBe("inferred");
    expect(classifyBinding("to.string", "some text", false)).toBe("inferred");
  });

  test("a missing dependency may name the dependency in up to four words", () => {
    expect(
      classifyBinding(
        "missing_dependency",
        "a missing kibi mcp runtime dependency",
        false,
      ),
    ).toBe("extracted");
    expect(
      classifyBinding("Missing_Dependency", "missing  dependencies", false),
    ).toBe("extracted");
    expect(
      classifyBinding(
        "missing_dependency",
        "missing a b c d dependency",
        false,
      ),
    ).toBe("extracted");
    expect(
      classifyBinding(
        "missing_dependency",
        "missing a b c d e dependency",
        false,
      ),
    ).toBe("inferred");
    expect(
      classifyBinding("missing_dependency", "missingdependency", false),
    ).toBe("inferred");
    expect(
      classifyBinding("other_dependency", "missing a dependency", false),
    ).toBe("inferred");
  });

  test("a value of alternatives needs every part in the text", () => {
    expect(
      classifyBinding("draft|navigation", "navigate the draft", false),
    ).toBe("extracted");
    expect(classifyBinding("draft|navigation", "the draft", false)).toBe(
      "inferred",
    );
    expect(classifyBinding("|draft|", "the draft", false)).toBe("extracted");
    expect(classifyBinding("||", "anything", false)).toBe("inferred");
  });
});

describe("provenance helpers", () => {
  test("aggregate the weakest provenance", () => {
    expect(aggregateBindingProvenance([])).toBe("explicit");
    expect(aggregateBindingProvenance(["explicit", "requirement"])).toBe(
      "requirement",
    );
    expect(aggregateBindingProvenance(["extracted", "requirement"])).toBe(
      "extracted",
    );
    expect(aggregateBindingProvenance(["inferred", "extracted"])).toBe(
      "inferred",
    );
    expect(
      aggregateBindingProvenance(["placeholder", "inferred", "explicit"]),
    ).toBe("placeholder");
  });

  test("only bound provenances can be applied", () => {
    expect(bindingCanBeApplied("explicit")).toBe(true);
    expect(bindingCanBeApplied("requirement")).toBe(true);
    expect(bindingCanBeApplied("extracted")).toBe(true);
    expect(bindingCanBeApplied("inferred")).toBe(false);
    expect(bindingCanBeApplied("placeholder")).toBe(false);
  });
});

// Every cue alias of every derived value, one at a time.
const CUE_ALIASES: Record<string, string[]> = {
  navigation: ["navigate"],
  active_annotation: ["annotation", "active"],
  editor_annotation: ["editor", "annotation"],
  consumer_local: ["project-local"],
  no_download: ["without downloading", "not download"],
  no_global_fallback: ["without global fallback"],
  package_manager_exception: ["package manager"],
  missing_candidate: ["missing", "unusable", "candidate"],
  cwd_unusable: ["cwd", "working directory", "current directory"],
  invalid_input: ["invalid", "unresolved", "placeholder"],
  invalid_placeholder: ["unresolved placeholder"],
  ambiguous_root: ["ambiguous", "usable root", "roots"],
  clear_error: ["fail clearly", "actionable error"],
  resolved_executable: ["executable", "command", "bin"],
  consumer_cwd: ["cwd", "working directory", "consumer"],
  inherited_environment: ["env"],
  consumer_workspace_environment: ["env", "workspace"],
  inherited_stdio: ["stdio", "stdin", "stdout", "stderr", "pipe"],
  propagate_termination: ["terminate", "termination", "exit", "signal"],
  missing_dependency: [
    "missing kibi-mcp",
    "missing project-local",
    "project-local kibi-mcp",
    "missing module",
  ],
  actionable_error: ["actionable", "report", "error"],
  exception: ["except", "package manager"],
  deny: [
    "denied",
    "must not",
    "must never",
    "forbidden",
    "prohibited",
    "not allowed",
    "not be allowed",
  ],
  allow: ["permitted"],
  on_demand: ["on request"],
  timeout: ["times out", "timed out", "time out"],
  submit: ["submission"],
};

describe("derived cue aliases", () => {
  for (const [value, aliases] of Object.entries(CUE_ALIASES)) {
    test(`${value} is inferred without a cue`, () => {
      expect(classifyBinding(value, "unrelated words here", false)).toBe(
        "inferred",
      );
    });
    for (const alias of aliases) {
      test(`${value} is extracted from "${alias}"`, () => {
        expect(classifyBinding(value, `so ${alias} here`, false)).toBe(
          "extracted",
        );
      });
    }
  }

  test("dotted values look up the same cues", () => {
    expect(classifyBinding("on.demand", "served on request", false)).toBe(
      "extracted",
    );
  });
});

describe("binding edge cases", () => {
  test("separator runs normalize on both sides", () => {
    expect(
      classifyBinding("rate__limit", "the rate limit applies", false),
    ).toBe("extracted");
    expect(
      classifyBinding("rate_limit", "the rate__limit applies", false),
    ).toBe("extracted");
  });

  test("a missing dependency may be named by multi-letter words", () => {
    expect(
      classifyBinding("missing_dependency", "missing kibi dependency", false),
    ).toBe("extracted");
    expect(
      classifyBinding("missing_dependency", "missing  kibi dependency", false),
    ).toBe("extracted");
  });

  test("an argument name that tokenizes to nothing is never named by the claim", () => {
    expect(
      nameOrStopWordReason("!!", { argumentNames: ["__"], text: "abc" }),
    ).toBe("it repeats the argument name  and the claim does not name it");
  });

  test("without a claim text a repeated name is never named", () => {
    expect(
      nameOrStopWordReason("undefined", { argumentName: "undefined" }),
    ).toBe(
      "it repeats the argument name undefined and the claim does not name it",
    );
  });

  test("any matching constant passes a stop word", () => {
    expect(nameOrStopWordReason("the", { constants: ["x", "the"] })).toBeNull();
    expect(nameOrStopWordReason("the", {})).toBe('"the" is a stop word');
  });

  test("a value repeats no name when none is given", () => {
    expect(nameOrStopWordReason("Stryker was here!", {})).toBeNull();
    expect(nameOrStopWordReason("Stryker was here", {})).toBeNull();
  });

  test("a participant value is no subject key without constrained subjects", () => {
    expect(
      subjectKeyParticipantReason("Stryker was here", {
        argumentType: "actor",
      }),
    ).toBeNull();
  });

  test("values are trimmed before judging them", () => {
    expect(classifyBinding(" true ", "x", true)).toBe("explicit");
    expect(classifyBinding("   ", "a   b", false)).toBe("placeholder");
  });

  test("an empty token has no clause words", () => {
    expect(clauseBindingReason("!!", { argumentType: "entity" })).toBeNull();
  });

  test("aggregate ranks explicit below every other provenance", () => {
    expect(aggregateBindingProvenance(["explicit"])).toBe("explicit");
    expect(aggregateBindingProvenance(["explicit", "explicit"])).toBe(
      "explicit",
    );
    expect(aggregateBindingProvenance(["requirement"])).toBe("requirement");
    expect(aggregateBindingProvenance(["placeholder", "requirement"])).toBe(
      "placeholder",
    );
  });
});
