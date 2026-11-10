---
title: kb_check names both copies of a symbol a line merge declared twice and passes once one remains
status: active
origin:
  kind: agent
  recorded_at: '2026-11-05T11:47:35.170Z'
id: SCEN-kibi-duplicate-entity-declarations
type: scenario
---
Steps:

1. In a Kibi repository, commit a `.kb/symbols.yaml` that declares one symbol id twice with different titles and links, the shape a line-based merge of two branches leaves behind, and run `kibi sync`.
2. Run `kibi check`: it exits non-zero with one `source-relationship-parity` violation for that id. The description names both titles and `.kb/symbols.yaml`; the evidence has direction `duplicate_entity` and lists both declarations; the suggestion says how to keep one declaration and to run `kibi sync` again.
3. Keep one record with both links, run `kibi sync` and `kibi check` again: the duplicate finding is gone.
4. When the copies differ only in their links, a `kb_upsert` of the symbol with its title and status leaves one record carrying both links, and the finding is gone.