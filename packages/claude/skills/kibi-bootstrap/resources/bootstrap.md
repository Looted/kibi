# Bootstrap resource

`kb_plan_bootstrap` is read-only and returns `kibi.bootstrap-plan.v1`. Declared
`knowledgeSources` and cited `intentClaims` are part of `declaredContext` and
therefore of the plan hash; a candidate built from a claim has `sourceKind:
intent_claim` and evidence rows `intent_claim:<sourceId>:<reference>`,
`knowledge_source:<kind>:<locator>`, and `source_authority:<authority>`. Its
requirement keeps the citation as `text_ref: <sourceId>:<reference>`. Review
candidate evidence, exact actions, dependencies, expected snapshots, source
hashes, bounded questions, diagnostics, and the canonical `planHash` before
approving. A preview does not authorize source edits. After approval, pass the
unchanged returned `structuredContent.plan` to `kb_apply_plan` once with its
approved hash; inspect its typed result
and follow `nextActions` if it returns `committed_with_repairs`. Direct
`kb_upsert` is forbidden for every bootstrap task; never manually replay the
plan through it.
