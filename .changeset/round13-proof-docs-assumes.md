---
"kibi-cli": minor
"kibi-runtime": patch
"kibi-claude": patch
"kibi-codex": patch
"kibi-cursor": patch
"kibi-zcode": patch
---

The kibi-usage skill (2.14.0) now says plainly what moves `proofProven`: only an end-to-end test (by its `verification_scope`) with a fresh passing receipt; unit receipts are recorded but leave the `missing_passing_e2e` gap. Its second-agent recipes now create scenarios with `assumes` links to the facts they rely on, so a new or superseding requirement no longer leaves a "Scenario expects success but assumes nothing" warning. `kibi proof inspect` shows the command each configured integration runs.

Technical summary: kibi-usage `resources/proof.md` gains a "What counts toward proofProven" section (scope source, unit/integration receipts, the component-scope UI exception, `coverage_depth` following authored status); recipes 1 and 2 of "Second-agent edits" add `assumes` (sent in the scenario's own write) and `expects` only with `assumes`, and re-pointing or closing the old scenario. `kibi proof inspect --json` adds `currentIntegrations: [{ id, producer, command }]` beside the compatible `currentIntegration`, and the text output lists each integration's command. Host skill copies are regenerated.
