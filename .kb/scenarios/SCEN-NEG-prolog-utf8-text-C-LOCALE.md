---
title: Non-ASCII text survives a SWI-Prolog round trip under a non-UTF-8 locale
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T20:54:52.957Z'
id: SCEN-NEG-prolog-utf8-text-C-LOCALE
type: scenario
---
Given LC_ALL, LANG and LC_CTYPE set to C, when interactive and one-shot queries send non-ASCII text through the SWI-Prolog process, then the bound text comes back character for character, with the right length and no replacement characters.

This is the failure side of text transport: a locale that would garble non-ASCII characters is contained, so knowledge base text keeps its characters. packages/cli/tests/prolog/utf8-transport.test.ts "interactive queries keep non-ASCII characters both ways" exercises it.
