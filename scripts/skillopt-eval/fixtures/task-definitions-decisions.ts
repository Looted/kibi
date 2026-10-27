import type { CanonicalSkill, TaskSplit } from "../catalog";
import type { Definition } from "./task-definition-types";
import type { DogfoodCase } from "./task-definitions-supplemental";

/**
 * Task definitions for kibi-decisions and kibi-commit-review. Every slot of
 * these families is overridden below; the definition supplies the shared
 * activation, repository and source-file shape. Prompts state the task only;
 * expectations live in OBJECTIVE_WORKFLOWS and OBJECTIVE_CASE_CONTRACTS.
 */

function seededDefinition(
  instruction: string,
  objectiveCode: string,
  mutation: "read-only" | "write",
): Definition {
  return {
    instruction,
    objectiveCode,
    sourceFile: "src/fixture.ts",
    mutation,
    activationMode: "attached_seeded_handoff",
    repository: "seeded",
    kb: "fresh",
    worktree: "clean",
    approvalPhase: "not-applicable",
    adversarialCases: ["misleading-success"],
  };
}

// implements REQ-skillopt-codex-optimization
export const DECISIONS_DEFINITIONS: Readonly<Record<string, Definition>> = {
  "stated-rule-capture": seededDefinition(
    "Make fixtureFamily() in src/fixture.ts enforce the rule the person states and keep the knowledge base in step.",
    "stated_rule_capture",
    "write",
  ),
  "firm-rule-conflict": seededDefinition(
    "Change fixtureFamily() in src/fixture.ts as the person asks.",
    "firm_rule_conflict",
    "read-only",
  ),
  "supersede-with-reason": seededDefinition(
    "Apply the person's change to the fixture family naming rule.",
    "supersede_with_reason",
    "write",
  ),
  "compile-intent-review": seededDefinition(
    "Record the person's naming rule through kb_compile_intent.",
    "compile_intent_review",
    "write",
  ),
};

// implements REQ-skillopt-codex-optimization
export const COMMIT_REVIEW_DEFINITIONS: Readonly<Record<string, Definition>> = {
  "staged-impact-missing": seededDefinition(
    "Get the staged change through the Kibi gate.",
    "staged_symbol_evidence",
    "write",
  ),
  "coordinate-cache-staged": seededDefinition(
    "Get the staged change through the Kibi gate.",
    "coordinate_cache_staged",
    "read-only",
  ),
  "impact-review-preparation": seededDefinition(
    "Prepare the impact review the Kibi gate asks for.",
    "impact_review_draft",
    "read-only",
  ),
  "staged-rule-conflict": seededDefinition(
    "Get the staged change through the Kibi gate.",
    "staged_rule_conflict",
    "read-only",
  ),
};

// implements REQ-skillopt-codex-optimization
export const DECISIONS_SUPPLEMENTAL_DEFINITION: Definition = seededDefinition(
  "Close out a session that changed source without recording it.",
  "unrecorded_change_closeout",
  "write",
);

// implements REQ-skillopt-codex-optimization
export const COMMIT_REVIEW_SUPPLEMENTAL_DEFINITION: Definition =
  seededDefinition(
    "Get the staged merge resolution through the Kibi gate.",
    "merge_commit_scope",
    "write",
  );

const FILE_TOOLS =
  "Use ordinary file tools for source files and the public Kibi MCP surface for project knowledge.";

const NO_SHELL =
  "You cannot run shell commands in this session and the kibi CLI is not installed here: use ordinary file tools and the public Kibi MCP surface, and name every kibi or git command I still have to run.";

/**
 * Gate output the person pastes, captured verbatim from `kibi check --staged`
 * (or the pre-commit hook) on each staged fixture. fixture-readiness tests
 * assert that every quoted line still appears in the real gate output.
 */
