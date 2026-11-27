---
id: kibi-decisions
name: kibi-decisions
description: "Use when the person states a rule or decision (must, never, always, from now on, we decided), when a Kibi hook asks to confirm or warns about an edit to code that implements a firm requirement, when the Stop hook says source files changed but nothing was recorded, when kb_check quotes requirement_statement_unverified, or when a request conflicts with a recorded requirement or ADR. Covers reading firmness and origin, recording a person's rule as firm with origin.ref, superseding with a Why this changed section, the kb_compile_intent unresolved/reviewCandidates/conflictReviews loop, asking before overriding a firm rule, putting decisions to the person as one numbered kibi signoff --questions view, and getting a batch of statement changes, splits, reasons or retirements approved during a knowledge base cleanup."
version: 1.16.0
kibiCompatibility: ">=1.0.0"
tags:
  - kibi
  - decisions
  - firmness
  - source-first
  - agent-guidance
resources:
  - resources/decision-records.md
  - resources/signoff-views.md
---
## Goal

Keep the people's rules theirs. A recorded requirement or ADR says how firmly
it was decided; follow it, record new rules when they are stated, and put any
conflict with a rule to the person instead of coding around it.

## Interface Selection

Use the visible approved MCP tools or the trusted project-local CLI as equal
peer interfaces (CLI JSON: `printf '%s\n' '{"query":"..."}' | npx --no-install
kibi search --input -`). Exact routes are in
`kibi-usage/resources/operation-access.md`. If neither is available, stop and
name the missing capability. Never read or edit `.kb/` files directly.

## When this applies

- The person states a rule: "must", "never", "always", "from now on", "only
  admins may", "we decided X because Y". The prompt hook may have noted it
  ("this request reads as a rule or decision").
- A hook says an edit changes code that implements a firm requirement: Claude
  Code puts a permission prompt to the person; Codex, Cursor and ZCode tell
  you to ask first unless the edit keeps the rule.
- The Stop hook says the session changed source files and recorded nothing.
- `kb_check` reports `requirement_statement_unverified`, quoting a requirement
  the changed code implements, and the code no longer does what it says.
- `kibi check --staged` reports `firm_edit_unreviewed` or
  `firm_edit_breaks_rule`: the commit changes code of a firm requirement.
- A request contradicts a requirement or ADR you found.

## Read the rule first

1. `kb_search` the topic (or `sourceLocations` for the file you are changing),
   then `kb_query({id})` each governing requirement or ADR. Add
   `includeBody: true` to read its prose and context.
2. Read `firmness` (always shown, even when inferred) and `origin`:
   - `firm`: a person set it. Follow it; changing it is the person's call.
     A decision with no `firmness` reads as `firm` unless `origin.kind` is
     `agent`.
   - `default`: delegated or an agent's pick. Follow it; supersede it only on
     evidence (a failing test, a measured cost, a constraint it missed).
   - `exploratory`: a flagged guess; revisit it when you touch the area.
3. Compare the request with the statement. A request is not evidence against
   a rule.
4. For each subject the request is about, `kb_query
   {"factKind":"subject","subjectKey":"<key>"}` lists every current
   requirement on it, prose ones included. Read them all: one that forbids or
   restricts what the request describes is a conflict even when no check
   reports it.
5. At level `test`, when the request adds a `must` requirement, write its success scenario
   on the same subjects (`must-positive-scenario`). A `scenario-feasibility`
   refusal of that scenario names the recorded rule it conflicts with: ask
   the person which one holds.
6. When `related-requirement-unmodeled` reports a pair you cannot model,
   compare the two statements and record a `pair_reviews` verdict. An
   `interacts` verdict's `resolved_by` must name something other than the
   two requirements. On a `must` or firm requirement, or on a requirement an
   agent wrote, show the verdict to the person; set `origin.approved_by`
   only after they confirm it, and treat a conflict as a rule change to ask
   about.

## Decide

- **Request conflicts with a recorded rule (any firmness):** the request would
  make the rule's statement false, including narrowing it or adding an
  exception (touching the same code is not a conflict; when you cannot tell,
  ask). Name the rule (id and what it requires) and ask whether to change it. Do not implement the
  request and do not supersede the rule until the person says to change that
  rule.
