# Recording knowledge

## Entity body contract

The body is where context lives; front matter is the checked meaning.
`kb_check` rule `entity-context-missing` blocks a current `req`, `scenario`,
`test`, `adr` or observation/meta `fact` whose body carries no context: at
least 12 words that are not a restatement of the title (for a requirement, also
not of `semantic_text`). Symbols, flags, events and every other fact kind are
exempt. `kb_upsert` returns the same finding as a warning, including on dryRun.

- `req`: the statement, then `## Context` (why, who asked, constraints) and
  `## Source` (blockquoted excerpt plus reference). Only text under context
  headings (Context, Rationale, Why, Background, Source, Notes, Evidence)
  counts for a requirement, and it never changes the checked meaning:
  `semantic_text` is written explicitly and context sections are excluded.
- `scenario`: Given/When/Then prose plus the assumptions it depends on.
- `test`: what it asserts, how (fixture, entry point), what would make it a
  false pass.
- `fact` (`observation`/`meta`): what was seen, where, when, how confirmed.
- Never invent a reason the requester did not give. Write "Reason not stated"
  and the source instead. A reason comes from the person or from history you
  can cite (a commit, pull request, issue, design document): name that source
  next to it. When history is silent and a reason is still wanted, ask the
  person; a reason you worked out yourself is written as "Inferred from
  <what you read>: ..." and stays labelled that way after they approve it.
  A plausible reason with no source reads as history to the next agent.
  A sentence on what the rule achieves ("keeps labels recognizable") is a
  reason too: leave it out unless a source says it. When no source gives the
  reason, the Context says exactly "Reason not stated." next to who asked.
