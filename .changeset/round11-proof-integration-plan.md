---
"kibi-cli": minor
"kibi-mcp": patch
"kibi-runtime": patch
"kibi-claude": patch
"kibi-codex": patch
"kibi-cursor": patch
"kibi-zcode": patch
---

Agents can now configure proof without hand-writing `.kb/proof/integrations.json`. `kibi proof inspect --json` proposes a command integration for the detected test runner and returns a reviewed, hash-bound plan that `kb_apply_plan` (or `kibi apply-plan`) applies; `kibi prove` then runs it. Proof errors no longer point at a bootstrap step that never wrote the file.

`kibi proof inspect` adds `proposedIntegration`, `contractDefaults`, `integrationPlan` (`kibi.migration-plan.v2` with one `proof_integration_configure` action) and `integrationPlanReason`, and a new `--update <id>` option plans adding or replacing one named integration. The migration applier gains a `proof_integration_configure` executor: it refuses a create once the file exists, refuses an update when the file's hash changed, refuses either when `package.json`, a lockfile or a runner config changed since planning, and validates the result against `kibi.proof-integration.v1` before an atomic write. The `No proof integration configuration` and `integration … is not configured` messages, the `kibi-usage` proof resource and the `kibi-bootstrap` skill (3.11.0, new step 11 proof-integration item) name this route.
