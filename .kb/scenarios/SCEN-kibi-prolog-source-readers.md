---
title: A maintainer proves pack, import, environment and call claims against what Kibi reads from Prolog sources
status: active
priority: should
tags:
  - proof
  - source
  - prolog
origin:
  kind: agent
  recorded_at: '2026-10-31T10:23:42.200Z'
id: SCEN-kibi-prolog-source-readers
type: scenario
---
Given a SWI-Prolog pack whose requirements say which packs it may require, which libraries its operators module may load, which environment variables it may read and that it never calls use_foreign_library/1, when the maintainer runs kibi prove on source tests that read pack.pl's requires/1 facts with the prolog reader and the module's imports, environment reads and calls with the references reader, then Kibi reads the terms itself without running the code and the claims are derived at evidence level proved. Once pack.pl requires another pack, a re-run rejects the requires claim with that pack.