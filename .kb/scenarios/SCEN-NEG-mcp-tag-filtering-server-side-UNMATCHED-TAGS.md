---
title: A tag-filtered kb_query returns entities matching any requested tag and excludes the rest
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T22:00:04.878Z'
id: SCEN-NEG-mcp-tag-filtering-server-side-UNMATCHED-TAGS
type: scenario
---
Given synced scenarios tagged alt, parity and unrelated, plus one with no tags, when the packed kibi-mcp server answers kb_query for scenarios with tags parity and alt, then exactly the alt and parity scenarios are returned and the unrelated and untagged ones are excluded.

This is the failure side of any-of tag matching: an entity with none of the requested tags must not be returned. documentation/tests/e2e/packed/mcp-cli-operation-parity.test.ts "excludes an entity that carries none of the requested tags from a tag-filtered kb_query" exercises it.