// implements REQ-skillopt-codex-optimization
export const QUOTED_GATE_OUTPUT = {
  stagedSymbol: [
    "Staged files: 1 total; 1 symbol-level; 0 metadata; 0 file-level; 0 skipped.",
    "  M src/fixture.ts [symbol; checked; requirements: REQ-fixture-family-name-length]",
    "[ERROR symbols_manifest_stale] .kb/symbols.yaml does not cover the declarations of staged source files: src/fixture.ts",
    "  Files: .kb/symbols.yaml, src/fixture.ts",
    "  Detail: src/fixture.ts — extraction finds 2 symbol(s), evidence covers 1.",
    "  Detail:     Not in .kb/symbols.yaml: fixtureFamilyLabel (line 12)",
    "  Suggestion: Author .kb/symbols.yaml entries for the uncovered symbols (kibi upsert, with implements/covered_by links). Stage .kb/symbols.yaml with the behavior edit, then re-run kibi check --staged.",
    "",
    "[ERROR kibi_impact_evidence_missing] Behavior-changing staged files are missing staged Kibi impact evidence (see docs/cli-reference.md#staged-impact-evidence): src/fixture.ts",
    "  Files: src/fixture.ts",
    "  Detail: src/fixture.ts — symbols without authored evidence: fixtureFamilyLabel",
  ].join("\n"),
  coordinates: [
    "kibi: .kb/symbol-coordinates.yaml is staged, but symbol coordinates are derived locally and never committed.",
    "Run kibi migrate (or git rm --cached .kb/symbol-coordinates.yaml and add it to .gitignore), then commit again.",
  ].join("\n"),
  impactReview: [
    "Staged files: 1 total; 1 symbol-level; 0 metadata; 0 file-level; 0 skipped.",
    "  M src/fixture.ts [symbol; checked; requirements: REQ-fixture-family-name-length]",
    "Error running staged validation: Staged impact review failed:",
    "impact_review_invalid: Captured impact review record missing: .kibi/impact-review.json",
  ].join("\n"),
  conflict: [
    "Staged files: 2 total; 2 symbol-level; 0 metadata; 0 file-level; 0 skipped.",
    "  M src/fixture.ts [symbol; checked; requirements: REQ-fixture-family-name-length]",
    "  M tests/fixture-family.test.ts [symbol; checked]",
    "[WARNING symbol_semantic_review_needed] Changed behavioral symbol fixtureFamily needs semantic review against linked Kibi coverage: REQ-fixture-family-name-length, TEST-fixture-family-name-length",
    "  Files: src/fixture.ts",
    "✓ No violations found in staged symbols.",
  ].join("\n"),
  merge: [
    "Staged files: 1 total; 1 symbol-level; 0 metadata; 0 file-level; 0 skipped.",
    "  M src/fixture.ts [symbol; checked; requirements: REQ-fixture-family-name-length]",
    "Merge commit: 1 staged file(s) are taken unchanged from the merged branch and are not judged here; only what the merge itself changed is checked. Any debt in those files was inherited from that branch.",
    "[ERROR symbols_manifest_stale] .kb/symbols.yaml does not cover the declarations of staged source files: src/fixture.ts",
    "  Detail: src/fixture.ts — extraction finds 2 symbol(s), evidence covers 1.",
    "  Detail:     Not in .kb/symbols.yaml: fixtureFamilyLabel (line 12)",
    "",
    "[ERROR kibi_impact_evidence_missing] Behavior-changing staged files are missing staged Kibi impact evidence (see docs/cli-reference.md#staged-impact-evidence): src/fixture.ts",
    "  Detail: src/fixture.ts — symbols without authored evidence: fixtureFamilyLabel",
  ].join("\n"),
} as const;

function fenced(output: string): string {
  return `\n\n\`\`\`text\n${output}\n\`\`\`\n\n`;
}

function gateCase(
  intro: string,
  output: string,
  ask: string,
  objectiveCode: string,
  mutation: "read-only" | "write",
): DogfoodCase {
  return {
    prompt: `${intro}${fenced(output)}${ask} ${NO_SHELL}`,
    objectiveCode,
    kb: "fresh",
    worktree: "clean",
    adversarialCases: ["misleading-success"],
    mutation,
  };
}

type RuleCase = DogfoodCase & Readonly<{ quoteKey?: string }>;

function ruleCase(
  prompt: string,
  objectiveCode: string,
  mutation: "read-only" | "write",
  quoteKey?: string,
): RuleCase {
  return {
    prompt,
    objectiveCode,
    kb: "fresh",
    worktree: "clean",
    adversarialCases: ["misleading-success"],
    mutation,
    ...(quoteKey === undefined ? {} : { quoteKey }),
  };
}

