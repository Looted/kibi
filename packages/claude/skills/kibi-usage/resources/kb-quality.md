# KB Quality: Cleanup, Splits, Ownership and Reasons

Use this resource when the task is to raise the quality of an existing
knowledge base: clearing `kb_check` review findings, splitting broad
requirements, narrowing `implements` links, writing missing context, retiring
dead knowledge, or auditing a KB someone calls finished. Adding typed facts to
prose requirements is a different job: see `resources/kb-improvement.md`.

Every step goes through Kibi operations (`kb_upsert`, `kb_delete`,
`kb_apply_plan`, `kibi migrate`, `kibi prove`). Do not read or edit `.kb/`.

## What the bar is

A clean unfiltered `kb_check` (no `violations`, no `qualityDiagnostics`) is
necessary and not sufficient. A KB a later agent can trust also has:

- one behavior per current requirement, or a real umbrella over children;
- `implements` only from the code that decides each behavior;
- a reason on every current requirement that traces to a person or to cited
  history, with inferred reasons labelled;
- context that names the current owner, never a closed parent;
- approval by a person on every agent-written current requirement;
- `retired` on requirements whose behavior is gone, and nothing active owned
  only by retired or closed requirements;
- evidence that is fresh after the last change, not pending re-proof.

## Order of work

1. **Bring Kibi up to date first** (`kibi migrate`, then `kibi sync`). Review
   rules change between releases; cleaning up on an old version fixes
   findings that no longer exist.
2. **Baseline.** Save the unfiltered `kb_check` result and count findings by
   rule. Record `kb_coverage` evidence levels and how many current
   requirements are agent-written without `approved_by`. Report progress
   against these numbers.
3. **Ask what only the person can decide**, in one list with a
   recommendation each: agent-written requirements to approve, requirements
   to retire, symbols with no live owner (dead code, or live code that needs a
   requirement), any rule exception. Use `kibi signoff --questions`
   (`kibi-decisions`).
4. **Split** broad requirements (below), about ten per approval round.
5. **Narrow ownership** (below).
6. **Reasons and context** (below).
7. **Hygiene** (below).
8. **Evidence.** `kibi sync`, then `kibi prove` what went stale, then the
   unfiltered `kb_check` and `kb_coverage`. Do not edit tracked files while
   `kibi prove` runs.
9. **Independent review** against the questions at the end, by an agent or
   person who did not do the cleanup.

You may restructure freely (split, relink, archive, write sourced context).
You may not invent a reason, approve a requirement, edit a firm statement, or
change a check rule to reach zero without the person's words for that item.

## Split a broad requirement by behavior

1. `kb_query` the requirement with `includeBody: true`, and `kb_graph` from it
   to list its symbols, scenarios, tests, facts and dependents.
2. Group its clauses by what one test observes together. A per-sentence split
   is wrong; so is one child per file. A set of states or statuses stays one
   requirement.
3. For each group, read the code and name the deciding functions. More than
   eight deciding functions for one child usually means two behaviors. Fewer
   is normal: do not pad a child to the limit or trim it to the limit.
4. Write the proposal for the person: parent, each child's statement, owner
   functions, scenarios and tests. Keep parent sentences verbatim where they
   fit and mark every new or reworded sentence as new. Wait for their reply.
5. Apply one parent at a time, endpoints first: facts for reworded claims,
   scenarios, then each child requirement (sectioned `document.body`, its
   grounding links, `specified_by`, `supersedes` to the parent, `origin.ref`
   quoting the approval, a `## Why this changed` section of at least 12 words,
   the subjects its claims are about, and no `required_evidence` or
   `approved_by` copied from the parent), then move each `implements` link to
   the child whose behavior that function decides, remove the symbol entries
   of wrappers that decide nothing, then set the parent `status: closed`.
6. Run the unfiltered `kb_check` before the next parent.

What the write path and checks expect:

- A closed parent keeps its own grounding links (`constrains`,
  `requires_*`); its stored claims still need them. Children link the same
  facts for verbatim sentences. A reworded claim has a new claim key, so it
  needs a new fact: do not re-key the parent's fact.
- A parent that reads as firm (explicit, or no `firmness` and not
  agent-written) needs firm children, each with `origin.ref` quoting the
  person's approval of the split, or `kb_check` reports
  `decision-firm-superseded`.
- Each child needs a `## Why this changed` section that says why the behavior
  exists, not only that a split happened.
- Each child inherits the parent's evidence floor. At `tested` it needs its
  own rejection scenario and a passing end-to-end test for every scenario,
  its moved symbols `covered_by` that test, and a fresh `kibi prove` receipt.
  Until then report the child as below its floor; never lower
  `required_evidence` to hide it.