- **Edit confirmation declined by the person:** the requirement stands. Say
  which rule blocked it and ask how to proceed; never reach the same change
  another way (another tool, a shell write, another file).
- **Nobody could answer the confirmation, or the commit gate reports
  `firm_edit_unreviewed`:** read the changed code against the rule. If it
  still does what the rule says, send
  `{"reviews": [{"requirementId", "sourceFile", "symbol", "verdict": "keeps", "note"}]}`
  for each symbol the hook or finding names, with a one-line note on why, to
  `kb_review_firm_edit` (without MCP, pipe it to
  `kibi review-firm-edit --input -`); stage the receipt under
  `.kb/firm-edit-reviews/` when you commit. A `keeps` receipt recorded after
  the Claude Code question lets the retry of that edit through in the same
  session; a later session is asked again. Record it again after a later
  edit, because a receipt stops matching once the code changes. When the
  file also has unstaged edits, add `"staged": true` to review the staged
  code. If the change breaks
  the rule, record `changes` and ask the person: the commit stays blocked
  (`firm_edit_breaks_rule`) until they agree and the rule is superseded with
  their words. A receipt is your own judgment: record it without asking
  the person to approve it; `kibi signoff` shows it as yours.
- **Edit confirmation allowed:** if the change still keeps the rule, carry on.
  If it changes what the rule says, update the rule in this same change, citing
  the person's words. Clicking allow is not a stated rule: when their request
  did not state the new behavior, ask them to say it before rewriting the rule.
- **The person states a new rule:** record it with `kb_record` (CLI:
  `kibi record --input -`) in the same turn as the change, without asking
  whether to: `statement`, `why`, `saidBy: "user"` (or `"maintainer"`),
  `quote` with their words, and the `code` that enforces it. That one call
  writes a firm requirement with their words as `origin.ref`, their reason
  as its `why`, and the `implements` links. Their words are their sign-off:
  do not ask them to confirm your statement unless it says more, less or
  something else than they said. When they said why, put their reason in
  `why`, in their words; when they gave none, write "Reason not stated" and
  never a reason of your own. Use `kb_compile_intent` (core MCP profile: CLI
  `kibi compile-intent --input -`) first when the rule may touch several
  requirements, and `kb_upsert` for anything `kb_record` does not take.
  What follows depends on the project's level (`kb_status`):
  - `remember`: the rule is recorded once the requirement and its code link
    are written and `kb_check` passes. Do not add scenarios, proof contracts
    or evidence floors, and do not ask whether to.
  - `test`: send the result's `nextActions` in order (scenario, test,
    proof). A firm rule needs `tested` evidence, so `evidence-floor` fails
    until an end-to-end test proves its scenario; the short path is
    kibi-usage `resources/proof-first.md`. When the change cannot include
    that test, set `required_evidence: asserted`, say in the body that no
    end-to-end test proves the rule yet, and report it as asserted. When
    the rule is a claim a certificate kind checks (allowed values,
    transitions, a pattern, a rule over roles, a config, route or schema
    read), a certificate test proves it instead: see Certificate proof
    kinds in kibi-usage `resources/proof.md`.
- **The person changes a rule:** supersede it (new requirement linked
  `supersedes` new -> old, `firmness: firm` when the old one was firm, a
  `## Why this changed` section of at least 12 words naming their instruction
  and answering the old reasoning, old one `status: closed` in the same
  change). For a wording correction they asked for in place, update it with a
  new `origin.ref` to those words instead. When the change moves a value the
  rule is grounded on and the rule already records a reason, the note on the
  write quotes it: ask whether it still holds, and record the person's new
  reason in their words.
- **A value change lists other requirements (`siblings`):** a `kb_upsert` of a
  value fact returns every other current requirement on that quantity, each
  as a warning and a required `nextActions` entry; `statesOldValue` marks a
  claim that still says the old value. Update a `default` or `exploratory`
  sibling in the same change, with the person's words as `origin.ref` and
  their reason, and update the tests that pin the old value. Ask the person
  before touching a `firm` sibling. When their change does not cover a
  sibling, supersede or scope the requirements so they no longer constrain
  one quantity. A fact write refused with `SEMANTIC_CONTRADICTION` names the
  requirements it would make conflict: send the fact and the change to those
  requirements together in one `kb_apply_plan`, or ask which one holds.