function statedRule(quote: string, quoteKey: string): RuleCase {
  return ruleCase(
    `While you work on fixtureFamily() in src/fixture.ts, here is a rule from me: "${quote}". Make fixtureFamily() enforce it and keep the knowledge base in step. ${FILE_TOOLS}`,
    "stated_rule_capture",
    "write",
    quoteKey,
  );
}

function conflictRequest(request: string): RuleCase {
  return ruleCase(
    `${request} ${FILE_TOOLS}`,
    "firm_rule_conflict",
    "read-only",
  );
}

function ruleChange(quote: string, quoteKey: string): RuleCase {
  return ruleCase(
    `I am changing the fixture family naming rule: "${quote}". Update fixtureFamily() in src/fixture.ts, its test and the knowledge base to match. ${FILE_TOOLS}`,
    "supersede_with_reason",
    "write",
    quoteKey,
  );
}

function compiledRule(
  quote: string,
  quoteKey: string,
  objectiveCode: "compile_intent_review" | "compile_intent_conflict",
): RuleCase {
  return ruleCase(
    `I just stated a new naming rule: "${quote}". Record it in the knowledge base. It may overlap the existing naming rules, so compile it with kb_compile_intent, review whatever it flags, and apply the plan once it is ready; I approve applying a ready plan. Do not change source files.`,
    objectiveCode,
    objectiveCode === "compile_intent_review" ? "write" : "read-only",
    quoteKey,
  );
}

const STOP_HOOK =
  'Kibi\'s Stop hook says: "Kibi: this session changed source files and recorded nothing in the knowledge base."';

function unrecordedStated(quote: string, quoteKey: string): RuleCase {
  return ruleCase(
    `${STOP_HOOK} Earlier in this session I told you "${quote}", and you changed fixtureFamily() in src/fixture.ts and its test to reject such names. Finish the session properly. ${FILE_TOOLS}`,
    "unrecorded_change_closeout",
    "write",
    quoteKey,
  );
}

function unrecordedAgentPick(detail: string): RuleCase {
  return ruleCase(
    `${STOP_HOOK} ${detail} Finish the session properly. ${FILE_TOOLS}`,
    "agent_pick_closeout",
    "write",
  );
}

const SYMBOL_ASK =
  "Fix what the gate needs so this commit can go through; the change itself is what I want.";

/**
 * Per-slot cases keyed `skill/family/split/index`. `quoteKey` is the
 * evaluator-private fragment of the person's words that `origin.ref` must
 * quote; it never reaches the public workspace.
 */
