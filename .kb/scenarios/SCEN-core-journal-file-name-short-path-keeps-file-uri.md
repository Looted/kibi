---
title: A store whose encoded name fits keeps its file URI
status: active
expects: success
priority: should
tags:
  - core
  - persistence
origin:
  kind: agent
  recorded_at: '2026-11-17T06:00:21.889Z'
id: SCEN-core-journal-file-name-short-path-keeps-file-uri
type: scenario
---
Given a branch store directory whose file:// URI percent-encodes to at most 247 bytes (255 less the `.trp.new` suffix), when Kibi picks its graph URI, then it is the file:// URI; one byte more and it is the urn:kibi:store:<sha1> URI. ASCII letters, digits and `_` count one byte, a newline six and any other character three.