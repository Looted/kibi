---
name: Kibi Usage
description: "Use Kibi's source-first, exact-Git, migration-aware, proof-aware operations safely across MCP or the trusted local CLI, including partial completion repair. Also use for knowledge base quality work: cleaning up or auditing a KB, clearing kibi check review findings (broad_requirement_review, multi_requirement_symbol_review, coarse_anchor_only_review, entity-context-missing), splitting a requirement that covers several behaviors, choosing which function owns a behavior, writing why a requirement exists, and retiring knowledge whose behavior is gone."
license: AGPL-3.0-or-later
metadata:
  id: kibi-usage
  version: 3.0.0
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
    - resources/proof.md
    - resources/prolog-proofs.md
    - resources/ui-requirements.md
    - resources/logic-ir.md
    - resources/kb-improvement.md
    - resources/kb-quality.md
    - resources/operation-fields.md
---
# Kibi Usage

Kibi records what the code must do and why. Every change runs the same arc.

## Interface Selection

Use the approved `kb_*` MCP tools when they are visible (hosts may prefix
them, such as `kibi_kb_search`). Otherwise use the trusted project-local CLI,
which takes the same object:
`printf '%s\n' '{"query":"checkout"}' | npx --no-install kibi search --input -`.
If neither is available, stop and name the missing capability; never use a
global or installing runner. In a worktree or another directory, pass
`workspaceRoot` or run the CLI from there. `resources/interfaces.md` has the
details and `resources/operation-access.md` maps operation names.

## 1. Search for prior intent

Before changing behaviour, `kb_search` the question with the file in
`sourceLocations`, then `kb_query({id})` the governing requirement. The search
answer is discovery; the requirement's statement and `why` are the rule.
Answer a "why" question from its recorded `why`; when none is recorded, say
so and never supply one. A file with no linked symbols can still be governed
by a rule.

## 2. Edit

Hook snippets name the requirements a file implements, what they must keep
true, and their tests (`resources/hook-snippets.md`). A request that would
make a recorded requirement or ADR false (narrowing it or adding an exception
counts; touching its code does not) is a question, not a task: name the rule
and ask, and change the code or the rule only when the person says so. Load
`kibi-decisions` when a person states a rule or a request conflicts with one.

## 3. Record

Recording the behaviour a change adds is part of the change and needs no
permission: a requirement stated with `must`, a `## Context` section with the
reason and who gave it (write "Reason not stated." rather than inventing
one), a scenario, and an `implements` link from the symbol. Write with
`kb_upsert`, endpoints before links, one call at a time. The result reports
what was written, its warnings and typed `nextActions`: act on those instead
of reading the entity back. `dryRun: true` is an optional preview for a
payload you are unsure of; it records nothing. On `committed_with_repairs`
run the repair actions and never resend the write. Never edit `.kb/` by hand.
`resources/recording.md` has the body contract and firmness rules.

## 4. Check

Run `kb_check` with `sourceFiles` for the files you changed and fix what it
reports about your change. `kb_status` says whether the KB is fresh.

## 5. Commit

Kibi writes `.kb` files but never Git-stages or commits them: stage them
with the code (`git add .kb`). When
`kibi check --staged` or the pre-commit hook refuses the commit, load
`kibi-commit-review`.

## Resources

Read one with `kb_skills` (`action: "read"`, `id: "kibi-usage"`,
`resource`) when the task needs it:

- Modeling a claim: `domain-subjects.md`, `quantified-claims.md`,
  `predicate-ontology.md`, `fact-lanes.md`, `logic-ir.md`
- Changing someone else's KB: `second-agent-edits.md`, `source-authoring.md`
- Requirement size, owners and KB cleanup: `requirement-size.md`,
  `kb-quality.md`, `kb-improvement.md`
- Results, recovery, branches: `results-and-recovery.md`,
  `branch-lifecycle.md`
- Proof: `proof.md`, `prolog-proofs.md`; UI rules: `ui-requirements.md`
- Field rules and recipes: `operation-fields.md`, `workflows.md`,
  `relationship-directions.md`