- **You only prefer another approach:** a preference is not evidence. Propose
  it; do not supersede.
- **A cleanup needs many decisions** (statements reworded by a split,
  requirements to retire, reasons to add, agent-written requirements to
  approve): a general request such as "clean up the knowledge base" approves
  none of them. Put the specific items to the person in batches they can
  read, new wording marked as new and each reason with its source, and
  record their reply only on the items that batch listed. See Batch
  approvals in `resources/decision-records.md`.

## What needs the person, and what does not

Needs the person: a request that conflicts with a recorded rule; a
substantial change to a firm requirement; a rule you recorded in words that
say more, less or something else than theirs; an exception or waiver; a
firm pair verdict.

Does not: recording a rule they stated (their words are the approval);
rewording that keeps a rule's sense; a `keeps` receipt (your judgment,
shown as such); a symbol record, subject, relationship, scenario or test
that `nextActions` or `kb_check` lists; running or adding tests for the
change. Do these, then report them.

When the person gives an approval, record it with the name they gave, else
the repository's configured author (`git config user.name`); never stop to
ask for a name.

## Put decisions to the person in one view

Whenever you ask the person to decide about rules (a change to a recorded
rule, a conflict with one, a rule whose recorded words go beyond theirs),
render every open question as one numbered view instead of scattering them
through the chat:

```
printf '%s\n' '{"questions":[{"title":"Refund approvals","statement":"Refunds above 500 EUR need a finance approval.","quote":"from now on refunds above 500 EUR must be approved by finance","firmness":"firm","governs":["src/refunds/approve.ts"],"question":"Record this as a firm rule?"}]}' | npx --no-install kibi signoff --questions -
```

Put the printed Markdown in your reply unchanged (or, when your replies go
through a messaging tool, in that tool's message, with
`.kb/briefs/signoff/latest.html` attached or published when it can carry a
page), then wait. In the OpenCode terminal use `--format md` so the fenced
block renders as a card. Set `id` when a question would change a recorded
requirement and `conflictsWith` to the recorded rules it conflicts with: the
view quotes their current text from the knowledge base, so never retype it.
When the person answers by number, fill each question's `answer` and render
again until none is open, then record each rule with their words in
`origin.ref`. Fields and outputs: `resources/signoff-views.md`.

Never invent words for `origin.ref`, never set `approved_by` yourself, and
mark your own picks `default` and guesses `exploratory`. Once the person has
answered, recording their answer (their name in `approved_by` or a
`*_waiver_approved_by` field, their words in `origin.ref` or `approval_ref`)
is yours to do: put it on the branch of the change it approves and push it to
that pull request, never to a separate one. Ask before you open or merge the
pull request, so the answer lands in it. Payload shapes,
refusal messages and the `kb_compile_intent` review loop are in
`resources/decision-records.md`.

## Typed results

Parse `kibiProtocol`, `status`, diagnostics and typed `nextActions`. A
refused write (`Entity validation failed: <ID> is a firm decision ...`)
wrote nothing: do not retry it with the same payload; ask, then supersede or
cite new words. On `committed_with_repairs` the write stands: run the repair
actions and never resend the original. Kibi authors tracked files but never
Git-stages or commits them.

Validation is not completion:

- When you stop to ask about a conflict, `kb_query` the rule by id and make
  the conflict the verdict of your answer: the rule's id and what it
  requires, in the answer format the request asked for, then your question.
  A questions view never replaces that verdict.
- Keep the actual target ids and intended edges of a recorded rule or an
  applied `kb_compile_intent` plan. Each write reports what it wrote and its
  `nextActions`, so no read-back is needed; a dry run, like `kb_model`
  output, records nothing. Never resend a write that already committed.
- After you apply a plan, the new requirement is firm with `origin.ref`
  quoting the person. Leave compatible recorded rules unchanged.
- Rerun `kb_check` after each fix until it reports nothing about the new
  requirement, and only then report the work as done.

## Report

End with one `kb_check` with `changed: true` (a close-out reminder after
`kb_review_firm_edit` or `kb_record` needs only that same check, not a
second one) and say:

- which rules you followed, asked about, recorded or changed (ids, firmness,
  evidence level);
- under "Decisions I changed", each supersede and its evidence;
- the open question, if a conflict is waiting on the person;
- or, when the session made no decision, one line saying so.
