---
"kibi-cli": patch
"kibi-runtime": patch
---

`kibi proof inspect --update <id>` now says "To add integration '<id>'" when the integrations file does not have that id yet, instead of claiming it would replace an integration that does not exist. An existing id still reads "To replace integration '<id>'".

Technical summary: `inspectProofEnvironment` picks the verb from `currentIntegrations` and uses the trimmed `--update` id, matching the create-or-update choice `buildProofIntegrationPlan` already makes.
