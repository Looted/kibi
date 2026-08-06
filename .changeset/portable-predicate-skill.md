---
"kibi-cli": patch
"kibi-core": patch
"kibi-mcp": patch
"kibi-opencode": patch
"kibi-codex": patch
"kibi-cursor": patch
---

Kibi can now track whether every atomic clause in a normative requirement has a queryable logical representation. Readable prose remains intact, while stable claim keys, linked strict-property or predicate facts, and a requirement manifest expose incomplete modeling before it silently weakens contradiction detection. Exact opposite polarities over the same ground predicate now produce a contradiction.

- Remove repository-specific release and optimizer-corpus text from `kibi-usage`.
- Add portable clause-complete prose-to-ground-predicate/property guidance and examples.
- Preserve logical claim and predicate-schema fields through Markdown sync.
- Add semantic-advisor clause inventories, merged claim manifests, and the `logic-coverage` check.
- Enable manifest validation by default and report every current unmanifested requirement as explicit backfill debt.
- Detect exact `assert`/`deny` conflicts over the same ground predicate.
- Normalize trailing clause punctuation so formatting variants share one claim identity.
- Enforce a one-claim/one-ground-fact mapping and reject duplicate logical terms masquerading as separate coverage.
- Preserve every target when exact query results contain repeated relationship types.
- Keep semantic-advisor readiness partial until every normative claim has a distinct logical grounding slot.
- Drain machine-readable CLI output before the explicit process exit so large results are complete without leaving runtime handles alive.
- Preserve and enforce claim-key patterns, uniqueness, and paired provenance through MCP schema registration.
- Synchronize the corrected skill into the Codex and Cursor bundles.