- Context says who owns the behavior now. After a split or supersede, a
  section that still calls the closed requirement the owner ("X decides
  this") misleads every later reader: re-point it to the current requirement,
  and keep the old id only in a "Split from" or "Superseded" sentence. Do not
  paste one context paragraph into sibling requirements it does not fit.
- State the requirement with `must` or `shall`, and start each claim with its
  subject, not a pronoun: hooks print claims alone ("It: must be ..." tells
  the reader nothing).
- The tag `review:context-missing` is reserved for entities the schema 8
  migration (`kibi migrate`) acknowledged and recorded in the manifest; it is
  counted by the advisory `entity-context-acknowledged`. Never add it yourself:
  on any other entity it is still a violation. Write who asked, the source and
  "Reason not stated" in the Context section instead.
- `kb_plan_compile_intent` requires `context` when the plan creates a
  requirement, and accepts `sourceExcerpt` and `sourceReference`. On update it
  rewrites the statement and keeps the existing context sections unless you
  supply new `context` or source.

## Source-first mutation

Use `document.path` when a new entity has no single configured writable target.
Existing entities preserve body bytes when `document.body` is omitted; a new
requirement without `document.body` gets `semantic_text` as its body, and
`kb_check` then blocks it with `entity-context-missing`, so always pass a
sectioned `document.body` (see Entity body contract above). Relationship mutations
patch canonical shards while preserving unrelated records. Authored entity
deletion returns a hash-bound approval plan; requirements normally evolve via a
new entity linked with `supersedes`; set the replaced requirement to
`status: closed` in the same change, because `kb_check` blocks an open
superseded requirement and supersession cycles. A requirement that grew to
cover several behaviors is split the same way; see
`resources/requirement-size.md`. Kibi compiles `source` from
the entity's own file and never writes an authored `source` field, so
`kb_upsert` cannot change one. When `kb_check` blocks a leftover value
(`source-path-dangling`), run `kibi migrate`: its automatic
`source_path_rewrite` action removes the value, or rewrites it when the file
moved. Never hand-edit `.kb/` for it. Read `resources/source-authoring.md`
before source writes, deletion approval, or recovery.

`kb_apply_plan` applies a whole plan atomically: a failure changes nothing.
An interrupted plan is settled by the next `kb_apply_plan`, `kb_upsert`, or
`kb_delete` (full MCP profile only; CLI `kibi delete --input -`) call, or by `kb_apply_plan` with its `recoveryJournalId`; never
re-apply the original plan. On a detached HEAD, reads answer from a read-only
snapshot and writes are refused; check out a branch before mutating.

## Origin and approvals

Entities record `origin` (`kind`: `human`, `agent`, `migration`, or `import`,
plus optional `ref` and `approved_by`). `kb_upsert` records `kind: agent` on
entities you create; leave `origin.approved_by` to the person who reviews them,
and ask for that review with `kibi signoff` (see `kibi-decisions`), never with
a summary in your own words.
An exception (a requirement that `exempts` another) exempts nothing until a
human sets `approved_by`; `kb_check` flags approvals an agent recorded without
corroboration. Never fill in an approval yourself. Record why a requirement
exists in `rationale`, or link the ADR that explains it.

An approval covers what the person was shown. A general request ("clean up
the KB", "get the check to zero") approves no statement, reason, retirement
or exception: list the specific items (new or changed statements marked as
such, each reason with its source), ask, and quote the reply you get in
`origin.ref` of exactly the entities it covered.

A signoff belongs to the change it approves. Ask for it before you open or
merge the pull request, and when the person answers, record their answer
(`approved_by` or a `*_waiver_approved_by` field set to them, their words in
`origin.ref` or `approval_ref`) on the same branch and push it to the same pull
request. Writing down an answer the person gave is not approving it yourself.
Never open a separate pull request only to carry a signoff, firmness or waiver
approval.

## Decision firmness

Requirements and ADRs carry `firmness`, which says what you may do with them.
Load `kibi-decisions` when a person states a rule, a hook asks before an edit
of firm code, or a request conflicts with a recorded rule.
Search answers, `kb_query` rows and hook snippets show it (snippets label only
`[firm: ask before changing]` and `[exploratory]`; an unlabeled decision is
`default`).

- `firm`: a human stated it as a rule. Follow it; to change it, ask first.
  A requirement or ADR with no `firmness` reads as `firm` unless an agent
  wrote it (`origin.kind: agent`): rules people wrote, imported or carried
  over from before origins existed are theirs. `kb_check` blocks an explicit
  `firmness: firm` without `origin.ref` to their words, and a replacement of
  a firm decision that is not itself firm. Never edit a firm decision's
  title, statement or (ADR) body in place, by `kb_upsert` or on disk:
  `kb_upsert` refuses it and `kb_check` reports `decision-firm-edited`
  unless the edit cites new human words in `origin.ref`. Context sections,
  tags, status and links stay editable.
- `default`: a delegated or agent choice (`firmness: default`, or an
  agent-written decision without `firmness`). Follow it; supersede it only on
  evidence that it is wrong (a failing test, a measured cost, a constraint it
  missed), in the same change, listed under "Decisions I changed".
- `exploratory`: a flagged guess; revisit it when you touch the area.

**A request that conflicts with a recorded rule is a question, whatever the
rule's firmness.** A conflict means the request would make the rule's
statement false, including narrowing it or adding an exception; touching the
same code is not a conflict, and when you cannot tell, ask. The request is not
evidence against the rule: it is the conflict a person has to decide. Name the rule (id and what it requires) and
ask whether to change it; do not implement the request and do not supersede
the rule. Go ahead only when the person has said to change that rule, in this
task or in reply: then supersede it with `firmness: firm` and `origin.ref` to
their words (or, for a correction they asked for in place, update it with
`origin.ref` to those words), and say in the final answer which rule changed.

Set `firmness` explicitly from what a human actually said: only their stated
rule is `firm` (with `origin.ref` to their words); your own pick is `default`;
a guess is `exploratory`. A supersede needs a `## Why this changed` section of
at least 12 words naming the evidence; a preference is not evidence. Never
cite words nobody said. `kibi-decisions` has the recording and supersede
payloads.

Conditional clauses ("only when", "only if", "must not ... unless") compile
into typed `forbid` rules linked by `requires_rule`, not property facts; one
`kb_model` (full MCP profile only; CLI `kibi model --input -`) or `kb_compile_intent` (full MCP profile only; CLI `kibi compile-intent --input -`) cannot translate stays an `ontology_gap`.

`kb_compile_intent` reports `contradictionAnalysis.outcome: no_conflict` only
when it could check: Prolog compares only requirements with logic links. When
the intent is unmodeled or a related current requirement is prose only, the
outcome is `unresolved` with `reasons` and up to five `reviewCandidates`. Never
read `unresolved` as consistent. Compare the intent with each candidate's
`statement`, then compile again with `conflictReviews`
(`{requirementId, verdict: "conflict" | "no_conflict", note}`). On a conflict
the plan is `blocked`: ask the human which rule holds (a firm requirement is
theirs), then supersede or change it, or change the intent (see
`kibi-decisions`).

## Semantic and proof guardrails

Prolog proves only encoded facts. Keep ambiguity, ontology gaps, incomplete
grounding, stale snapshots, and failed or unavailable evidence explicit. Use
`fact_kind: subject` plus `property_value`/`predicate` lanes for contradiction-
safe normative claims; use `observation` or `meta` for bug/workaround notes and
`flag` only for actual runtime/config gates. Requirements require scenarios,
tests, symbol ownership, and fresh proof-bearing receipts before claiming proof.
For an existing product KB that needs semantic backfill, read
`resources/kb-improvement.md`, and `resources/proof.md` for the proof workflow.
Each current requirement has an evidence floor (`required_evidence`, else
`tested` when firm); certificate proof kinds (exhaustive, typecheck,
arithmetic, smt, rule, state_machine, regex, source) reach `proved` for the claims their contract names in
`proves`, and a requirement is proved only when every claim is. A rule
predicate bound with `harness_for` (scope `harness`) also counts toward
`proved`; an intent-scope binding stays `tested`. When the `evidence-floor` rule fails, follow Debugging
proof regressions in `resources/proof.md` and use `kibi proof explain`.
Load `kibi-provable-code` before writing or refactoring code that implements
a requirement, when a source read is refused for a computed name, dynamic
import, reflection or eval, or when deciding how to treat generated code.

## Symbol-first traceability

Represent implementation ownership with a `symbol` entity that has
`sourceFile`, `implements` to the requirement, and `covered_by` to the test.
Prolog `symbol-coverage` also requires the test to `validates` the requirement
(or the requirement `verified_by` the test). `covered_by` alone is not
enough. Code comments such as `// implements REQ-<area>-<behavior>` are not read
by any Kibi check; the symbol manifest is the only traceability record, so do
not add them.

Set the symbol's `title` to the behavioral member the extractor can locate in
`sourceFile`: `ClassName.methodName`, an exported function, or a class, not a
file or module name. A traceability link (`implements`, `covered_by`, …) from
a symbol whose `title` names no such member is refused by the granularity gate
when the file already has granular behavioral symbols, unless the symbol sets
`granularity_reason` to `config-artifact`, `module-level-behavior`,
`extractor-miss`, `legacy-link` or `test-suite`.

## Anti-patterns and remediation

Reject reversed relationship direction, a Bug-as-flag record without a runtime
gate, direct KB-store edits, and a generic `strict kb_upsert.properties` field.
Reject an invented reason, an `implements` link from code that only delegates,
an `umbrella` tag or rule change made to clear a review finding, and a
requirement left `closed` when its behavior is gone (`retired`).
Keep symbol payloads minimal. Never resend a payload a typed error rejected
twice; fix the rule and field the error names, or follow `nextActions`.

Kibi may now author tracked Markdown/YAML evidence transactionally. The former
statement “Kibi operation writes do not automatically stage markdown evidence”
means Kibi writes do not Git-stage it: review and commit remain ordinary Git
workflows. When `kibi check --staged` or the pre-commit hook blocks a commit,
load `kibi-commit-review`.
