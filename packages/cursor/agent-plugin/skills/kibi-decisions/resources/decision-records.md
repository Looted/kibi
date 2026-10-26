# Decision records

Reference for `kibi-decisions`: what the hooks say, the payloads that record
or change a rule, what Kibi refuses, and the `kb_compile_intent` review loop.

## What the hooks say

| Hook | Text you see | What it means |
| --- | --- | --- |
| Prompt submit | `Kibi: this request reads as a rule or decision (it says "<phrase>").` | The phrase matched words such as "must", "never", "always", "from now on", "has to". It only asks whether there is something to record; check with `kb_search`. |
| Before an edit (Claude Code) | A permission prompt: `Kibi: this edit changes <symbol>, which implements a firm requirement recorded in the knowledge base: <ID>: <title>. Allow it if ...` | The person decides. You are also told: if the edit was declined or could not be confirmed, the requirement stands; if allowed and the change alters what the requirement says, update the requirement with `kb_upsert` in this change. |
| Before an edit (Codex, Cursor, ZCode) | `Kibi: this edit changes <where>, which implements a firm requirement, a rule the person set: ...` | The host cannot prompt the person, so you must: unless the edit keeps the rule, ask before making it and name the rule. |
| Stop | `Kibi: this session changed source files and recorded nothing in the knowledge base.` (or the variant naming a rule-like request) | Record the decision the person stated or the change made (a rule, a limit, a default, who may do what) as a requirement linked to its code, or say in one line that there was none. Asked once per session. |

The firm-edit prompt covers current requirements whose effective firmness is
`firm` and that the edited symbol (or, for a whole-file write, any symbol of
the file) implements. Superseded and retired requirements never ask. An
operator can turn the prompt off with `KIBI_CONFIRM_FIRM_EDITS=0`; that does
not make a firm rule negotiable.

`kb_check` with `sourceFiles` and `includeImpactDiagnostics: true` reports
`requirement_statement_unverified` (warning) for each current requirement a
changed behavioral symbol implements, quoting its statement and firmness.
Kibi never compares code with prose: you do. A change that no longer does what
the quote says is a conflict with a recorded rule.

## Effective firmness

| `firmness` | `origin.kind` | Effective |
| --- | --- | --- |
| `firm`, `default` or `exploratory` | any | as written |
| absent | `agent` | `default` |
| absent | `human`, `import`, `migration`, or no origin | `firm` |

`kb_search` answers and `kb_query` rows show the effective value. Hook
snippets label firm decisions `[firm: ask before changing]` and exploratory
ones `[exploratory]`; an unlabeled decision is `default`.

## Record a rule the person stated

