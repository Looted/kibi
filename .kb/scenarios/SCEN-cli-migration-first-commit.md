---
title: The first commit after kibi migrate on a legacy KB passes both pre-commit gates unless it changes something else
status: active
expects: success
tags:
  - migration
  - staged
  - coordinates
origin:
  kind: agent
  recorded_at: '2026-10-14T08:46:51.988Z'
id: SCEN-cli-migration-first-commit
type: scenario
---
Given a repository whose committed KB uses the legacy layout, when a contributor runs `kibi migrate --yes`, `kibi init` and `kibi sync` and stages the result, then the pre-commit hook passes: the generated coordinates are already current, and symbols that only the migration touched are not judged as changed by the commit. If the same commit also adds an uncovered symbol or edits a migrated symbol's links, the hook reports that symbol.

The scenario ties REQ-cli-migration-first-commit to what a contributor sees on the first commit after onboarding an existing KB. Before the change, that commit always failed: first on generated manifest drift that migrate itself caused, then on symbol-coverage findings for records whose only change was the legacy-link mark migrate added.
