# Bootstrap resource

`kb_plan_bootstrap` is read-only and returns `kibi.bootstrap-plan.v1`. Declared
`knowledgeSources` and cited `intentClaims` are part of `declaredContext` and
therefore of the plan hash; a candidate built from a claim has `sourceKind:
intent_claim` and evidence rows `intent_claim:<sourceId>:<reference>`,
`knowledge_source:<kind>:<locator>`, and `source_authority:<authority>`. Its
requirement keeps the citation as `text_ref: <sourceId>:<reference>` and its
body persists the claim: the statement, then a `## Source` section with the
blockquoted verbatim `excerpt`, the knowledge source title and the reference.
`excerpt` is required for `intent` and `observation` claims; quote the source,
never paraphrase or invent it. Review
candidate evidence, exact actions, dependencies, expected snapshots, source
hashes, bounded questions, diagnostics, and the canonical `planHash` before
approving. A preview does not authorize source edits. After approval, pass the
unchanged returned `structuredContent.plan` to `kb_apply_plan` once with its
approved hash; inspect its typed result
and follow `nextActions` if it returns `committed_with_repairs`. Direct
`kb_upsert` is forbidden for every bootstrap task; never manually replay the
plan through it. That rule covers the plan's own writes. After apply and
close-out, the deepen step hands unplanned claims (`invalid_write`,
`sourceOnlySignals`), scenarios and predicates to the normal `kibi-usage`
workflow, where `kb_model` and `kb_upsert` are the expected tools.

`BOOTSTRAP_PLAN_INVALID` fails before bootstrap writes or a new journal; request
a corrected plan. `BOOTSTRAP_PLAN_REJECTED` reports a deterministic failure and
may include earlier committed `data.actionResults`. Re-plan from the current
state; its terminal journal cannot recover. Review candidate suppressions and
cited authoring follow-ups, including any `over_limit` entries, before approval.
