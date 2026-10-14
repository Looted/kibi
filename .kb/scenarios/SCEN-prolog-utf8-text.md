---
title: Non-ASCII text survives a round trip through the Prolog process under a POSIX locale
status: active
priority: must
tags:
  - prolog
  - encoding
origin:
  kind: agent
  recorded_at: '2026-10-14T20:16:33.199Z'
id: SCEN-prolog-utf8-text
type: scenario
---
Given the process locale is POSIX (`LC_ALL=C`), when Kibi sends a goal holding `§`, `¶`, `–`, Polish letters and CJK characters to its SWI-Prolog process in long-lived or one-shot mode, then the bound value comes back with the same characters and no U+FFFD, and Prolog sees one code point per character. A multi-byte character divided between two output chunks decodes whole.
