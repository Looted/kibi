---
title: 'Legacy .kb/config.json'
status: active
fact_kind: subject
subject_key: kibi.kb.legacy_config
origin:
  kind: agent
  recorded_at: '2026-11-10T13:00:00.000Z'
id: FACT-SUBJ-kibi-legacy-config-read-only
type: fact
---

The old .kb/config.json file from before the manifest-based storage layout. Kibi only detects and reads it to plan the storage migration, and malformed JSON blocks that migration instead of being replaced by guessed defaults. It is not a live configuration source.