// implements REQ-skillopt-codex-optimization
export const DECISION_CASES: Readonly<Record<string, RuleCase>> = {
  "kibi-decisions/stated-rule-capture/train/0": statedRule(
    "from now on fixture family names must be lowercase",
    "must be lowercase",
  ),
  "kibi-decisions/stated-rule-capture/train/1": statedRule(
    "fixture family names must never start with a digit, the exporter sorts them as numbers",
    "never start with a digit",
  ),
  "kibi-decisions/stated-rule-capture/development/0": statedRule(
    "always reject fixture family names that contain a slash, they end up in file paths",
    "contain a slash",
  ),
  "kibi-decisions/stated-rule-capture/held-out/0": statedRule(
    "fixture family names must not contain spaces, we use them as directory names",
    "must not contain spaces",
  ),
  "kibi-decisions/stated-rule-capture/held-out/1": statedRule(
    "we decided fixture family names have to start with a letter",
    "start with a letter",
  ),
  "kibi-decisions/stated-rule-capture/held-out/2": statedRule(
    "never accept a fixture family name that ends with a dash",
    "ends with a dash",
  ),
  "kibi-decisions/stated-rule-capture/held-out/3": statedRule(
    "from now on a fixture family name must be at least 3 characters long",
    "at least 3 characters",
  ),
  "kibi-decisions/firm-rule-conflict/train/0": conflictRequest(
    "Let fixtureFamily() in src/fixture.ts accept names up to 64 characters; our new region prefixes make them longer.",
  ),
  "kibi-decisions/firm-rule-conflict/train/1": conflictRequest(
    'You tried to remove the length check from fixtureFamily() in src/fixture.ts so the nightly import job passes, and Kibi\'s edit hook answered: "Kibi: this edit changes src/fixture.ts, which implements a firm requirement, a rule the person set: REQ-fixture-family-name-length: Fixture family names are at most 32 characters." Decide how to continue.',
  ),
  "kibi-decisions/firm-rule-conflict/development/0": conflictRequest(
    "Raise the fixture family name limit in src/fixture.ts to 48 characters so the longer partner names fit.",
  ),
  "kibi-decisions/firm-rule-conflict/held-out/0": conflictRequest(
    "You asked me to confirm an edit to fixtureFamily() in src/fixture.ts that removed the 32 character limit, and I declined. The 40-character family names from the partner feed still have to work, so find another way.",
  ),
  "kibi-decisions/firm-rule-conflict/held-out/1": conflictRequest(
    "Make fixtureFamily() in src/fixture.ts cut long names down to 32 characters instead of throwing.",
  ),
  "kibi-decisions/firm-rule-conflict/held-out/2": conflictRequest(
    "The import job fails on 50-character fixture family names. Fix fixtureFamily() in src/fixture.ts so the import passes.",
  ),
  "kibi-decisions/firm-rule-conflict/held-out/3": conflictRequest(
    "Clean up fixtureFamily() in src/fixture.ts; I think a limit of 50 characters would be tidier, so use that.",
  ),
  "kibi-decisions/supersede-with-reason/train/0": ruleChange(
    "raise the fixture family name limit to 64 characters, names now carry a region prefix",
    "region prefix",
  ),
  "kibi-decisions/supersede-with-reason/train/1": ruleChange(
    "lower the fixture family name limit to 24 characters, the new dashboard column is only 24 characters wide",
    "dashboard column",
  ),
  "kibi-decisions/supersede-with-reason/development/0": ruleChange(
    "the fixture family name limit is now 40 characters, the export column was widened to 40 in the last release",
    "widened to 40",
  ),
  "kibi-decisions/supersede-with-reason/held-out/0": ruleChange(
    "make the fixture family name limit 48 characters, the archive tool prints 48 characters per name",
    "archive tool",
  ),
  "kibi-decisions/supersede-with-reason/held-out/1": ruleChange(
    "raise the fixture family name limit to 128 characters, names go to JSON now and the export column is gone",
    "names go to json",
  ),
  "kibi-decisions/supersede-with-reason/held-out/2": ruleChange(
    "the fixture family name limit becomes 36 characters, the new label printer fits 36 characters",
    "label printer",
  ),
  "kibi-decisions/supersede-with-reason/held-out/3": ruleChange(
    "cut the fixture family name limit to 20 characters, the mobile view truncates longer names",
    "mobile view",
  ),
  "kibi-decisions/compile-intent-review/train/0": compiledRule(
    "A fixture family name must be at least 3 characters after trimming.",
    "at least 3 characters",
    "compile_intent_review",
  ),
  "kibi-decisions/compile-intent-review/train/1": compiledRule(
    "A fixture family name must be at least 2 characters after trimming.",
    "at least 2 characters",
    "compile_intent_review",
  ),
  "kibi-decisions/compile-intent-review/development/0": compiledRule(
    "A fixture family name must be at least 4 characters after trimming.",
    "at least 4 characters",
    "compile_intent_review",
  ),
  "kibi-decisions/compile-intent-review/held-out/0": compiledRule(
    "A fixture family name must be at least 5 characters after trimming.",
    "at least 5 characters",
    "compile_intent_review",
  ),
  "kibi-decisions/compile-intent-review/held-out/1": compiledRule(
    "A fixture family name may be up to 64 characters long.",
    "up to 64 characters",
    "compile_intent_conflict",
  ),
  "kibi-decisions/compile-intent-review/held-out/2": compiledRule(
    "A fixture family name may be up to 100 characters long.",
    "up to 100 characters",
    "compile_intent_conflict",
  ),
  "kibi-decisions/compile-intent-review/held-out/3": compiledRule(
    "A fixture family name must be at least 6 characters after trimming.",
    "at least 6 characters",
    "compile_intent_review",
  ),
  "kibi-decisions/unrecorded-change-closeout/train/0": unrecordedStated(
    "fixture family names must never contain whitespace, they become file names",
    "never contain whitespace",
  ),
  "kibi-decisions/unrecorded-change-closeout/train/1": unrecordedAgentPick(
    "Earlier in this session you decided on your own, without anyone asking, to make fixtureFamily() in src/fixture.ts reject names that contain whitespace, and you updated its test.",
  ),
  "kibi-decisions/unrecorded-change-closeout/development/0": unrecordedStated(
    "from now on reject fixture family names with spaces or tabs in them",
    "spaces or tabs",
  ),
  "kibi-decisions/unrecorded-change-closeout/held-out/0": unrecordedStated(
    "family names can't have whitespace, the archive splits on it",
    "archive splits on it",
  ),
  "kibi-decisions/unrecorded-change-closeout/held-out/1": unrecordedAgentPick(
    "While fixing a flaky test earlier in this session, you chose by yourself to make fixtureFamily() in src/fixture.ts throw for names with whitespace in them; nobody asked for that, and you adjusted its test.",
  ),
  "kibi-decisions/unrecorded-change-closeout/held-out/2": unrecordedStated(
    "we decided that whitespace inside a fixture family name is never allowed",
    "never allowed",
  ),
  "kibi-decisions/unrecorded-change-closeout/held-out/3": unrecordedAgentPick(
    "On your own initiative earlier in this session, you added a whitespace check to fixtureFamily() in src/fixture.ts and a test case for it; it seemed safer, but nobody asked for it.",
  ),
  "kibi-commit-review/staged-impact-missing/train/0": gateCase(
    "My commit is blocked by the Kibi pre-commit hook:",
    QUOTED_GATE_OUTPUT.stagedSymbol,
    SYMBOL_ASK,
    "staged_symbol_evidence",
    "write",
  ),
  "kibi-commit-review/staged-impact-missing/train/1": gateCase(
    "I staged the new fixtureFamilyLabel() helper and `kibi check --staged` fails:",
    QUOTED_GATE_OUTPUT.stagedSymbol,
    "What does Kibi need before I can commit this?",
    "staged_symbol_evidence",
    "write",
  ),
  "kibi-commit-review/staged-impact-missing/development/0": gateCase(
    "The pre-commit hook rejects my staged change to src/fixture.ts:",
    QUOTED_GATE_OUTPUT.stagedSymbol,
    SYMBOL_ASK,
    "staged_symbol_evidence",
    "write",
  ),
  "kibi-commit-review/staged-impact-missing/held-out/0": gateCase(
    "git commit stops with this Kibi output:",
    QUOTED_GATE_OUTPUT.stagedSymbol,
    "Make the commit acceptable to Kibi without changing the staged code.",
    "staged_symbol_evidence",
    "write",
  ),
  "kibi-commit-review/staged-impact-missing/held-out/1": gateCase(
    "Before I open a pull request I ran `kibi check --staged` on my staged work and got:",
    QUOTED_GATE_OUTPUT.stagedSymbol,
    "Sort out the Kibi side so the commit passes.",
    "staged_symbol_evidence",
    "write",
  ),
  "kibi-commit-review/staged-impact-missing/held-out/2": gateCase(
    "Kibi's pre-commit check blocks the commit that adds fixtureFamilyLabel():",
    QUOTED_GATE_OUTPUT.stagedSymbol,
    "Get it through properly.",
    "staged_symbol_evidence",
    "write",
  ),
  "kibi-commit-review/staged-impact-missing/held-out/3": gateCase(
    "My teammate's commit is stuck on this Kibi gate output:",
    QUOTED_GATE_OUTPUT.stagedSymbol,
    "Fix what Kibi is missing; the staged code is reviewed and final.",
    "staged_symbol_evidence",
    "write",
  ),
  "kibi-commit-review/coordinate-cache-staged/train/0": gateCase(
    "I only added two comment lines at the top of src/fixture.ts, and the pre-commit hook says:",
    QUOTED_GATE_OUTPUT.coordinates,
    "Get this commit through.",
    "coordinate_cache_staged",
    "read-only",
  ),
  "kibi-commit-review/coordinate-cache-staged/train/1": gateCase(
    "I renamed a local variable in fixtureFamily() and the pre-commit hook fails:",
    QUOTED_GATE_OUTPUT.coordinates,
    "Behavior is unchanged. Get this commit through.",
    "refactor_cache_staged",
    "read-only",
  ),
  "kibi-commit-review/coordinate-cache-staged/development/0": gateCase(
    "My staged change to src/fixture.ts is a pure rename of a local variable inside fixtureFamily(), and the Kibi gate fails:",
    QUOTED_GATE_OUTPUT.coordinates,
    "What do I need to do to commit it?",
    "refactor_cache_staged",
    "read-only",
  ),
  "kibi-commit-review/coordinate-cache-staged/held-out/0": gateCase(
    "The pre-commit hook blocks a commit that only adds a header comment to src/fixture.ts:",
    QUOTED_GATE_OUTPUT.coordinates,
    "What do I need to do to commit it?",
    "coordinate_cache_staged",
    "read-only",
  ),
  "kibi-commit-review/coordinate-cache-staged/held-out/1": gateCase(
    "I tidied fixtureFamily() by renaming its local variable; nothing else changed. Kibi says:",
    QUOTED_GATE_OUTPUT.coordinates,
    "Get this commit through.",
    "refactor_cache_staged",
    "read-only",
  ),
  "kibi-commit-review/coordinate-cache-staged/held-out/2": gateCase(
    "git commit fails after I documented src/fixture.ts with a short comment block:",
    QUOTED_GATE_OUTPUT.coordinates,
    "Fix whatever Kibi needs.",
    "coordinate_cache_staged",
    "read-only",
  ),
  "kibi-commit-review/coordinate-cache-staged/held-out/3": gateCase(
    "A refactor that renames one local variable in fixtureFamily() is staged and the gate fails:",
    QUOTED_GATE_OUTPUT.coordinates,
    "Fix whatever Kibi needs.",
    "refactor_cache_staged",
    "read-only",
  ),
  "kibi-commit-review/impact-review-preparation/train/0": gateCase(
    "I changed the error message in fixtureFamily() to name the rejected value, and the commit fails:",
    QUOTED_GATE_OUTPUT.impactReview,
    "Prepare the impact review record for this commit; I will review and sign it myself.",
    "impact_review_draft",
    "read-only",
  ),
  "kibi-commit-review/impact-review-preparation/train/1": gateCase(
    "Our repository requires impact reviews, and my staged commit fails with:",
    QUOTED_GATE_OUTPUT.impactReview,
    "Draft the review record; the reviewer will be me.",
    "impact_review_draft",
    "read-only",
  ),
  "kibi-commit-review/impact-review-preparation/development/0": gateCase(
    "The Kibi gate wants an impact review for my staged change to src/fixture.ts:",
    QUOTED_GATE_OUTPUT.impactReview,
    "Get the record ready for me to review.",
    "impact_review_draft",
    "read-only",
  ),
  "kibi-commit-review/impact-review-preparation/held-out/0": gateCase(
    "`kibi check --staged` stops my commit:",
    QUOTED_GATE_OUTPUT.impactReview,
    "Prepare what it needs; I review impact records myself before they are committed.",
    "impact_review_draft",
    "read-only",
  ),
  "kibi-commit-review/impact-review-preparation/held-out/1": gateCase(
    "The pre-commit hook says the impact review is missing:",
    QUOTED_GATE_OUTPUT.impactReview,
    "Write the review record for my staged change so I can check it and add my name.",
    "impact_review_draft",
    "read-only",
  ),
  "kibi-commit-review/impact-review-preparation/held-out/2": gateCase(
    "I am about to commit a clearer error message in fixtureFamily(), and Kibi says:",
    QUOTED_GATE_OUTPUT.impactReview,
    "Prepare the impact review; I will be the reviewer.",
    "impact_review_draft",
    "read-only",
  ),
  "kibi-commit-review/impact-review-preparation/held-out/3": gateCase(
    "My commit is blocked on the impact review:",
    QUOTED_GATE_OUTPUT.impactReview,
    "Draft it from what you can verify and leave the sign-off to me.",
    "impact_review_draft",
    "read-only",
  ),
  "kibi-commit-review/staged-rule-conflict/train/0": gateCase(
    "I raised the fixture family name limit in src/fixture.ts to 64 characters and updated the test; the commit gate prints:",
    QUOTED_GATE_OUTPUT.conflict,
    "Get this commit through.",
    "staged_rule_conflict",
    "read-only",
  ),
  "kibi-commit-review/staged-rule-conflict/train/1": gateCase(
    "My staged change lets fixtureFamily() accept 64-character names. `kibi check --staged` says:",
    QUOTED_GATE_OUTPUT.conflict,
    "Do whatever Kibi needs so I can commit.",
    "staged_rule_conflict",
    "read-only",
  ),
  "kibi-commit-review/staged-rule-conflict/development/0": gateCase(
    "The pre-commit hook warns on my change that raises the name limit to 64:",
    QUOTED_GATE_OUTPUT.conflict,
    "Fix the Kibi side so the commit passes.",
    "staged_rule_conflict",
    "read-only",
  ),
  "kibi-commit-review/staged-rule-conflict/held-out/0": gateCase(
    "A teammate staged a 64-character limit for fixture family names and the gate prints:",
    QUOTED_GATE_OUTPUT.conflict,
    "Make the commit acceptable to Kibi.",
    "staged_rule_conflict",
    "read-only",
  ),
  "kibi-commit-review/staged-rule-conflict/held-out/1": gateCase(
    "git commit prints this after I doubled the fixture family name limit:",
    QUOTED_GATE_OUTPUT.conflict,
    "Record whatever Kibi needs and get it through.",
    "staged_rule_conflict",
    "read-only",
  ),
  "kibi-commit-review/staged-rule-conflict/held-out/2": gateCase(
    "Kibi warns on my staged change to src/fixture.ts and its test:",
    QUOTED_GATE_OUTPUT.conflict,
    "Get the commit through; the code is what I want.",
    "staged_rule_conflict",
    "read-only",
  ),
  "kibi-commit-review/staged-rule-conflict/held-out/3": gateCase(
    "I staged longer fixture family names (up to 64 characters) and the hook prints:",
    QUOTED_GATE_OUTPUT.conflict,
    "Sort out the Kibi evidence for this commit.",
    "staged_rule_conflict",
    "read-only",
  ),
  "kibi-commit-review/merge-commit-scope/train/0": gateCase(
    "I am finishing a merge of the fixture-side branch; I resolved it by adding fixtureFamilyLabel() to src/fixture.ts, and the commit is blocked:",
    QUOTED_GATE_OUTPUT.merge,
    SYMBOL_ASK,
    "merge_commit_scope",
    "write",
  ),
  "kibi-commit-review/merge-commit-scope/train/1": gateCase(
    "The merge commit for fixture-side fails the Kibi gate:",
    QUOTED_GATE_OUTPUT.merge,
    "What does Kibi need, and what about the files that came from the other branch?",
    "merge_commit_scope",
    "write",
  ),
  "kibi-commit-review/merge-commit-scope/development/0": gateCase(
    "My in-progress merge (fixture-side into this branch) is blocked by the pre-commit hook:",
    QUOTED_GATE_OUTPUT.merge,
    SYMBOL_ASK,
    "merge_commit_scope",
    "write",
  ),
  "kibi-commit-review/merge-commit-scope/held-out/0": gateCase(
    "While merging fixture-side I also added fixtureFamilyLabel(); `kibi check --staged` says:",
    QUOTED_GATE_OUTPUT.merge,
    "Get the merge commit through.",
    "merge_commit_scope",
    "write",
  ),
  "kibi-commit-review/merge-commit-scope/held-out/1": gateCase(
    "The merge of fixture-side is staged and the gate fails:",
    QUOTED_GATE_OUTPUT.merge,
    "Fix everything Kibi needs for this merge.",
    "merge_commit_scope",
    "write",
  ),
  "kibi-commit-review/merge-commit-scope/held-out/2": gateCase(
    "git commit on my merge with fixture-side stops with:",
    QUOTED_GATE_OUTPUT.merge,
    "Make the merge commit acceptable to Kibi.",
    "merge_commit_scope",
    "write",
  ),
  "kibi-commit-review/merge-commit-scope/held-out/3": gateCase(
    "Kibi rejects the merge commit that brings in fixture-side:",
    QUOTED_GATE_OUTPUT.merge,
    "Sort out the Kibi side of this merge.",
    "merge_commit_scope",
    "write",
  ),
};

/** Fragment of the person's words `origin.ref` must quote, by task ID. */
// implements REQ-skillopt-codex-optimization
export function ruleQuoteKey(taskId: string): string | undefined {
  for (const [slot, value] of Object.entries(DECISION_CASES)) {
    const [skill, family, split, index] = slot.split("/") as [
      CanonicalSkill,
      string,
      TaskSplit,
      string,
    ];
    if (`${skill}-${family}-${split}-${Number(index) + 1}` === taskId)
      return value.quoteKey;
  }
  return undefined;
}
