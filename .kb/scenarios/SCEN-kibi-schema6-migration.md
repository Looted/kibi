---
title: A schema 5 KB migrates to schema 6 without losing grounding and a rerun changes nothing
status: active
priority: must
tags:
  - migration
  - schema-6
  - origin
  - semantic-inventory
origin:
  kind: agent
  recorded_at: '2026-10-04T02:24:53.663Z'
id: SCEN-kibi-schema6-migration
type: scenario
---
# A schema 5 KB migrates to schema 6 without losing grounding and a rerun changes nothing

Given a schema 5 KB whose requirements an upgraded semantic advisor reads differently
When `kibi sync` runs
Then it fails once, listing every requirement that failed proposition-complete ingestion and pointing at `kibi migrate`.

Given the same KB
When `kibi migrate --format json` plans the upgrade
Then it plans one automatic `entity_origin_backfill`, one automatic `semantic_inventory_rederive` per safely re-derivable requirement, a `semantic_inventory_review` with the exact `kibi model --input -` command for each unsafe one and a `review_exception_unapproved` for each exception without `approved_by`
And planning writes nothing.

Given the approved plan
When `kibi migrate --apply-safe` applies it
Then every authored entity without origin gains `origin: {kind: migration}` as its last frontmatter key with every other byte unchanged, matching claims keep their grounding, new or reclassified claims are unresolved, sync and check pass
And a second `kibi migrate` has nothing left to migrate.
