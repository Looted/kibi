---
"kibi-core": minor
"kibi-cli": minor
"kibi-mcp": minor
"kibi-runtime": patch
"kibi-claude": patch
"kibi-codex": patch
"kibi-cursor": patch
"kibi-zcode": patch
---

A requirement a person approved now needs evidence. Until now only a firm requirement got a default evidence floor, so an agent's requirement that a person approved (`origin.approved_by`) without stating `firmness` had no floor at all: `kibi check` passed it at `asserted` or `unverified`, while the `evidence-floor` suggestion told agents that approval was what made a requirement need evidence. This is KB schema 15: run `kibi migrate --yes`.

- `evidence-floor`: with no `required_evidence` and no `firmness`, `origin.approved_by` gives a requirement the `tested` floor. Coverage rows report it with `evidenceFloor.source: approval`. An explicit `required_evidence` still wins, and an explicit `firmness: default` or `exploratory` keeps an approved requirement without a floor.
- `kibi migrate` (KB schema 15) records `required_evidence: asserted` on every current approved requirement that has no passing proof path, the same way the schema 11 upgrade did for firm requirements, so an upgraded repository passes `kibi check`. Each pin sits in the requirement's front matter: remove it once the requirement has an end-to-end proof. Requirements whose proof has passed keep the `tested` floor and are listed.
- New blocking check rule `agent-requirement-unapproved-implemented`: a current `priority: must` requirement an agent wrote (`origin.kind: agent`) that production symbols implement must be approved by a person (`origin.approved_by`) within 14 days of being written. The age comes from authored data only: `origin.recorded_at` (every `kb_upsert` write records it), else a `created_at` the requirement's front matter states. A requirement with neither counts as older. The `created_at` sync fills in for a document without one is not read, so the verdict is the same on a fresh clone, in CI and after `kibi sync --rebuild`. Have a person review it and record the approval, or fix or downgrade the requirement. The rule reads `priority` the way coverage does, so `p0-must` counts as must here too.
- `kb_upsert` writes a `created_at` passed in `properties` to the entity's front matter instead of keeping it only in the store, and `kibi sync` re-imports a document whose authored `created_at` changed (before, only `kibi sync --rebuild` picked up the edit).
- `kibi report` and `kibi check` say when a floor comes from an approval. The `kibi-usage` skill's evidence floor section describes the approval floor and the new rule.

Migration: after `kibi migrate --yes`, review the `required_evidence: asserted` pins it added. The upgrade also lists the current must requirements an agent wrote that no person approved and that are older than 14 days by `origin.recorded_at` or `created_at`, or record neither (requirements written by hand with `origin.kind: agent` and no dates, for example). From schema 15 `kibi check` fails on each of them that production code implements, so have a person review them and record `origin.approved_by`, or lower their priority. Run `kibi check` to list the implemented ones.
