---
name: kibi-usage
description: "Load before changing code in a repository that has a `.kb/` folder or `kb_*` tools, and whenever a Kibi hook, check or write result leaves you unsure what to do next. Covers the change arc over MCP or the trusted local CLI: find the requirement that governs the code, edit, record a stated rule with kb_record, run the linked tests and the changed-files check, finish without asking, commit with the `.kb` files and Git-stages them yourself, plus partial-completion repair. Also use for knowledge base quality work: cleaning up or auditing a KB, clearing kibi check review findings (broad_requirement_review, multi_requirement_symbol_review, coarse_anchor_only_review, entity-context-missing), splitting a requirement that covers several behaviors, choosing which function owns a behavior, writing why a requirement exists, and retiring knowledge whose behavior is gone."
license: AGPL-3.0-or-later
metadata:
  displayName: Kibi Usage
  id: kibi-usage
  version: 3.2.0
  kibiCompatibility: ">=1.0.0"
  tags:
    - kibi
    - mcp
    - cli
    - source-first
    - branching
    - traceability
    - recovery
  resources:
    - resources/interfaces.md
    - resources/hook-snippets.md
    - resources/recording.md
    - resources/results-and-recovery.md
    - resources/second-agent-edits.md
    - resources/domain-subjects.md
    - resources/quantified-claims.md
    - resources/predicate-ontology.md
    - resources/requirement-size.md
    - resources/operation-access.md
    - resources/branch-lifecycle.md
    - resources/source-authoring.md
    - resources/relationship-directions.md
    - resources/fact-lanes.md
    - resources/workflows.md
    - resources/proof-first.md
    - resources/proof.md
    - resources/prolog-proofs.md
    - resources/ui-requirements.md
    - resources/logic-ir.md
    - resources/kb-improvement.md
    - resources/kb-quality.md
    - resources/operation-fields.md
---
# Kibi Usage

Kibi records what the code must do and why. These steps expand the brief
every Kibi surface opens with. Ask the person only for a decision: a
conflict with a recorded rule, a choice between behaviours, an exception,
or wording of a rule that says more or less than theirs. Do the steps a
Kibi result lists without asking, then report them.

## Interface Selection

Use the `kb_*` MCP tools when visible (hosts may prefix them, such as
`kibi_kb_search`); otherwise the trusted project-local CLI, which takes the
same object:
`printf '%s\n' '{"query":"checkout"}' | npx --no-install kibi search --input -`.
If neither is available, stop and name the missing capability; never use a
global or installing runner. Elsewhere, pass `workspaceRoot`. Shapes agents
guess wrong (more in `resources/interfaces.md`, `operation-access.md`):

- `kb_search {"query"}`; `kb_query {"id"}` or `{"sourceFile"}`
- `kb_record {"statement", "why", "saidBy", "quote", "code": [{"file", "symbol"}]}`:
  `symbol` is the exported or top-level declaration holding the behaviour
- `kb_review_firm_edit {"reviews": [{"requirementId", "sourceFile", "symbol", "verdict", "note"}]}`
  for the symbols the hook or finding names

## 1. Search for prior intent

Before changing behaviour, `kb_search` the question, then `kb_query({id})`
the governing requirement; if the answer is weak, add the file in
`sourceLocations`. The requirement's statement and `why` are the rule.
Answer a "why" question from its recorded `why`, or say none is recorded;
never supply one. A file with no linked symbols can still be governed.

## 2. Edit

Hook snippets name the requirements a file implements, what they must keep
true, and their tests (`resources/hook-snippets.md`). A request that would
make a recorded requirement or ADR false (narrowing it or adding an exception
counts; touching its code does not) is a question, not a task: name the rule
and ask; change the code or the rule only when the person says so. Load
`kibi-decisions` when a request conflicts with a rule.

## 3. Record

Recording what a change adds is part of it, in the same turn, and needs no
permission. Record a rule with one `kb_record` (CLI: `kibi record --input -`):
`statement` (one `must` sentence), `why` (the giver's reason, else "Reason
not stated"), `saidBy` (`user`, `maintainer`, `agent`), their `quote`, the
`code`, and an existing `test`. Their words approve it: confirm your wording
only if it says more, less or other than theirs. The result has the gate's
verdict (`commitAllowed`, findings with `blocks`), the steps left
(`nextActions`) and what only the person settles (`approvalsNeeded`). Send
each next action's `input` as returned, in order; never rebuild it from
`kb_model` output or resend a firm requirement's title. After two refusals
of a write, read `recording.md` "After kb_record". Facts, decisions and
proof contracts go through `kb_upsert`, endpoints before links. On
`committed_with_repairs` run the repairs; never resend. Never edit `.kb/`
by hand.

## 4. Check

Before your final message, run the tests linked to the code you changed
(the snippet's "Covered by" lines or the TEST ids `kb_check` names) and
update any that pin the old behaviour. Then run one `kb_check` with
`changed: true` and `sourceFiles` (CLI: `kibi check --changed <files>`) and
fix what it reports about your change. Say first if tests could not run.
At level `remember` (`kb_status`) Kibi asks for no scenarios or proofs; at
`test`, follow `nextActions` (`resources/proof-first.md`).

## 5. Commit

When you commit: Kibi writes `.kb` files but never Git-stages or commits
them, so stage them with the code (`git add .kb`). When
`kibi check --staged` or the pre-commit hook refuses, load
`kibi-commit-review`.

## Resources

Read one with `kb_skills` (`action: "read"`, `id: "kibi-usage"`,
`resource: "resources/<name>"`) or from `resources/` beside this file:

- Modeling a claim: `domain-subjects.md`, `quantified-claims.md`,
  `predicate-ontology.md`, `fact-lanes.md`, `logic-ir.md`
- Someone else's KB: `second-agent-edits.md`, `source-authoring.md`
- Size, owners, cleanup: `requirement-size.md`, `kb-quality.md`,
  `kb-improvement.md`
- Results, recovery, branches: `results-and-recovery.md`,
  `branch-lifecycle.md`
- Proof: `proof-first.md`, then `proof.md`, `prolog-proofs.md`; UI:
  `ui-requirements.md`
- Fields and recipes: `operation-fields.md` (large; search it),
  `workflows.md`, `relationship-directions.md`
