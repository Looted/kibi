---
id: SCEN-012
title: Markdown string links sync as generic relationships
status: active
created_at: 2026-03-20T16:20:00Z
updated_at: 2026-03-20T16:20:00Z
source: documentation/scenarios/SCEN-012.md
priority: must
tags:
  - sync
  - extractors
  - relationships
links:
  - REQ-007
---

## Scenario

Consumer documentation contains a Markdown entity whose frontmatter `links`
field uses plain string entity IDs instead of typed link objects.

### Steps

1. The repo contains a requirement with `links: [SCEN-001]` in Markdown frontmatter.
2. The target scenario file exists and is synced in the same run.
3. The developer runs `kibi sync`.
4. The synced KB stores a `relates_to` edge from the requirement to the scenario.
5. Running `kibi query req --id <id>` returns the linked scenario via `relates_to`.

### Expected Outcomes

- Plain string Markdown links are not dropped during sync.
- Plain string Markdown links remain generic and do not infer semantic edge types.
- Explicit typed links still retain their declared relationship type.
