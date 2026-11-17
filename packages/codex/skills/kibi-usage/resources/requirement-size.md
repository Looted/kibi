# Requirement size and ownership

One requirement states one behavior: what one test observes together. Hooks
and `kb_query({sourceFile})` return a file's owning requirements to the next
agent, so a broad requirement or a link from code that decides nothing gives
that agent the wrong rule. Apply this whenever you write a requirement or an
`implements` link, not only during a cleanup.

- **Size.** The unfiltered `kb_check` reports `broad_requirement_review` when
  a current requirement has more than 8 implementing symbols, 6 scenarios,
  8 tests or 5 dependent requirements. Split it by behavior, never by
  sentence: clauses one test observes together stay together, and a cohesive
  vocabulary (a set of states or statuses) stays whole. Keep the parent's
  sentences verbatim where they still fit, so their claim keys and facts
  keep binding; new wording is a statement change the person approves.
  Review findings such as this one are listed in the unfiltered
  `kb_check` result's `qualityDiagnostics`, not in `violations`: zero
  violations does not mean the finding is gone. Read its `evidence` counts
  instead of counting links yourself, and never pass a finding id as a
  `rules` filter.
- **Umbrella.** Tag a requirement `umbrella` (or `epic`) only when it is a
  real feature-level rule whose parts have their own requirements linked to
  it with `depends_on`. Code that decides one part implements that part's
  requirement; the umbrella keeps only code that decides the feature as a
  whole. Never add the tag to clear the finding.
- **Owner.** `implements` goes on the function that decides the behavior: the
  one a change to the rule would edit. A wrapper that only delegates, an
  adapter that forwards to shared code, and a helper that decides nothing do
  not implement the requirement (when the staged gate still asks for an entry
  for such a declaration, follow `kibi-commit-review`, Choosing the owner).
  Every symbol in the manifest must implement a requirement
  (`symbol-traceability`), so a symbol that decides nothing is removed, not
  left unlinked: `kb_delete` its id and apply the returned plan.
  A behavioral symbol implements at most 2
  requirements (4 for a class, component or module);
  `multi_requirement_symbol_review` reports more, and `granularity_reason`
  does not exempt it.
- **Before you add a link**, read the requirement's current fan-out
  (`kb_graph` from it, or the `evidence` counts of the review finding). If
  your link would take it past a threshold, the new code either decides a
  behavior of its own (record that requirement) or shows the requirement was
  already broad (split it, or report it). Never choose a requirement because
  it has room, and never stop at exactly the threshold by leaving out code
  that does decide the behavior.
- **Split mechanics.** List the parent's symbols, scenarios and tests with
  `kb_graph` from the parent and `kb_query` by id; never read or grep `.kb/`
  to find them. Then, in this order:
  1. Write each child: the parent's sentences for that behavior verbatim
     (read them with `kb_query` and `includeBody: true`, not from the file),
     `supersedes` to the parent, a `specified_by` scenario, a `## Context`
     quoting the person's approval, a `## Why this changed` section of at
     least 12 words (the approval, and which behaviors the parent mixed),
     and the subjects its claims are about (`kb_query` with
     `factKind: "subject"` lists the defined ones). Do not copy the parent's
     `required_evidence` or `approved_by`; quote the person's split approval
     in each child's `origin.ref`.
  2. Remove the parent's `implements` links in one `kb_delete`
     relationships call.
  3. `kb_upsert` each deciding symbol with `implements` to the one child
     whose behavior it decides.
  4. Remove each wrapper's symbol entry (`kb_delete` by id, then apply the
     returned plan).
  5. Children of one parent usually share a subject, so each pair trips
     `related-requirement-unmodeled` while its claims are unmodeled. Link
     each pair with `relates_to` and record a `pair_reviews` entry on one of
     them: verdict `no_conflict` with `separated_by` naming the behavior that
     keeps them apart, `claims` with the `{claim_key, payload_hash}` of every
     unmodeled claim of both, and `origin.kind: agent`. When neither child is
     `must` or firm, your verdict counts as written: no `approved_by` is
     needed, so do not stop to ask for one. Write one entry per pair.
  6. Set the parent `status: closed`, then run the unfiltered `kb_check` and
     fix what it reports before you finish.
- **Do not fit the check.** Zero findings is the floor, not the goal. Do not
  relax a rule, add an exemption, lower `required_evidence`, or add a
  requirement that only pins a constant ("X shall be 13") unless drift of
  that constant would be a defect a user sees; one constant is stated in one
  requirement.
- **Read the code first.** Before you write or move a statement, confirm the
  code does what the sentence says; a split child is new text even when the
  parent was right.

Split, relink, reasons and retirement recipes, the order to run them in and
the review questions that zero findings does not answer are in
`resources/kb-quality.md`.
