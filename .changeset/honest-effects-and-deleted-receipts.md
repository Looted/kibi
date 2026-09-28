---
"kibi-cli": patch
"kibi-mcp": patch
---

When a Kibi write is rejected, the result no longer claims it wrote to the KB or the workspace. Agents that read the `effects` list to decide whether to re-check or retry now see `failed` (with the error code) when an operation ran and stopped, and `not_applicable` when the input was rejected before anything ran. A `kb_delete` call that only returns a deletion plan now reports its writes as not applicable too, because `kb_apply_plan` performs them.

Deleting an entity file that was created but not yet staged in Git no longer breaks later syncs. Before this fix, the leftover recovery receipt made every `kibi sync` fail with "Pending source is missing" until the branch KB was recovered. Adding or removing a symbol through `kb_upsert` or a deletion plan also no longer re-wraps unrelated long titles in `.kb/symbols.yaml`, which used to leave noisy diffs that the next coordinate refresh reverted.

- cli: `toKibiResult` derives effect statuses from the envelope outcome. Error envelopes report declared effects as `failed` (carrying `error.code`) or, with `attempted: false`, as `not_applicable`; explicit `effectFailures` still take precedence. The CLI protocol marks unknown-operation and input-validation errors as not attempted, and the MCP timeout envelope inherits the same rule.
- cli: payloads can list `skippedEffects`, which the envelope reports as `not_applicable`; `kb_delete` sets it on plan-only results and its output contract declares the field.
- cli: `kb_apply_plan` retires the pending-source receipt of every source it deletes (new `retirePendingSourceReceipt`), on first apply, replay, and journal recovery alike.
- cli: authored YAML round-trips (symbol manifest, Markdown frontmatter, relationship shards) serialize with unlimited line width, matching sync and coordinate-refresh output.
