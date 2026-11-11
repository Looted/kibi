---
title: 'init leaves a legacy config alone and the migration plan reads its paths'
status: active
expects: success
origin:
  kind: agent
  recorded_at: '2026-11-10T13:00:00.000Z'
id: SCEN-kibi-legacy-config-read-only
type: scenario
---
Given a workspace whose legacy .kb/config.json sets the requirements path to documentation/requirements, when the packed CLI runs kibi init --no-hooks, then it reports the legacy config, leaves it in place and writes no .kb/manifest.json; and kibi migrate --dry-run exits 0 with a plan that names documentation/requirements.

This is the success side of the legacy config rule. documentation/tests/e2e/packed/init-sync-check.test.ts, in its legacy config case, exercises it.