- A child that `constrains` a subject none of its facts name is reported:
  drop that link.
- To keep a parent as an umbrella, tag it `umbrella`, link children to it with
  `depends_on`, and move the code that decides one part to that part's
  child; the umbrella keeps only code that decides the feature as a whole.
  Keep a parent only when it is a real feature-level rule. A current umbrella cannot
  ground the same facts as its children (`domain-redundancy`); when the
  children reuse the parent's facts, supersede and close the parent instead.
- After the split, re-point every Context that still names the parent as the
  owner (search the parent's id), and remove `relates_to` links from current
  requirements to the closed parent unless they say something.

## Narrow ownership

For each `multi_requirement_symbol_review` finding and each requirement near
the symbol threshold:

- Keep `implements` from a symbol only to the requirement whose behavior that
  function decides. Ask: if this rule changed, would this function's body
  change?
- Remove the link from wrappers that only delegate, adapters that forward to
  shared code, and helpers that decide nothing (`kb_delete` of the
  relationship; `dryRun: true` previews it). A symbol left with no
  `implements` fails `symbol-traceability`, so remove its manifest entry too
  (`kb_delete` by id, then apply the returned plan) unless it implements
  another requirement.
- A moved symbol must be `covered_by` a test that verifies its new owner, or
  the evidence floor reports `missing_production_symbol_coverage`.
- `coarse_anchor_only_review` means only whole-file anchors implement the
  requirement: link the deciding function instead (export it when the
  extractor cannot see it) rather than adding `granularity_reason`.
- Keep a list of every move (symbol, old owners, new owner, file) and of every
  production file that ends with no linked symbol, each with the reason (dead
  code, or code that decides nothing). A file that lost its links by accident
  is a defect the check will not show.

## Reasons and context

- For each requirement without a reason, and each entity tagged
  `review:context-missing`, look for the source: the commit or pull request
  that created it, an issue, a design document, an ADR. Write the reason from
  that source and name the source in the section.
- Group proposals by origin (one pull request's entities together) and ask
  the person to approve the batch. Record their reply in `origin.ref`.
- When history is silent, do not fill the gap. Either write "Reason not
  stated" with who asked and where, or propose a separate, clearly labelled
  batch of inferred reasons, each saying what it was inferred from. After
  approval the text still says it was inferred.
- Context that only restates the statement, or is shorter than two
  sentences, tells the next agent nothing: say who needs the behavior and
  what breaks without it.
- A test's receipt binds its document: after writing context into a test
  body, re-prove that test.

## Hygiene

- A requirement whose behavior no longer exists is `status: retired` with a
  `retired_reason`, not `closed` (see Second-agent edits, recipe 3). `closed`
  still governs search and hooks.
- Relink or archive (`status: deprecated`) every active fact, scenario and
  test owned only by closed or retired requirements, and every property or
  subject fact nothing links to. Checks skip what closed requirements own, so
  stale facts there keep ranking in search with wrong values.
- Look for the same constant stated in two current requirements, sentences
  inside one requirement that contradict each other, and a statement that
  names a version or value the code has moved past.

## Signs the result was fitted to the check

Report these with numbers instead of calling the KB clean:

- many requirements with exactly the threshold number of implementing symbols
  and none above it;
- a small number of `umbrella` requirements holding a large share of all
  `implements` links;
- production files that lost every link during the cleanup with no recorded
  reason;
- a rule relaxed, an exemption added or `required_evidence` lowered in the
  same change that reached zero;
- a large share of requirements whose only content is a pinned constant, or
  of tests that only prove a constant equals itself;
- most requirements `pending_reproof` after the final write.

## Review questions zero findings does not answer

Answer each with a number.

1. Findings: violations and quality diagnostics by rule.
2. Evidence: requirements at their floor, pending re-proof, stale receipts.
3. Approval: current requirements by `origin.kind`; agent-written ones without
   `approved_by`.
4. Reasons: current requirements without one; context under about twenty
   words or restating the statement; context naming a closed requirement as
   the owner; reasons with no named source.
5. Ownership: implementing symbols per requirement (look for a pile-up at the
   threshold); symbols implementing more than two; unlinked production files.
6. Retrieval: for a sample of production files, does `kb_query({sourceFile})`
   return only current, correct requirements? For a few plain questions, does
   `kb_search` put the right requirement first, and is a retired one ever
   listed as governing?
7. Hygiene: active facts owned only by closed or retired requirements;
   unlinked facts; closed requirements with no successor whose behavior is
   gone.