Discover first (`kb_search`, `kb_query`). If a current requirement already
says it, link to it instead of restating it. Otherwise write the scenario
first, then the requirement (the requirement's write sends `specified_by`):

```json
{"type":"req","id":"REQ-billing-refund-approval","properties":{"title":"Refunds above 500 EUR need a finance approval","status":"open","priority":"must","firmness":"firm","required_evidence":"asserted","origin":{"kind":"agent","ref":"session request: \"from now on refunds above 500 EUR must be approved by finance\""}},"relationships":[{"type":"specified_by","from":"REQ-billing-refund-approval","to":"SCEN-billing-refund-approval"}],"document":{"body":"Refunds above 500 EUR need a finance approval.\n\n## Context\n\nThe person asked for this rule while changing the refund flow; reason not stated. No end-to-end test proves it yet.\n\n## Source\n\n> from now on refunds above 500 EUR must be approved by finance\n\nSession request."}}
```

Then link the enforcing symbol with `implements` (and its test with
`covered_by`). Preview with `dryRun: true` when unsure; a passing dry run is
validation, not the write.

- `origin.ref` is where the words are and the words themselves: a ticket URL,
  a document path with line, or the session request quoted. Kibi checks that a
  reference exists, not that it is genuine, so never write words nobody said.
- `kb_upsert` records `origin.kind: agent` when you omit `origin`; the explicit
  `firmness: firm` is what makes the rule the person's. Leave
  `origin.approved_by` to the person.
- A rule from a document, test or ticket a person wrote is `firm` too, with
  `origin.ref` to that source.
- `required_evidence: asserted` keeps an untested firm rule from failing
  the `evidence-floor` check while it is recorded. Drop it (the floor goes
  back to `tested`) once an end-to-end test with a proof contract and a
  passing `kibi prove` receipt covers the rule's scenario; never set it below
  `asserted` on a firm rule.
- Your own choice is `default`; a guess is `exploratory`. Write the value
  explicitly whenever you record a decision.
- For strict modeling (claim keys, predicate facts) follow `kibi-usage`,
  "Second-agent edits", recipe 1.

## Supersede a rule

Only when the person said to change that rule (firm), or on evidence (default):

1. Write the new scenario, then the new requirement with `supersedes` to the
   old one (direction new -> old), `firmness: firm` when the old one was firm,
   `origin.ref` to the person's instruction, and a body section:

   ```markdown
   ## Why this changed

   The person asked on 2026-10-21 to raise the approval threshold to 1000 EUR
   because finance now reviews refunds weekly; the old 500 EUR limit predates
   that review.
   ```

   At least 12 words, naming the evidence and answering the old decision's
   reasoning.
2. Upsert the old requirement with `status: closed` in the same change (its
   stored `title`, the new status; status and links stay editable on a firm
   decision).
3. Re-point or close the old scenario, and move `implements` links to the new
   requirement when the code now enforces it.
4. Run `kb_check`.

A preference ("this would be cleaner") is not evidence: propose it in the
report instead of superseding. An authored requirement is never deleted:
`kb_delete` returns `outcome: supersession_required`.

## Correct a firm rule in place

When the person asks for a correction that keeps the rule's meaning (a typo, a
clearer title), update the existing requirement with a new `origin.ref` citing
their words. Without new human words, Kibi refuses to change a firm decision's
title, statement (or an ADR's body) or to lower its firmness.

## What Kibi refuses or blocks

| Where | Code or message | Fix |
| --- | --- | --- |
| `kb_upsert`, `dryRun`, `kb_apply_plan` step | `Entity validation failed: <ID> is a firm decision, so kb_upsert does not change its <fields> in place.` | Ask the person; then cite their words in `origin.ref`, or supersede with a firm decision. |
| `kb_upsert` | `firmness: firm` without `origin.ref` (or `approval_ref` on a requirement) | Add the reference to the person's words. |
| `kb_upsert` | `firmness is only valid on req and adr entities` | Remove `firmness` from facts, scenarios, tests and symbols. |
| `kb_check` | `decision-firm-unreferenced` | As above. |
| `kb_check` | `decision-firm-superseded` | The superseding decision must be `firm` too. |
| `kb_check` | `decision-firm-edited` | A firm decision's claim changed in the working tree since `HEAD` without new words; revert, or cite their words. |
| `kb_check` | `supersedes-reason-missing` | Add `## Why this changed` (12+ words). |
| `kb_check` | `superseded-requirement-open` | Close the superseded requirement. |

## The kb_compile_intent review loop

`kb_compile_intent` (`mode: "create"` or `"update"`, the complete intent,
`context` when creating) is read-only and returns a plan.

- `contradictionAnalysis.outcome`:
  - `no_conflict`: the check could decide and found none.
  - `conflict`: a witness or your own verdict says the intent contradicts a
    current requirement. The plan `status` is `blocked`.
  - `unresolved`: Kibi could not decide. `reasons` say why
    (`unmodeled_target`, `unmodeled_related`, `analysis_unavailable`). Never
    read it as consistent.
- `reviewCandidates[]`: up to five current requirements Kibi could not compare
  logically, each with `requirementId`, `title`, `sentence` (the closest
  sentence), `statement`, `score`, `modeled` and `review` (`pending`,
  `conflict` or `no_conflict`).
- Compare the intent with each candidate's `statement`, then compile again
  with the same input plus
  `conflictReviews: [{"requirementId": "...", "verdict": "conflict" | "no_conflict", "note": "..."}]`.
  A verdict may also name a requirement discovery did not rank.
- On `conflict`: ask the person which rule holds. Then supersede or change
  the requirement (as above), or change the intent, and compile again.
- Plan `status` is `ready`, `needs_resolution` (ambiguous or unmodeled
  propositions, missing targets) or `blocked`. Apply only a `ready` plan the
  person approved, with `kb_apply_plan` and its full `planHash`.
- A compiled plan records the new requirement as an agent's. When the intent
  is the person's stated rule, follow the apply with a `kb_upsert` that sets
  `firmness: firm` and `origin.ref` on that requirement.
