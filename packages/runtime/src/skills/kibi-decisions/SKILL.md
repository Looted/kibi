---
id: kibi-decisions
name: kibi-decisions
description: "Use when the person states a rule or decision (must, never, always, from now on, we decided), when a Kibi hook asks to confirm or warns about an edit to code that implements a firm requirement, when the Stop hook says source files changed but nothing was recorded, when kb_check quotes requirement_statement_unverified, or when a request conflicts with a recorded requirement or ADR. Covers reading firmness and origin, recording a person's rule as firm with origin.ref, superseding with a Why this changed section, the kb_compile_intent unresolved/reviewCandidates/conflictReviews loop, asking before overriding a firm rule, and putting decisions to the person as one numbered kibi signoff --questions view."
version: 1.4.0
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

## Decide

- **Request conflicts with a recorded rule (any firmness):** name the rule (id
  and what it requires) and ask whether to change it. Do not implement the
  request and do not supersede the rule until the person says to change that
  rule.
- **Edit confirmation declined, or nobody could answer:** the requirement
  stands. Say which rule blocked it and ask how to proceed; never reach the
  same change another way (another tool, a shell write, another file).
- **Edit confirmation allowed:** if the change still keeps the rule, carry on.
  If it changes what the rule says, update the rule in this same change, citing
  the person's words. Clicking allow is not a stated rule: when their request
  did not state the new behavior, ask them to say it before rewriting the rule.
- **The person states a new rule:** record it with `kb_upsert` as part of the
  change, not after: a requirement with `firmness: firm`, `origin.ref`
  quoting their words and where they said them, a sectioned `document.body`,
  a scenario, and an `implements` link from the code that enforces it. Use
  `kb_compile_intent` first when the rule may touch several requirements.
  A firm rule needs `tested` evidence by default, so `kb_check`'s
  `evidence-floor` rule fails on it until an end-to-end test proves its
  scenario. When the change includes that test, give it a proof contract and
  run `kibi prove`. Otherwise set `required_evidence: asserted`, say in the
  body that no end-to-end test proves the rule yet, and report it as
  asserted, not tested. Kibi's bootstrap and migration give an untested firm
  rule the same floor. When the rule is a claim a certificate kind checks
  (allowed values, transitions, a pattern, a rule over roles, a config,
  route or schema read), a certificate test proves it instead: see
  Certificate proof kinds in kibi-usage `resources/proof.md`.
- **The person changes a rule:** supersede it (new requirement linked
  `supersedes` new -> old, `firmness: firm` when the old one was firm, a
  `## Why this changed` section of at least 12 words naming their instruction
  and answering the old reasoning, old one `status: closed` in the same
  change). For a wording correction they asked for in place, update it with a
  new `origin.ref` to those words instead.
- **You only prefer another approach:** a preference is not evidence. Propose
  it; do not supersede.

## Put decisions to the person in one view

Whenever you ask the person to confirm rules (a stated rule to record as
firm, a change to a recorded rule, a conflict with one), render every open
question as one numbered view instead of scattering them through the chat:

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
mark your own picks `default` and guesses `exploratory`. Payload shapes,
refusal messages and the `kb_compile_intent` review loop are in
`resources/decision-records.md`.

## Typed results

Parse `kibiProtocol`, `status`, diagnostics and typed `nextActions`. A
refused write (`Entity validation failed: <ID> is a firm decision ...`)
wrote nothing: do not retry it with the same payload; ask, then supersede or
cite new words. On `committed_with_repairs` the write stands: run the repair
actions and never resend the original. Kibi authors tracked files but never
Git-stages or commits them.

Validation is not completion. When a request conflicts with a recorded rule and you stop to ask, first kb_query that rule by id. Then make the conflict itself the verdict of your final answer: name the rule's id and what it requires, keep the answer format the request asked for (including any verdict field), and add your question after that. Asking the person, or showing a questions view, never takes the place of that verdict. When you record a stated rule or apply a kb_compile_intent plan, keep the actual target ids and the intended edges. Discover and kb_query each target, check each payload with kb_upsert and dryRun: true, then send that same payload as the real kb_upsert. Read the result back by exact id before kb_check. A dry run or kb_model output only validates; it records nothing. A stated rule is recorded only once the requirement, its scenario and the enforcing symbol's implements link have actually been written, followed by kb_check. Separate payloads may need several writes in sequence. Never resend a write that already committed, and handle refusals or repairs as the typed-result rules above say. After you apply a plan, make sure the new requirement is firm, with origin.ref quoting the person's words. A must-priority requirement also needs a scenario through specified_by. Leave compatible recorded rules unchanged. Rerun kb_check after each fix until it reports nothing about the new requirement, and only then report the work as done.

## Report

End with `kb_check` (and `kb_status` when freshness matters) and say:

- which rules you followed, asked about, recorded or changed (ids, firmness,
  evidence level);
- under "Decisions I changed", each supersede and its evidence;
- the open question, if a conflict is waiting on the person;
- or, when the session made no decision, one line saying so.
