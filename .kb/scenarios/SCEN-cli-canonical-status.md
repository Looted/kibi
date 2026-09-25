---
title: Status freshness tracks canonical .kb knowledge lanes
status: active
id: SCEN-cli-canonical-status
type: scenario
links:
  - type: verified_by
    target: TEST-e2e-status-freshness
  - type: verified_by
    target: TEST-cli-sync-discovery-readme-ignore
---
GIVEN a synced workspace whose requirements live under `.kb/requirements/`
WHEN an agent edits, adds, or deletes a canonical knowledge-lane markdown file without running sync
THEN `kibi status` reports dirty and stale.

GIVEN leftover `documentation/` notes without entity frontmatter or e2e README files
THEN status stays fresh after syncing canonical `.kb/` knowledge.
