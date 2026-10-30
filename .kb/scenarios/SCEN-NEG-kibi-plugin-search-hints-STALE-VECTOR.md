---
title: A cached vector for changed, foreign or damaged content is refused and rebuilt
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-30T08:42:57.961Z'
id: SCEN-NEG-kibi-plugin-search-hints-STALE-VECTOR
type: scenario
---
Given a search hints cache that holds a vector for an entity whose content hash changed, or a cache file written for another model or damaged on disk, when the plugin ranks entities, then it refuses the cached vector and embeds the entity again.

This is the failure side of the vector cache: a stale vector must never rank an entity. packages/plugin-search-hints/tests/plugin.test.ts "the cache reuses unchanged vectors and rebuilds changed, foreign or damaged ones" exercises it.
