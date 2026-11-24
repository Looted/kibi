---
title: A pull-request dry run restores a matching SWI-Prolog archive and publish builds from source
status: active
tags:
  - prolog
  - release
  - cache
text_ref: .github/workflows/release-pack.yml
origin:
  kind: agent
  recorded_at: '2026-11-24T15:07:11.360Z'
id: SCEN-prolog-release-pack-pr-archive-cache
type: scenario
---
Given a pull request to develop that runs the release dry run, when the SWI-Prolog archive cache key matches, then that platform restores its archive and the commit and run binding is dropped only because cache-status says hit. When the key misses, that platform builds from source and keeps the binding. A publish run, a dry-run push and a manual dry run build every archive from source and do not restore a cache, and publish never drops the run binding.

## Context
This is the behavior the user asked for on 2026-11-24: pull-request runs of release-pack reuse cached SWI-Prolog archives, and a version or config change misses the cache. Publish and the other release runs still build from source.
