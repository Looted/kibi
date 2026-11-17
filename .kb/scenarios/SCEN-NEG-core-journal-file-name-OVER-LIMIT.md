---
title: A journal name over the file name limit is caught
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-17T06:04:14.803Z'
id: SCEN-NEG-core-journal-file-name-OVER-LIMIT
type: scenario
---
Given a store directory whose file:// URI is at most 200 characters but percent-encodes to a journal name over 255 bytes, when journal_expected_graph_uri/2 keeps the file:// URI for it (as the earlier 200-character rule did), then opening the journal fails with "File name too long", SWI-Prolog aborts, and the kb_storage_lane tests in packages/core/tests/kb.plt fail: journal_graph_uri_counts_punctuation_as_three_bytes and a_journaled_store_under_a_punctuated_path_saves_and_reloads exercise it.